package com.store.traveltools.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.hibernate.Hibernate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.postgresql.util.PSQLException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import com.store.traveltools.AbstractIntegrationTest;

import jakarta.persistence.EntityManager;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private record CatalogIds(Long productId, Long variantId) {
    }

    // Order items only store catalog ids, but the foreign keys need real rows behind them. Raw inserts,
    // as in CartRepositoryTest, because the catalog fixture constructors are package-private.
    private CatalogIds createVariant(String sku) {
        String slug = "test-order-" + sku.toLowerCase();
        Long categoryId = jdbcTemplate.queryForObject(
                "INSERT INTO categories (name, slug, description, active) VALUES (?, ?, ?, TRUE) RETURNING id",
                Long.class, "Test Category " + sku, "category-" + slug, "Fixture.");
        Long productId = jdbcTemplate.queryForObject(
                """
                INSERT INTO products (category_id, name, slug, short_description, description, images,
                        specifications, active)
                VALUES (?, ?, ?, ?, ?, '[]'::jsonb, '{}'::jsonb, TRUE) RETURNING id
                """,
                Long.class, categoryId, "Test Product " + sku, "product-" + slug, "Short description.",
                "Full description.");
        Long variantId = jdbcTemplate.queryForObject(
                "INSERT INTO product_variants (product_id, sku, attributes, price, stock_quantity, active) "
                        + "VALUES (?, ?, '{}'::jsonb, ?, ?, TRUE) RETURNING id",
                Long.class, productId, sku, new BigDecimal("100.00"), 10);
        return new CatalogIds(productId, variantId);
    }

    private static Order newOrder() {
        return new Order("علی", "رضایی", "09121234567",
                new DeliveryAddress("خیابان آزادی، پلاک ۱۰", "تهران", "1234567890"), "زنگ نزنید");
    }

    private static OrderItem newItem(CatalogIds ids, String sku, int quantity, String unitPrice) {
        return new OrderItem(ids.productId(), ids.variantId(), "Test Product " + sku, "رنگ: سبز",
                "/images/products/" + sku + ".webp", sku, quantity, new BigDecimal(unitPrice));
    }

    // OrderRepository deliberately has no saveAndFlush; flushing through the EntityManager makes
    // constraint violations surface here rather than at the end of the test transaction.
    private Order saveAndFlush(Order order) {
        Order saved = orderRepository.save(order);
        entityManager.flush();
        return saved;
    }

    // Raw inserts for constraint tests that need values the entity API refuses to produce (an explicit
    // order number, an unknown status, non-positive quantities, negative amounts).
    private Long insertOrderRow(String orderNumber, String status, String totalPrice) {
        return jdbcTemplate.queryForObject(
                """
                INSERT INTO orders (order_number, status, first_name, last_name, phone_number, address, city,
                        postal_code, total_price)
                VALUES (?, ?, 'First', 'Last', '09120000000', 'Address', 'City', '1234567890', ?)
                RETURNING id
                """,
                Long.class, orderNumber, status, new BigDecimal(totalPrice));
    }

    private void insertItemRow(Long orderId, CatalogIds ids, int quantity, String unitPrice, String totalPrice) {
        jdbcTemplate.update(
                """
                INSERT INTO order_items (order_id, product_id, product_variant_id, product_name,
                        variant_description, sku, quantity, unit_price, total_price)
                VALUES (?, ?, ?, 'Name', '', 'SKU', ?, ?, ?)
                """,
                orderId, ids.productId(), ids.variantId(), quantity, new BigDecimal(unitPrice),
                new BigDecimal(totalPrice));
    }

    // Asserts which constraint rejected the operation, using the constraint name PostgreSQL reports as a
    // structured field of the error - not the message text - so a test can't pass because a different
    // rule happened to reject the same row.
    private static void assertViolatesConstraint(ThrowingCallable operation, String constraintName) {
        assertThatThrownBy(operation)
                .isInstanceOf(DataIntegrityViolationException.class)
                .satisfies(e -> assertThat(violatedConstraint(e)).isEqualTo(constraintName));
    }

    private static String violatedConstraint(Throwable exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof PSQLException psqlException && psqlException.getServerErrorMessage() != null) {
                return psqlException.getServerErrorMessage().getConstraint();
            }
        }
        return null;
    }

    @Test
    void savedOrder_isFoundByOrderNumberWithItemsAndAllSnapshotFields() {
        CatalogIds first = createVariant("TEST-ORDER-READ-1");
        CatalogIds second = createVariant("TEST-ORDER-READ-2");
        Order order = newOrder();
        order.addItem(newItem(first, "TEST-ORDER-READ-1", 2, "150000.00"));
        order.addItem(new OrderItem(second.productId(), second.variantId(), "Test Product TEST-ORDER-READ-2", "",
                null, "TEST-ORDER-READ-2", 1, new BigDecimal("99000.50")));
        String orderNumber = saveAndFlush(order).getOrderNumber();
        // Clear the persistence context so the lookup below really reads from the database instead of
        // returning the instance cached from the save.
        entityManager.clear();

        Order found = orderRepository.findByOrderNumber(orderNumber).orElseThrow();

        assertThat(Hibernate.isInitialized(found.getItems())).isTrue();
        assertThat(found.getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(found.getFirstName()).isEqualTo("علی");
        assertThat(found.getLastName()).isEqualTo("رضایی");
        assertThat(found.getPhoneNumber()).isEqualTo("09121234567");
        assertThat(found.getDeliveryAddress().getAddressLine()).isEqualTo("خیابان آزادی، پلاک ۱۰");
        assertThat(found.getDeliveryAddress().getCity()).isEqualTo("تهران");
        assertThat(found.getDeliveryAddress().getPostalCode()).isEqualTo("1234567890");
        assertThat(found.getNotes()).isEqualTo("زنگ نزنید");
        assertThat(found.getTotalPrice()).isEqualByComparingTo("399000.50");
        assertThat(found.getCreatedAt()).isNotNull();
        assertThat(found.getItems()).hasSize(2);

        OrderItem item = found.getItems().getFirst();
        assertThat(item.getProductId()).isEqualTo(first.productId());
        assertThat(item.getProductVariantId()).isEqualTo(first.variantId());
        assertThat(item.getProductName()).isEqualTo("Test Product TEST-ORDER-READ-1");
        assertThat(item.getVariantDescription()).isEqualTo("رنگ: سبز");
        assertThat(item.getProductImage()).isEqualTo("/images/products/TEST-ORDER-READ-1.webp");
        assertThat(item.getSku()).isEqualTo("TEST-ORDER-READ-1");
        assertThat(item.getQuantity()).isEqualTo(2);
        assertThat(item.getUnitPrice()).isEqualByComparingTo("150000.00");
        assertThat(item.getTotalPrice()).isEqualByComparingTo("300000.00");

        OrderItem withoutImage = found.getItems().get(1);
        assertThat(withoutImage.getSku()).isEqualTo("TEST-ORDER-READ-2");
        assertThat(withoutImage.getProductImage()).isNull();
    }

    @Test
    void findByOrderNumber_returnsEmptyForUnknownNumber() {
        assertThat(orderRepository.findByOrderNumber("TT-0")).isEmpty();
    }

    @Test
    void savingOrders_assignsDistinctOrderNumbersFromTheDatabaseSequence() {
        String first = saveAndFlush(newOrder()).getOrderNumber();
        String second = saveAndFlush(newOrder()).getOrderNumber();

        assertThat(first).matches("TT-\\d{6,}");
        assertThat(second).matches("TT-\\d{6,}");
        assertThat(Long.parseLong(second.substring(3))).isGreaterThan(Long.parseLong(first.substring(3)));
    }

    @Test
    void catalogChangesAfterPurchase_doNotAlterTheOrder() {
        CatalogIds ids = createVariant("TEST-ORDER-SNAPSHOT");
        Order order = newOrder();
        order.addItem(newItem(ids, "TEST-ORDER-SNAPSHOT", 2, "100.00"));
        String orderNumber = saveAndFlush(order).getOrderNumber();

        jdbcTemplate.update("UPDATE products SET name = 'Renamed', images = '[\"/new.webp\"]'::jsonb WHERE id = ?",
                ids.productId());
        jdbcTemplate.update("UPDATE product_variants SET price = 999.00, active = FALSE WHERE id = ?",
                ids.variantId());
        entityManager.clear();

        Order found = orderRepository.findByOrderNumber(orderNumber).orElseThrow();
        OrderItem item = found.getItems().getFirst();
        assertThat(item.getProductName()).isEqualTo("Test Product TEST-ORDER-SNAPSHOT");
        assertThat(item.getProductImage()).isEqualTo("/images/products/TEST-ORDER-SNAPSHOT.webp");
        assertThat(item.getUnitPrice()).isEqualByComparingTo("100.00");
        assertThat(item.getTotalPrice()).isEqualByComparingTo("200.00");
        assertThat(found.getTotalPrice()).isEqualByComparingTo("200.00");
    }

    @Test
    void savingDuplicateOrderNumber_violatesUniqueConstraint() {
        String existing = saveAndFlush(newOrder()).getOrderNumber();

        assertViolatesConstraint(() -> insertOrderRow(existing, "PENDING", "0"), "uq_orders_order_number");
    }

    @Test
    void savingUnknownStatus_violatesCheckConstraint() {
        assertViolatesConstraint(() -> insertOrderRow("TT-TEST-STATUS", "PAID", "0"), "chk_orders_status");
    }

    @Test
    void savingNegativeOrderTotal_violatesCheckConstraint() {
        assertViolatesConstraint(() -> insertOrderRow("TT-TEST-NEGATIVE", "PENDING", "-0.01"),
                "chk_orders_total_price_non_negative");
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1})
    void savingItemWithNonPositiveQuantity_violatesCheckConstraint(int quantity) {
        CatalogIds ids = createVariant("TEST-ORDER-NONPOSITIVE-" + Math.abs(quantity));
        Long orderId = saveAndFlush(newOrder()).getId();

        // Zero prices keep every other rule satisfied, so only the quantity rule can reject the row.
        assertViolatesConstraint(() -> insertItemRow(orderId, ids, quantity, "0.00", "0.00"),
                "chk_order_items_quantity_positive");
    }

    @Test
    void savingItemWithNegativeUnitPrice_violatesCheckConstraint() {
        CatalogIds ids = createVariant("TEST-ORDER-NEGATIVE-PRICE");
        Long orderId = saveAndFlush(newOrder()).getId();

        assertViolatesConstraint(() -> insertItemRow(orderId, ids, 1, "-0.01", "-0.01"),
                "chk_order_items_unit_price_non_negative");
    }

    @Test
    void savingItemWhoseTotalIsNotUnitPriceTimesQuantity_violatesCheckConstraint() {
        CatalogIds ids = createVariant("TEST-ORDER-MISMATCH");
        Long orderId = saveAndFlush(newOrder()).getId();

        assertViolatesConstraint(() -> insertItemRow(orderId, ids, 2, "100.00", "150.00"),
                "chk_order_items_total_price_matches");
    }

    @Test
    void deletingAVariantThatAnOrderReferences_violatesForeignKey() {
        CatalogIds ids = createVariant("TEST-ORDER-FK-VARIANT");
        Order order = newOrder();
        order.addItem(newItem(ids, "TEST-ORDER-FK-VARIANT", 1, "100.00"));
        saveAndFlush(order);

        assertViolatesConstraint(
                () -> jdbcTemplate.update("DELETE FROM product_variants WHERE id = ?", ids.variantId()),
                "order_items_product_variant_id_fkey");
    }

    // OrderRepository offers no delete operation; this covers the database backstop for anything that
    // bypasses it (raw SQL, a future mistake).
    @Test
    void deletingAnOrderThatHasItems_violatesForeignKey() {
        CatalogIds ids = createVariant("TEST-ORDER-FK-ORDER");
        Order order = newOrder();
        order.addItem(newItem(ids, "TEST-ORDER-FK-ORDER", 1, "100.00"));
        Long orderId = saveAndFlush(order).getId();

        assertViolatesConstraint(() -> jdbcTemplate.update("DELETE FROM orders WHERE id = ?", orderId),
                "order_items_order_id_fkey");
    }
}
