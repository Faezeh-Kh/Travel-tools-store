package com.store.traveltools.cart;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import com.store.traveltools.AbstractIntegrationTest;
import com.store.traveltools.product.ProductVariant;
import com.store.traveltools.product.ProductVariantRepository;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class CartRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // Only the tests that actually need a ProductVariant to attach a CartItem to pay for creating one;
    // cart-only tests (e.g. savingCart_generatesDistinctIdsAndTimestamps) have no Product/Category
    // dependency at all. Each call creates its own Category/Product/ProductVariant chain via raw
    // inserts, since those fixture constructors are package-private to their own packages (see
    // ProductRepositoryTest for why this is a raw insert rather than a fixture constructor call).
    private ProductVariant createVariant(String sku) {
        String slug = "test-cart-" + sku.toLowerCase();
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
        return productVariantRepository.getReferenceById(variantId);
    }

    @Test
    void savingCart_generatesDistinctIdsAndTimestamps() {
        Cart first = cartRepository.saveAndFlush(new Cart());
        Cart second = cartRepository.saveAndFlush(new Cart());

        assertThat(first.getId()).isNotNull().isNotEqualTo(second.getId());
        assertThat(first.getCreatedAt()).isNotNull();
        assertThat(first.getUpdatedAt()).isNotNull();
    }

    @Test
    void findByCartIdOrderByIdAsc_returnsOnlyThatCartsItemsInInsertionOrder() {
        Cart cart = cartRepository.saveAndFlush(new Cart());
        Cart otherCart = cartRepository.saveAndFlush(new Cart());
        CartItem first = cartItemRepository.saveAndFlush(new CartItem(cart, createVariant("TEST-CART-ORDER-1"), 1));
        CartItem second = cartItemRepository.saveAndFlush(new CartItem(cart, createVariant("TEST-CART-ORDER-2"), 2));
        cartItemRepository.saveAndFlush(new CartItem(otherCart, createVariant("TEST-CART-ORDER-3"), 1));

        List<CartItem> items = cartItemRepository.findByCartIdOrderByIdAsc(cart.getId());

        assertThat(items).extracting(CartItem::getId).containsExactly(first.getId(), second.getId());
    }

    @Test
    void findByIdAndCartId_returnsEmptyWhenItemBelongsToADifferentCart() {
        Cart cart = cartRepository.saveAndFlush(new Cart());
        Cart otherCart = cartRepository.saveAndFlush(new Cart());
        CartItem item = cartItemRepository.saveAndFlush(new CartItem(cart, createVariant("TEST-CART-OWNER"), 1));

        Optional<CartItem> foundUnderOwnCart = cartItemRepository.findByIdAndCartId(item.getId(), cart.getId());
        Optional<CartItem> foundUnderOtherCart = cartItemRepository.findByIdAndCartId(item.getId(), otherCart.getId());

        assertThat(foundUnderOwnCart).isPresent();
        assertThat(foundUnderOtherCart).isEmpty();
    }

    @Test
    void findByCartIdAndProductVariantId_locatesTheExistingLineForMergeOnAddAndNothingElse() {
        Cart cart = cartRepository.saveAndFlush(new Cart());
        Cart otherCart = cartRepository.saveAndFlush(new Cart());
        ProductVariant variant = createVariant("TEST-CART-MERGE-1");
        ProductVariant otherVariant = createVariant("TEST-CART-MERGE-2");
        CartItem item = cartItemRepository.saveAndFlush(new CartItem(cart, variant, 1));

        assertThat(cartItemRepository.findByCartIdAndProductVariantId(cart.getId(), variant.getId())).contains(item);
        assertThat(cartItemRepository.findByCartIdAndProductVariantId(otherCart.getId(), variant.getId())).isEmpty();
        assertThat(cartItemRepository.findByCartIdAndProductVariantId(cart.getId(), otherVariant.getId())).isEmpty();
    }

    @Test
    void savingSecondItemForSameCartAndVariant_violatesUniqueConstraint() {
        Cart cart = cartRepository.saveAndFlush(new Cart());
        ProductVariant variant = createVariant("TEST-CART-DUPLICATE");
        cartItemRepository.saveAndFlush(new CartItem(cart, variant, 1));

        assertThatThrownBy(() -> cartItemRepository.saveAndFlush(new CartItem(cart, variant, 2)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1})
    void savingItemWithNonPositiveQuantity_violatesCheckConstraint(int quantity) {
        Cart cart = cartRepository.saveAndFlush(new Cart());
        ProductVariant variant = createVariant("TEST-CART-NONPOSITIVE-" + Math.abs(quantity));

        assertThatThrownBy(() -> cartItemRepository.saveAndFlush(new CartItem(cart, variant, quantity)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void updatingItemQuantity_touchesUpdatedAt() throws InterruptedException {
        Cart cart = cartRepository.saveAndFlush(new Cart());
        CartItem item = cartItemRepository.saveAndFlush(new CartItem(cart, createVariant("TEST-CART-TOUCH"), 1));
        var previousUpdatedAt = item.getUpdatedAt();
        // @UpdateTimestamp reads the JVM clock; a short sleep guarantees a measurably later value so this
        // test actually proves the timestamp changes, rather than merely being consistent with it not changing.
        Thread.sleep(10);

        item.setQuantity(3);
        CartItem updated = cartItemRepository.saveAndFlush(item);

        assertThat(updated.getQuantity()).isEqualTo(3);
        assertThat(updated.getUpdatedAt()).isAfter(previousUpdatedAt);
    }
}
