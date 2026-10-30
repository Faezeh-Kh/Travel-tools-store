package com.store.traveltools.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import com.store.traveltools.AbstractIntegrationTest;
import com.store.traveltools.cart.CartService;
import com.store.traveltools.cart.dto.AddCartItemRequest;
import com.store.traveltools.common.exception.ConflictException;
import com.store.traveltools.order.dto.OrderResponse;
import com.store.traveltools.order.dto.PlaceOrderRequest;

// Plain @SpringBootTest without a test transaction: placeOrder must really commit (or really roll back)
// for these assertions to mean anything, which a rolled-back test transaction would hide.
@SpringBootTest
class OrderCheckoutIntegrationTest extends AbstractIntegrationTest {

    private static final PlaceOrderRequest REQUEST = new PlaceOrderRequest("علی", "رضایی", "09121234567",
            "خیابان آزادی، پلاک ۱۰", "تهران", "1234567890", null);

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CartService cartService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Long createVariant(String sku, String price, int stock) {
        String slug = "checkout-" + sku.toLowerCase();
        Long categoryId = jdbcTemplate.queryForObject(
                "INSERT INTO categories (name, slug, description, active) VALUES (?, ?, ?, TRUE) RETURNING id",
                Long.class, "Category " + sku, "category-" + slug, "Fixture.");
        Long productId = jdbcTemplate.queryForObject(
                """
                INSERT INTO products (category_id, name, slug, short_description, description, images,
                        specifications, active)
                VALUES (?, ?, ?, ?, ?, '["/images/products/primary.webp"]'::jsonb, '{}'::jsonb, TRUE) RETURNING id
                """,
                Long.class, categoryId, "Product " + sku, "product-" + slug, "Short description.",
                "Full description.");
        return jdbcTemplate.queryForObject(
                "INSERT INTO product_variants (product_id, sku, attributes, price, stock_quantity, active) "
                        + "VALUES (?, ?, '{\"رنگ\": \"سبز\"}'::jsonb, ?, ?, TRUE) RETURNING id",
                Long.class, productId, sku, new BigDecimal(price), stock);
    }

    private int stockOf(Long variantId) {
        return jdbcTemplate.queryForObject("SELECT stock_quantity FROM product_variants WHERE id = ?", Integer.class,
                variantId);
    }

    private int orderItemCountForSku(String sku) {
        return jdbcTemplate.queryForObject("SELECT count(*) FROM order_items WHERE sku = ?", Integer.class, sku);
    }

    @Test
    void placeOrder_savesTheOrderReducesStockAndEmptiesTheCart() {
        Long tent = createVariant("CHECKOUT-OK-TENT", "150000.00", 5);
        Long lamp = createVariant("CHECKOUT-OK-LAMP", "20000.00", 2);
        UUID cartId = cartService.addItem(null, new AddCartItemRequest(tent, 2)).id();
        cartService.addItem(cartId, new AddCartItemRequest(lamp, 2));

        OrderResponse response = orderService.placeOrder(cartId, REQUEST);

        assertThat(response.orderNumber()).matches("TT-\\d{6,}");
        assertThat(response.totalPrice()).isEqualByComparingTo("340000.00");
        assertThat(stockOf(tent)).isEqualTo(3);
        assertThat(stockOf(lamp)).isZero();
        assertThat(cartService.getCart(cartId).items()).isEmpty();
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM carts WHERE id = ?", Integer.class, cartId))
                .as("the cart row is kept so the cookie stays valid")
                .isEqualTo(1);

        Order saved = orderRepository.findByOrderNumber(response.orderNumber()).orElseThrow();
        assertThat(saved.getItems()).extracting(OrderItem::getSku)
                .containsExactly("CHECKOUT-OK-TENT", "CHECKOUT-OK-LAMP");
        OrderItem tentItem = saved.getItems().getFirst();
        assertThat(tentItem.getProductName()).isEqualTo("Product CHECKOUT-OK-TENT");
        assertThat(tentItem.getVariantDescription()).isEqualTo("رنگ: سبز");
        assertThat(tentItem.getProductImage()).isEqualTo("/images/products/primary.webp");
        assertThat(tentItem.getUnitPrice()).isEqualByComparingTo("150000.00");
    }

    @Test
    void placeOrder_usesThePriceAtCheckoutTimeNotWhenTheItemWasAdded() {
        Long variant = createVariant("CHECKOUT-PRICE", "100.00", 5);
        UUID cartId = cartService.addItem(null, new AddCartItemRequest(variant, 1)).id();
        jdbcTemplate.update("UPDATE product_variants SET price = 120.00 WHERE id = ?", variant);

        OrderResponse response = orderService.placeOrder(cartId, REQUEST);

        assertThat(response.totalPrice()).isEqualByComparingTo("120.00");
    }

