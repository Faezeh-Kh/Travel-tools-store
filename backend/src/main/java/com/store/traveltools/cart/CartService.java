package com.store.traveltools.cart;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.store.traveltools.cart.dto.AddCartItemRequest;
import com.store.traveltools.cart.dto.CartItemResponse;
import com.store.traveltools.cart.dto.CartResponse;
import com.store.traveltools.cart.dto.UpdateCartItemQuantityRequest;
import com.store.traveltools.common.exception.ConflictException;
import com.store.traveltools.common.exception.NotFoundException;
import com.store.traveltools.product.ProductVariant;
import com.store.traveltools.product.ProductVariantRepository;

@Service
@Transactional(readOnly = true)
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductVariantRepository productVariantRepository;

    public CartService(CartRepository cartRepository, CartItemRepository cartItemRepository,
            ProductVariantRepository productVariantRepository) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.productVariantRepository = productVariantRepository;
    }

    public CartResponse getCart(UUID cartId) {
        if (cartId == null) {
            return emptyCart();
        }
        return cartRepository.findById(cartId)
                .map(this::toResponse)
                .orElseGet(CartService::emptyCart);
    }

    @Transactional
    public CartResponse addItem(UUID cartId, AddCartItemRequest request) {
        requirePositiveQuantity(request.quantity());
        // Validate the variant before creating a cart, so an invalid request doesn't leave behind an
        // empty cart row for a visitor who had no cart yet.
        ProductVariant variant = getPurchasableVariant(request.productVariantId());
        Cart cart = lockCartForMutation(cartId);

        Optional<CartItem> existing = cartItemRepository
                .findByCartIdAndProductVariantId(cart.getId(), variant.getId());
        int newQuantity = existing.map(CartItem::getQuantity).orElse(0) + request.quantity();
        validateStock(variant, newQuantity);

        if (existing.isPresent()) {
            existing.get().setQuantity(newQuantity);
        } else {
            cartItemRepository.save(new CartItem(cart, variant, newQuantity));
        }

        return toResponse(cart);
    }

    @Transactional
    public CartResponse updateItemQuantity(UUID cartId, Long itemId, UpdateCartItemQuantityRequest request) {
        requirePositiveQuantity(request.quantity());
        Cart cart = requireCart(cartId);
        CartItem item = requireOwnedItem(cart.getId(), itemId);
        validateStock(item.getProductVariant(), request.quantity());
        item.setQuantity(request.quantity());
        return toResponse(cart);
    }

    @Transactional
    public CartResponse removeItem(UUID cartId, Long itemId) {
        Cart cart = requireCart(cartId);
        CartItem item = requireOwnedItem(cart.getId(), itemId);
        cartItemRepository.delete(item);
        return toResponse(cart);
    }

    // --- Cart-level pessimistic locking protocol --------------------------------------------------
    // Every method that goes on to read-then-write a CartItem under a given cart MUST resolve that
    // cart through one of the two methods below (lockCartForMutation or requireCart), never through
    // cartRepository.findById directly. Both use CartRepository.lockById, which issues a
    // SELECT ... FOR UPDATE (PESSIMISTIC_WRITE) - the lock is acquired synchronously, the instant that
    // query runs. A concurrent request resolving the same cart the same way simply blocks until this
    // transaction commits or rolls back, then proceeds normally against the now-current data - no
    // exception, no retry needed, since the two requests are fully serialized rather than racing.
    // Because of that, only one transaction at a time can ever get past this point for a given cart,
    // so the CartItem reads/writes that follow are safe from concurrent interleaving.
    //
    // (An earlier version of this used optimistic locking - Cart.version forced to increment via
    // LockModeType.OPTIMISTIC_FORCE_INCREMENT - but that was empirically found, via a concurrency
    // integration test, not to reliably block/trigger through Spring Data's @Lock-on-@Query wiring in
    // this stack. Pessimistic locking has far fewer moving parts to get wrong: the lock is a real,
    // synchronous database lock, not something dependent on flush timing or ORM-specific lock-mode
    // plumbing - see CartConcurrencyTest for the tests that verify this.)
    private Cart lockCartForMutation(UUID cartId) {
        // A null cartId (no cookie) and an unknown/stale cartId (e.g. the cookie outlived its cart) are
        // treated the same way here: both mean "no working cart," so a fresh one is created. This is
        // deliberately different from requireCart below, which targets a specific existing item and
        // has nothing sensible to fall back to when the cart doesn't exist.
        return cartId == null ? cartRepository.save(new Cart())
                : cartRepository.lockById(cartId).orElseGet(() -> cartRepository.save(new Cart()));
    }

    private Cart requireCart(UUID cartId) {
        if (cartId == null) {
            throw new NotFoundException("Cart not found.");
        }
        return cartRepository.lockById(cartId).orElseThrow(() -> new NotFoundException("Cart not found."));
    }

    private CartItem requireOwnedItem(UUID cartId, Long itemId) {
        return cartItemRepository.findByIdAndCartId(itemId, cartId)
                .orElseThrow(() -> new NotFoundException("Cart item not found: " + itemId));
    }

    private ProductVariant getPurchasableVariant(Long variantId) {
        ProductVariant variant = productVariantRepository.findByIdAndActiveTrue(variantId)
                .orElseThrow(() -> new NotFoundException("Product variant not found: " + variantId));
        if (!variant.getProduct().isActive()) {
            throw new NotFoundException("Product variant not found: " + variantId);
        }
        return variant;
    }

    // Bean Validation (@Min(1) on the request DTOs) already rejects a non-positive quantity at the
    // controller boundary; this is a second, service-level guard so the invariant holds even if this
    // method is ever called from somewhere other than that validated HTTP path.
    private void requirePositiveQuantity(int quantity) {
        if (quantity < 1) {
            throw new IllegalArgumentException("Quantity must be positive: " + quantity);
        }
    }

    // Advisory only: this reads the variant's stock at cart-mutation time, inside this method's own
    // transaction, but stock can still change between here and whenever the customer eventually checks
    // out. Phase 6 (Checkout) MUST re-validate stock authoritatively - inside its own transaction, at
    // order-creation time - regardless of what the cart currently shows; this check exists purely to
    // give the customer timely feedback while shopping, not to guarantee availability.
    private void validateStock(ProductVariant variant, int requestedQuantity) {
        if (requestedQuantity > variant.getStockQuantity()) {
            throw new ConflictException(
                    "Only %d unit(s) of %s are available.".formatted(variant.getStockQuantity(), variant.getSku()));
        }
    }

    private CartResponse toResponse(Cart cart) {
        List<CartItemResponse> items = cartItemRepository.findByCartIdOrderByIdAsc(cart.getId()).stream()
                .map(CartService::toItemResponse)
                .toList();
        BigDecimal subtotal = items.stream()
                .map(CartItemResponse::totalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        // subtotal and totalPrice are the same value today - intentional, not an oversight. PROJECT.md's
        // domain contract names both fields on Cart, anticipating that totalPrice will diverge from
        // subtotal once something (shipping, discounts) can adjust the final total; neither exists yet.
        return new CartResponse(cart.getId(), items, subtotal, subtotal);
    }

    private static CartItemResponse toItemResponse(CartItem item) {
        ProductVariant variant = item.getProductVariant();
        var product = variant.getProduct();
        BigDecimal unitPrice = variant.getPrice();
        BigDecimal totalPrice = unitPrice.multiply(BigDecimal.valueOf(item.getQuantity()));
        // Same "first image is primary" convention as ProductRepository's catalog query (images ->> 0).
        String primaryImage = product.getImages().isEmpty() ? null : product.getImages().get(0);
        return new CartItemResponse(
                item.getId(), variant.getId(), product.getName(), product.getSlug(), primaryImage, variant.getSku(),
                variant.getAttributes(), unitPrice, item.getQuantity(), totalPrice, variant.getStockQuantity());
    }

    private static CartResponse emptyCart() {
        return new CartResponse(null, List.of(), BigDecimal.ZERO, BigDecimal.ZERO);
    }
}
