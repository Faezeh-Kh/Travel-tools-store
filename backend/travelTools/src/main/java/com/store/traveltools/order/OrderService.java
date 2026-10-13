package com.store.traveltools.order;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

@Service
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductVariantRepository productVariantRepository;

    public OrderService(OrderRepository orderRepository, CartRepository cartRepository,
            CartItemRepository cartItemRepository, ProductVariantRepository productVariantRepository) {
        this.orderRepository = orderRepository;
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.productVariantRepository = productVariantRepository;
    }

    // Turns the cart into an order in one transaction: either everything below happens (stock reduced,
    // order saved, cart emptied) or, on any failure, nothing does.
    //
    // Unlike the cart's advisory stock check, this one is authoritative. Lock order matters:
    // 1. The cart row, which serializes this with edits to the same cart and with a second submit of it
    //    (that one then finds the cart empty, so a double click can't create two orders).
    // 2. The cart's variant rows, sorted by id, before anything else loads them, so the stock read below
    //    is the value at lock time and concurrent checkouts can't both sell the same last unit.
    // Product rows are not locked: deactivating a product while a checkout runs could still let that
    // checkout through. There is no admin path that deactivates products yet; PROJECT.md records how the
    // Phase 7 one must lock to stay compatible with this.
    @Transactional
    public OrderResponse placeOrder(UUID cartId, PlaceOrderRequest request) {
        Cart cart = lockCart(cartId);
        List<Long> variantIds = cartItemRepository.findProductVariantIdsByCartId(cart.getId());
        if (variantIds.isEmpty()) {
            throw new ConflictException("The cart is empty.");
        }
        List<ProductVariant> lockedVariants = productVariantRepository.lockAllByIdOrderById(variantIds);
        // Cannot happen while cart_items' foreign key blocks deleting a variant that is in a cart and every cart
        // change takes the cart lock held above. If it ever does, that is a data bug, not something the
        // customer did, so it fails as a 500 rather than a "no longer available" 409.
        if (lockedVariants.size() != variantIds.size()) {
            throw new IllegalStateException(
                    "Cart %s references product variants that no longer exist.".formatted(cart.getId()));
        }

        // Fetches the same, now locked, variant instances: the persistence context returns one object per row.
        List<CartItem> cartItems = cartItemRepository.findByCartIdOrderByIdAsc(cart.getId());
        Order order = new Order(request.firstName(), request.lastName(), request.phoneNumber(),
                new DeliveryAddress(request.address(), request.city(), request.postalCode()),
                blankToNull(request.notes()));
        for (CartItem cartItem : cartItems) {
            ProductVariant variant = cartItem.getProductVariant();
            int quantity = cartItem.getQuantity();
            requirePurchasable(variant, quantity);
            variant.decreaseStock(quantity);
            order.addItem(toOrderItem(variant, quantity));
        }

        Order saved = orderRepository.save(order);
        // The cart row itself is kept, so the visitor's cart cookie stays valid for their next purchase.
        cartItemRepository.deleteAll(cartItems);
        return toResponse(saved);
    }

    private Cart lockCart(UUID cartId) {
        if (cartId == null) {
            throw new NotFoundException("Cart not found.");
        }
        return cartRepository.lockById(cartId).orElseThrow(() -> new NotFoundException("Cart not found."));
    }

    private static void requirePurchasable(ProductVariant variant, int quantity) {
        if (!variant.isActive() || !variant.getProduct().isActive()) {
            throw new ConflictException("%s is no longer available.".formatted(variant.getSku()));
        }
        if (quantity > variant.getStockQuantity()) {
            throw new ConflictException(
                    "Only %d unit(s) of %s are available.".formatted(variant.getStockQuantity(), variant.getSku()));
        }
    }

    // Copies everything the order needs to show later, at today's price - prices sent by the client are
    // never used.
    private static OrderItem toOrderItem(ProductVariant variant, int quantity) {
        Product product = variant.getProduct();
        // Same "first image is primary" convention as the catalog and the cart.
        String primaryImage = product.getImages().isEmpty() ? null : product.getImages().get(0);
        return new OrderItem(product.getId(), variant.getId(), product.getName(),
                describeVariant(variant.getAttributes()), primaryImage, variant.getSku(), quantity,
                variant.getPrice());
    }

    // e.g. {"رنگ": "سبز", "ظرفیت": "۴۰ لیتر"} -> "رنگ: سبز، ظرفیت: ۴۰ لیتر"; a variant without
    // attributes (a product's single default variant) gets an empty description.
    static String describeVariant(Map<String, String> attributes) {
        return attributes.entrySet().stream()
                .map(entry -> entry.getKey() + ": " + entry.getValue())
                .collect(Collectors.joining("، "));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private static OrderResponse toResponse(Order order) {
        List<OrderItemResponse> items = order.getItems().stream()
                .map(item -> new OrderItemResponse(item.getProductName(), item.getVariantDescription(),
                        item.getProductImage(), item.getSku(), item.getQuantity(), item.getUnitPrice(),
                        item.getTotalPrice()))
                .toList();
        DeliveryAddress address = order.getDeliveryAddress();
        return new OrderResponse(order.getOrderNumber(), order.getStatus(), order.getFirstName(),
                order.getLastName(), order.getPhoneNumber(), address.getAddressLine(), address.getCity(),
                address.getPostalCode(), order.getNotes(), items, order.getTotalPrice(), order.getCreatedAt());
    }
}