    // The first item is processed (and its stock reduced in memory) before the second one fails, so this
    // proves the whole transaction rolls back, not just that the failing item is skipped.
    @Test
    void placeOrder_rollsBackEverythingWhenAnyItemIsShortOfStock() {
        Long available = createVariant("CHECKOUT-ROLLBACK-OK", "100.00", 5);
        Long shortened = createVariant("CHECKOUT-ROLLBACK-SHORT", "100.00", 3);
        UUID cartId = cartService.addItem(null, new AddCartItemRequest(available, 2)).id();
        cartService.addItem(cartId, new AddCartItemRequest(shortened, 3));
        // Someone else bought two units after this cart was filled; the cart's own check is only advisory.
        jdbcTemplate.update("UPDATE product_variants SET stock_quantity = 1 WHERE id = ?", shortened);

        assertThatThrownBy(() -> orderService.placeOrder(cartId, REQUEST))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("CHECKOUT-ROLLBACK-SHORT");

        assertThat(stockOf(available)).isEqualTo(5);
        assertThat(stockOf(shortened)).isEqualTo(1);
        assertThat(orderItemCountForSku("CHECKOUT-ROLLBACK-OK")).isZero();
        assertThat(cartService.getCart(cartId).items()).hasSize(2);
    }

    // Unlike the test above, this one fails after rows were already written: the order and its items are
    // inserted during save(), and the stock updates are flushed at commit just before the cart items are
    // deleted. A test-only trigger makes that last delete fail, so everything written before it must be undone.
    @Test
    void placeOrder_rollsBackTheOrderAndStockWhenEmptyingTheCartFails() {
        Long variant = createVariant("CHECKOUT-LATE-FAILURE", "100.00", 5);
        UUID cartId = cartService.addItem(null, new AddCartItemRequest(variant, 2)).id();
        int ordersBefore = jdbcTemplate.queryForObject("SELECT count(*) FROM orders", Integer.class);

        // DDL takes no bind parameters; the id is a UUID this test generated, not external input.
        jdbcTemplate.execute("""
                CREATE FUNCTION test_fail_cart_item_delete() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    IF OLD.cart_id = '%s' THEN
                        RAISE EXCEPTION 'simulated failure while emptying the cart';
                    END IF;
                    RETURN OLD;
                END $$
                """.formatted(cartId));
        jdbcTemplate.execute("""
                CREATE TRIGGER test_fail_cart_item_delete BEFORE DELETE ON cart_items
                FOR EACH ROW EXECUTE FUNCTION test_fail_cart_item_delete()
                """);
        try {
            assertThatThrownBy(() -> orderService.placeOrder(cartId, REQUEST))
                    .hasStackTraceContaining("simulated failure while emptying the cart");
        } finally {
            jdbcTemplate.execute("DROP TRIGGER IF EXISTS test_fail_cart_item_delete ON cart_items");
            jdbcTemplate.execute("DROP FUNCTION IF EXISTS test_fail_cart_item_delete()");
        }

        assertThat(stockOf(variant)).isEqualTo(5);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM orders", Integer.class)).isEqualTo(ordersBefore);
        assertThat(orderItemCountForSku("CHECKOUT-LATE-FAILURE")).isZero();
        assertThat(cartService.getCart(cartId).items()).singleElement()
                .satisfies(item -> assertThat(item.quantity()).isEqualTo(2));
    }

    // Availability is re-read at checkout, after the variant lock: deactivating either the variant or its
    // product after the item entered the cart rejects the checkout and leaves stock and cart untouched.
    @ParameterizedTest(name = "deactivated {0}")
    @CsvSource(delimiter = '|', textBlock = """
            VARIANT | UPDATE product_variants SET active = FALSE WHERE id = ?
            PRODUCT | UPDATE products SET active = FALSE WHERE id = (SELECT product_id FROM product_variants WHERE id = ?)
            """)
    void placeOrder_rejectsAnItemDeactivatedAfterItWasAddedToTheCart(String deactivated, String deactivateSql) {
        Long variant = createVariant("CHECKOUT-DEACTIVATED-" + deactivated, "100.00", 5);
        UUID cartId = cartService.addItem(null, new AddCartItemRequest(variant, 1)).id();
        jdbcTemplate.update(deactivateSql, variant);

        assertThatThrownBy(() -> orderService.placeOrder(cartId, REQUEST)).isInstanceOf(ConflictException.class);

        assertThat(stockOf(variant)).isEqualTo(5);
        assertThat(cartService.getCart(cartId).items()).hasSize(1);
    }
}
