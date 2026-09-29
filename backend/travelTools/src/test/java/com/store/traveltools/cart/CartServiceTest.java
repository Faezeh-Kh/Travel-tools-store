package com.store.traveltools.cart;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.store.traveltools.cart.dto.AddCartItemRequest;
import com.store.traveltools.cart.dto.CartItemResponse;
import com.store.traveltools.cart.dto.CartResponse;
import com.store.traveltools.cart.dto.UpdateCartItemQuantityRequest;
import com.store.traveltools.common.exception.ConflictException;
import com.store.traveltools.common.exception.NotFoundException;
import com.store.traveltools.product.Product;
import com.store.traveltools.product.ProductVariant;
import com.store.traveltools.product.ProductVariantRepository;

// Cart/CartItem are constructed directly (this test shares their package) rather than mocked, so
// mutator calls like setQuantity actually take effect and can be observed afterward. ProductVariant/
// Product are mocked, since they belong to `product` and only their getters are needed here.
//
// Mutating operations resolve their cart via CartRepository.lockById (not findById) - see
// CartService.lockCartForMutation/requireCart for why. getCart (read-only) still uses findById.
@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    private CartService cartService;

    @BeforeEach
    void setUp() {
        cartService = new CartService(cartRepository, cartItemRepository, productVariantRepository);
    }

    // lenient(): this helper stubs every field a variant might need across very different call sites
    // (validation-only tests, full response-mapping tests); which fields actually get read varies per
    // test, so strict "was this stub used" checking would flag legitimate, intentionally-unused ones.
    private static ProductVariant mockVariant(Long id, String productName, String sku,
            Map<String, String> attributes, BigDecimal price, int stock, boolean productActive) {
        Product product = mock(Product.class);
        lenient().when(product.getName()).thenReturn(productName);
        lenient().when(product.isActive()).thenReturn(productActive);

        ProductVariant variant = mock(ProductVariant.class);
        lenient().when(variant.getId()).thenReturn(id);
        lenient().when(variant.getSku()).thenReturn(sku);
        lenient().when(variant.getAttributes()).thenReturn(attributes);
        lenient().when(variant.getPrice()).thenReturn(price);
        lenient().when(variant.getStockQuantity()).thenReturn(stock);
        lenient().when(variant.getProduct()).thenReturn(product);
        return variant;
    }

    private static ProductVariant mockVariant(Long id, String sku, BigDecimal price, int stock) {
        return mockVariant(id, "Test Product", sku, Map.of(), price, stock, true);
    }

    @Test
    void addItem_createsANewCartWhenNoCartIdIsGiven() {
        ProductVariant variant = mockVariant(1L, "SKU-1", new BigDecimal("100.00"), 10);
        given(productVariantRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(variant));

        UUID newCartId = UUID.randomUUID();
        Cart newCart = mock(Cart.class);
        given(newCart.getId()).willReturn(newCartId);
        given(cartRepository.save(any(Cart.class))).willReturn(newCart);
        given(cartItemRepository.findByCartIdAndProductVariantId(newCartId, 1L)).willReturn(Optional.empty());
        given(cartItemRepository.findByCartIdOrderByIdAsc(newCartId)).willReturn(List.of());

        CartResponse response = cartService.addItem(null, new AddCartItemRequest(1L, 2));

        assertThat(response.id()).isEqualTo(newCartId);
        verify(cartItemRepository).save(any(CartItem.class));
    }

    @Test
    void addItem_reusesTheExistingCartInsteadOfCreatingANewOneWhenCartIdIsGiven() {
        ProductVariant variant = mockVariant(1L, "SKU-1", new BigDecimal("100.00"), 10);
        given(productVariantRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(variant));

        UUID cartId = UUID.randomUUID();
        Cart cart = mock(Cart.class);
        given(cart.getId()).willReturn(cartId);
        given(cartRepository.lockById(cartId)).willReturn(Optional.of(cart));
        given(cartItemRepository.findByCartIdAndProductVariantId(cartId, 1L)).willReturn(Optional.empty());
        given(cartItemRepository.findByCartIdOrderByIdAsc(cartId)).willReturn(List.of());

        cartService.addItem(cartId, new AddCartItemRequest(1L, 2));

        verify(cartRepository, never()).save(any());
    }

    @Test
    void addItem_mergesQuantityIntoTheExistingLineInsteadOfDuplicatingIt() {
        ProductVariant variant = mockVariant(1L, "SKU-1", new BigDecimal("100.00"), 10);
        given(productVariantRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(variant));

        UUID cartId = UUID.randomUUID();
        Cart cart = mock(Cart.class);
        given(cart.getId()).willReturn(cartId);
        given(cartRepository.lockById(cartId)).willReturn(Optional.of(cart));

        CartItem existing = new CartItem(cart, variant, 3);
        given(cartItemRepository.findByCartIdAndProductVariantId(cartId, 1L)).willReturn(Optional.of(existing));
        given(cartItemRepository.findByCartIdOrderByIdAsc(cartId)).willReturn(List.of(existing));

        CartResponse response = cartService.addItem(cartId, new AddCartItemRequest(1L, 2));

        assertThat(existing.getQuantity()).isEqualTo(5);
        assertThat(response.items()).extracting(CartItemResponse::quantity).containsExactly(5);
        verify(cartItemRepository, never()).save(any(CartItem.class));
    }

    @Test
    void addItem_throwsConflictWhenTheMergedQuantityExceedsStock() {
        ProductVariant variant = mockVariant(1L, "SKU-1", new BigDecimal("100.00"), 10);
        given(productVariantRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(variant));

        UUID cartId = UUID.randomUUID();
        Cart cart = mock(Cart.class);
        given(cart.getId()).willReturn(cartId);
        given(cartRepository.lockById(cartId)).willReturn(Optional.of(cart));

        CartItem existing = new CartItem(cart, variant, 8);
        given(cartItemRepository.findByCartIdAndProductVariantId(cartId, 1L)).willReturn(Optional.of(existing));

        assertThatThrownBy(() -> cartService.addItem(cartId, new AddCartItemRequest(1L, 5)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("SKU-1");
        assertThat(existing.getQuantity()).isEqualTo(8);
    }

    @Test
    void addItem_throwsForNonPositiveQuantityEvenWhenNotCaughtByBeanValidation() {
        assertThatThrownBy(() -> cartService.addItem(null, new AddCartItemRequest(1L, 0)))
                .isInstanceOf(IllegalArgumentException.class);
        verify(productVariantRepository, never()).findByIdAndActiveTrue(any());
    }

    @Test
    void addItem_throwsNotFoundWhenTheVariantIsMissingOrInactive() {
        given(productVariantRepository.findByIdAndActiveTrue(99L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> cartService.addItem(null, new AddCartItemRequest(99L, 1)))
                .isInstanceOf(NotFoundException.class);
        verify(cartRepository, never()).save(any());
    }

    @Test
    void addItem_throwsNotFoundWhenTheVariantsProductIsInactive() {
        ProductVariant variant = mockVariant(1L, "Test Product", "SKU-1", Map.of(), new BigDecimal("100.00"), 10, false);
        given(productVariantRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(variant));

        assertThatThrownBy(() -> cartService.addItem(null, new AddCartItemRequest(1L, 1)))
                .isInstanceOf(NotFoundException.class);
        verify(cartRepository, never()).save(any());
    }

    @Test
    void updateItemQuantity_updatesTheQuantityAndRecomputesTotals() {
        UUID cartId = UUID.randomUUID();
        Cart cart = mock(Cart.class);
        given(cart.getId()).willReturn(cartId);
        given(cartRepository.lockById(cartId)).willReturn(Optional.of(cart));

        ProductVariant variant = mockVariant(1L, "SKU-1", new BigDecimal("100.00"), 10);
        CartItem item = new CartItem(cart, variant, 1);
        given(cartItemRepository.findByIdAndCartId(5L, cartId)).willReturn(Optional.of(item));
        given(cartItemRepository.findByCartIdOrderByIdAsc(cartId)).willReturn(List.of(item));

        CartResponse response = cartService.updateItemQuantity(cartId, 5L, new UpdateCartItemQuantityRequest(4));

        assertThat(item.getQuantity()).isEqualTo(4);
        assertThat(response.items()).extracting(CartItemResponse::totalPrice)
                .containsExactly(new BigDecimal("400.00"));
        assertThat(response.subtotal()).isEqualTo(new BigDecimal("400.00"));
    }

    @Test
    void updateItemQuantity_throwsForNonPositiveQuantityEvenWhenNotCaughtByBeanValidation() {
        assertThatThrownBy(() -> cartService.updateItemQuantity(UUID.randomUUID(), 5L,
                new UpdateCartItemQuantityRequest(-1)))
                .isInstanceOf(IllegalArgumentException.class);
        verify(cartRepository, never()).lockById(any());
    }

    @Test
    void updateItemQuantity_throwsConflictWhenTheNewQuantityExceedsStock() {
        UUID cartId = UUID.randomUUID();
        Cart cart = mock(Cart.class);
        given(cart.getId()).willReturn(cartId);
        given(cartRepository.lockById(cartId)).willReturn(Optional.of(cart));

        ProductVariant variant = mockVariant(1L, "SKU-1", new BigDecimal("100.00"), 10);
        CartItem item = new CartItem(cart, variant, 1);
        given(cartItemRepository.findByIdAndCartId(5L, cartId)).willReturn(Optional.of(item));

        assertThatThrownBy(() -> cartService.updateItemQuantity(cartId, 5L, new UpdateCartItemQuantityRequest(11)))
                .isInstanceOf(ConflictException.class);
        assertThat(item.getQuantity()).isEqualTo(1);
    }

    @Test
    void updateItemQuantity_throwsNotFoundWhenTheItemBelongsToAnotherCart() {
        UUID cartId = UUID.randomUUID();
        Cart cart = mock(Cart.class);
        given(cart.getId()).willReturn(cartId);
        given(cartRepository.lockById(cartId)).willReturn(Optional.of(cart));
        given(cartItemRepository.findByIdAndCartId(5L, cartId)).willReturn(Optional.empty());

        assertThatThrownBy(() -> cartService.updateItemQuantity(cartId, 5L, new UpdateCartItemQuantityRequest(2)))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void removeItem_deletesTheItemWhenItBelongsToTheCart() {
        UUID cartId = UUID.randomUUID();
        Cart cart = mock(Cart.class);
        given(cart.getId()).willReturn(cartId);
        given(cartRepository.lockById(cartId)).willReturn(Optional.of(cart));

        ProductVariant variant = mockVariant(1L, "SKU-1", new BigDecimal("100.00"), 10);
        CartItem item = new CartItem(cart, variant, 1);
        given(cartItemRepository.findByIdAndCartId(5L, cartId)).willReturn(Optional.of(item));
        given(cartItemRepository.findByCartIdOrderByIdAsc(cartId)).willReturn(List.of());

        CartResponse response = cartService.removeItem(cartId, 5L);

        verify(cartItemRepository).delete(item);
        assertThat(response.items()).isEmpty();
    }

    @Test
    void removeItem_throwsNotFoundWhenTheItemBelongsToAnotherCart() {
        UUID cartId = UUID.randomUUID();
        Cart cart = mock(Cart.class);
        given(cart.getId()).willReturn(cartId);
        given(cartRepository.lockById(cartId)).willReturn(Optional.of(cart));
        given(cartItemRepository.findByIdAndCartId(5L, cartId)).willReturn(Optional.empty());

        assertThatThrownBy(() -> cartService.removeItem(cartId, 5L)).isInstanceOf(NotFoundException.class);
        verify(cartItemRepository, never()).delete(any());
    }

    @Test
    void getCart_returnsAnEmptyResponseWhenNoCartIdIsGiven() {
        CartResponse response = cartService.getCart(null);

        assertThat(response).isEqualTo(new CartResponse(null, List.of(), BigDecimal.ZERO, BigDecimal.ZERO));
    }

    @Test
    void getCart_returnsAnEmptyResponseWhenTheCookieCartNoLongerExists() {
        UUID staleCartId = UUID.randomUUID();
        given(cartRepository.findById(staleCartId)).willReturn(Optional.empty());

        CartResponse response = cartService.getCart(staleCartId);

        assertThat(response).isEqualTo(new CartResponse(null, List.of(), BigDecimal.ZERO, BigDecimal.ZERO));
    }

    @Test
    void getCart_mapsEachLineAndComputesSubtotalAcrossMultipleItems() {
        UUID cartId = UUID.randomUUID();
        Cart cart = mock(Cart.class);
        given(cart.getId()).willReturn(cartId);
        given(cartRepository.findById(cartId)).willReturn(Optional.of(cart));

        ProductVariant variantA = mockVariant(
                10L, "Product A", "SKU-A", Map.of("Color", "Red"), new BigDecimal("100.00"), 10, true);
        CartItem itemA = new CartItem(cart, variantA, 2);

        ProductVariant variantB = mockVariant(
                11L, "Product B", "SKU-B", Map.of(), new BigDecimal("50.00"), 10, true);
        CartItem itemB = new CartItem(cart, variantB, 3);

        given(cartItemRepository.findByCartIdOrderByIdAsc(cartId)).willReturn(List.of(itemA, itemB));

        CartResponse response = cartService.getCart(cartId);

        assertThat(response).isEqualTo(new CartResponse(
                cartId,
                List.of(
                        new CartItemResponse(null, 10L, "Product A", "SKU-A", Map.of("Color", "Red"),
                                new BigDecimal("100.00"), 2, new BigDecimal("200.00")),
                        new CartItemResponse(null, 11L, "Product B", "SKU-B", Map.of(),
                                new BigDecimal("50.00"), 3, new BigDecimal("150.00"))),
                new BigDecimal("350.00"),
                new BigDecimal("350.00")));
    }
}
