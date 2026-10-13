package com.store.traveltools.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.store.traveltools.cart.Cart;
import com.store.traveltools.cart.CartItem;
import com.store.traveltools.cart.CartItemRepository;
import com.store.traveltools.cart.CartRepository;
import com.store.traveltools.common.exception.ConflictException;
import com.store.traveltools.common.exception.NotFoundException;
import com.store.traveltools.order.dto.OrderItemResponse;
import com.store.traveltools.order.dto.OrderResponse;
import com.store.traveltools.order.dto.PlaceOrderRequest;
import com.store.traveltools.product.Product;
import com.store.traveltools.product.ProductVariant;
import com.store.traveltools.product.ProductVariantRepository;

// Cart, CartItem, Product and ProductVariant belong to other packages and are mocked; Order/OrderItem are
// real, so the order the service builds can be inspected through the response. The locking and the
// transaction itself (stock really decremented, rollback on failure, concurrent checkouts) need a real
// database and are covered by OrderCheckoutIntegrationTest and OrderConcurrencyTest.
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    private static final PlaceOrderRequest REQUEST = new PlaceOrderRequest("علی", "رضایی", "09121234567",
            "خیابان آزادی، پلاک ۱۰", "تهران", "1234567890", "زنگ نزنید");

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private CartRepository cartRepository;

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    private OrderService orderService;

    private final UUID cartId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        orderService = new OrderService(orderRepository, cartRepository, cartItemRepository, productVariantRepository);
    }

    // lenient(): helpers stub every field a variant might need; which ones a test reads varies (e.g. a
    // failing availability check never reaches the snapshot fields).
    private static ProductVariant mockVariant(Long id, String sku, Map<String, String> attributes, String price,
            int stock, boolean variantActive, boolean productActive, List<String> images) {
        Product product = mock(Product.class);
        lenient().when(product.getId()).thenReturn(id * 10);
        lenient().when(product.getName()).thenReturn("Product " + sku);
        lenient().when(product.isActive()).thenReturn(productActive);
        lenient().when(product.getImages()).thenReturn(images);

        ProductVariant variant = mock(ProductVariant.class);
        lenient().when(variant.getId()).thenReturn(id);
        lenient().when(variant.getSku()).thenReturn(sku);
        lenient().when(variant.getAttributes()).thenReturn(attributes);
        lenient().when(variant.getPrice()).thenReturn(new BigDecimal(price));
        lenient().when(variant.getStockQuantity()).thenReturn(stock);
        lenient().when(variant.isActive()).thenReturn(variantActive);
        lenient().when(variant.getProduct()).thenReturn(product);
        return variant;
    }

    private static ProductVariant mockVariant(Long id, String sku, String price, int stock) {
        return mockVariant(id, sku, Map.of(), price, stock, true, true, List.of());
    }

    private static CartItem mockCartItem(ProductVariant variant, int quantity) {
        CartItem item = mock(CartItem.class);
        lenient().when(item.getProductVariant()).thenReturn(variant);
        lenient().when(item.getQuantity()).thenReturn(quantity);
        return item;
    }

    private void givenCart(List<CartItem> items) {
        Cart cart = mock(Cart.class);
        given(cart.getId()).willReturn(cartId);
        given(cartRepository.lockById(cartId)).willReturn(Optional.of(cart));
        List<Long> variantIds = items.stream().map(item -> item.getProductVariant().getId()).toList();
        given(cartItemRepository.findProductVariantIdsByCartId(cartId)).willReturn(variantIds);
        if (!items.isEmpty()) {
            List<ProductVariant> lockedVariants = items.stream()
                    .map(CartItem::getProductVariant)
                    .sorted(Comparator.comparing(ProductVariant::getId))
                    .toList();
            given(productVariantRepository.lockAllByIdOrderById(variantIds)).willReturn(lockedVariants);
            given(cartItemRepository.findByCartIdOrderByIdAsc(cartId)).willReturn(items);
            lenient().when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        }
    }

    @Test
    void placeOrder_copiesCurrentCatalogDataAndContactDetailsIntoTheOrder() {
        Map<String, String> attributes = new LinkedHashMap<>();
        attributes.put("رنگ", "سبز");
        attributes.put("ظرفیت", "۴۰ لیتر");
        ProductVariant withOptions = mockVariant(1L, "SKU-1", attributes, "150000.00", 10, true, true,
                List.of("/images/products/SKU-1.1.webp", "/images/products/SKU-1.2.webp"));
        ProductVariant plain = mockVariant(2L, "SKU-2", "99000.50", 5);
        givenCart(List.of(mockCartItem(withOptions, 2), mockCartItem(plain, 1)));

        OrderResponse response = orderService.placeOrder(cartId, REQUEST);

        assertThat(response.status()).isEqualTo(OrderStatus.PENDING);
        assertThat(response.firstName()).isEqualTo("علی");
        assertThat(response.lastName()).isEqualTo("رضایی");
        assertThat(response.phoneNumber()).isEqualTo("09121234567");
        assertThat(response.address()).isEqualTo("خیابان آزادی، پلاک ۱۰");
        assertThat(response.city()).isEqualTo("تهران");
        assertThat(response.postalCode()).isEqualTo("1234567890");
        assertThat(response.notes()).isEqualTo("زنگ نزنید");
        assertThat(response.totalPrice()).isEqualByComparingTo("399000.50");
        assertThat(response.items()).containsExactly(
                new OrderItemResponse("Product SKU-1", "رنگ: سبز، ظرفیت: ۴۰ لیتر", "/images/products/SKU-1.1.webp",
                        "SKU-1", 2, new BigDecimal("150000.00"), new BigDecimal("300000.00")),
                new OrderItemResponse("Product SKU-2", "", null, "SKU-2", 1, new BigDecimal("99000.50"),
                        new BigDecimal("99000.50")));
    }

    @Test
    void placeOrder_storesTheProductAndVariantIdsOnEachItem() {
        ProductVariant variant = mockVariant(7L, "SKU-7", "100.00", 3);
        givenCart(List.of(mockCartItem(variant, 1)));

        orderService.placeOrder(cartId, REQUEST);

        ArgumentCaptor<Order> saved = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(saved.capture());
        OrderItem item = saved.getValue().getItems().getFirst();
        assertThat(item.getProductId()).isEqualTo(70L);
        assertThat(item.getProductVariantId()).isEqualTo(7L);
    }

    @Test
    void placeOrder_decreasesStockForEveryItemAndEmptiesTheCart() {
        ProductVariant first = mockVariant(1L, "SKU-1", "100.00", 10);
        ProductVariant second = mockVariant(2L, "SKU-2", "100.00", 3);
        List<CartItem> items = List.of(mockCartItem(first, 4), mockCartItem(second, 3));
        givenCart(items);

        orderService.placeOrder(cartId, REQUEST);

        verify(first).decreaseStock(4);
        verify(second).decreaseStock(3);
        verify(cartItemRepository).deleteAll(items);
        verify(cartRepository, never()).delete(any());
    }

    // Regression guard for the lock ordering described on placeOrder: the variants must be locked
    // before the cart items (and with them the variants) are loaded.
    @Test
    void placeOrder_locksTheCartThenTheVariantsBeforeLoadingTheCartItems() {
        ProductVariant variant = mockVariant(1L, "SKU-1", "100.00", 10);
        givenCart(List.of(mockCartItem(variant, 1)));

        orderService.placeOrder(cartId, REQUEST);

        InOrder order = inOrder(cartRepository, cartItemRepository, productVariantRepository);
        order.verify(cartRepository).lockById(cartId);
        order.verify(cartItemRepository).findProductVariantIdsByCartId(cartId);
        order.verify(productVariantRepository).lockAllByIdOrderById(List.of(1L));
        order.verify(cartItemRepository).findByCartIdOrderByIdAsc(cartId);
    }

    @Test
    void placeOrder_storesBlankNotesAsNull() {
        givenCart(List.of(mockCartItem(mockVariant(1L, "SKU-1", "100.00", 10), 1)));
        PlaceOrderRequest blankNotes = new PlaceOrderRequest("علی", "رضایی", "09121234567", "آدرس", "تهران",
                "1234567890", "   ");

        assertThat(orderService.placeOrder(cartId, blankNotes).notes()).isNull();
    }

    @Test
    void placeOrder_throwsNotFoundWithoutACartId() {
        assertThatThrownBy(() -> orderService.placeOrder(null, REQUEST)).isInstanceOf(NotFoundException.class);
        verify(orderRepository, never()).save(any());
    }

    @Test
    void placeOrder_throwsNotFoundForAnUnknownCart() {
        given(cartRepository.lockById(cartId)).willReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.placeOrder(cartId, REQUEST)).isInstanceOf(NotFoundException.class);
        verify(orderRepository, never()).save(any());
    }

    @Test
    void placeOrder_throwsConflictForAnEmptyCart() {
        givenCart(List.of());

        assertThatThrownBy(() -> orderService.placeOrder(cartId, REQUEST)).isInstanceOf(ConflictException.class);
        verify(productVariantRepository, never()).lockAllByIdOrderById(any());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void placeOrder_failsWithoutSavingWhenALockedVariantIsMissing() {
        ProductVariant first = mockVariant(1L, "SKU-1", "100.00", 10);
        // Set up by hand rather than with givenCart: the lock returns only one of the two variants, and the
        // cart items are never loaded.
        Cart cart = mock(Cart.class);
        given(cart.getId()).willReturn(cartId);
        given(cartRepository.lockById(cartId)).willReturn(Optional.of(cart));
        given(cartItemRepository.findProductVariantIdsByCartId(cartId)).willReturn(List.of(1L, 2L));
        given(productVariantRepository.lockAllByIdOrderById(List.of(1L, 2L))).willReturn(List.of(first));

        assertThatThrownBy(() -> orderService.placeOrder(cartId, REQUEST)).isInstanceOf(IllegalStateException.class);
        verify(first, never()).decreaseStock(anyInt());
        verify(orderRepository, never()).save(any());
        verify(cartItemRepository, never()).deleteAll(any());
    }

    // Only shows that nothing is saved or deleted: the earlier variant's stock is decreased in memory before
    // the short one is reached. That the database change is undone is OrderCheckoutIntegrationTest's job.
    @Test
    void placeOrder_throwsConflictWhenAnyItemIsShortOfStockAndSavesNothing() {
        ProductVariant enough = mockVariant(1L, "SKU-1", "100.00", 10);
        ProductVariant tooFew = mockVariant(2L, "SKU-2", "100.00", 2);
        givenCart(List.of(mockCartItem(enough, 1), mockCartItem(tooFew, 3)));

        assertThatThrownBy(() -> orderService.placeOrder(cartId, REQUEST))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("SKU-2");
        verify(tooFew, never()).decreaseStock(anyInt());
        verify(orderRepository, never()).save(any());
        verify(cartItemRepository, never()).deleteAll(any());
    }

    @Test
    void placeOrder_allowsBuyingExactlyTheRemainingStock() {
        ProductVariant variant = mockVariant(1L, "SKU-1", "100.00", 3);
        givenCart(List.of(mockCartItem(variant, 3)));

        orderService.placeOrder(cartId, REQUEST);

        verify(variant).decreaseStock(3);
    }

    @Test
    void placeOrder_throwsConflictForAnInactiveVariant() {
        ProductVariant inactive = mockVariant(1L, "SKU-1", Map.of(), "100.00", 10, false, true, List.of());
        givenCart(List.of(mockCartItem(inactive, 1)));

        assertThatThrownBy(() -> orderService.placeOrder(cartId, REQUEST))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("SKU-1");
        verify(orderRepository, never()).save(any());
    }

    @Test
    void placeOrder_throwsConflictWhenTheVariantsProductIsInactive() {
        ProductVariant variant = mockVariant(1L, "SKU-1", Map.of(), "100.00", 10, true, false, List.of());
        givenCart(List.of(mockCartItem(variant, 1)));

        assertThatThrownBy(() -> orderService.placeOrder(cartId, REQUEST))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("SKU-1");
        verify(orderRepository, never()).save(any());
    }

    @Test
    void describeVariant_joinsAttributesInOrderAndIsEmptyWithoutAttributes() {
        Map<String, String> attributes = new LinkedHashMap<>();
        attributes.put("رنگ", "سبز");
        attributes.put("سایز", "L");

        assertThat(OrderService.describeVariant(attributes)).isEqualTo("رنگ: سبز، سایز: L");
        assertThat(OrderService.describeVariant(Map.of())).isEmpty();
    }
}
