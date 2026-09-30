package com.store.traveltools.cart;

import java.time.Duration;
import java.util.UUID;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.store.traveltools.cart.dto.AddCartItemRequest;
import com.store.traveltools.cart.dto.CartResponse;
import com.store.traveltools.cart.dto.UpdateCartItemQuantityRequest;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private static final String CART_COOKIE_NAME = "cartId";
    private static final Duration CART_COOKIE_MAX_AGE = Duration.ofDays(30);

    private final CartService cartService;
    private final boolean secureCookie;

    public CartController(CartService cartService,
            @Value("${app.cart-cookie.secure:false}") boolean secureCookie) {
        this.cartService = cartService;
        this.secureCookie = secureCookie;
    }

    @GetMapping
    public CartResponse getCart(@CookieValue(value = CART_COOKIE_NAME, required = false) String cartIdCookie) {
        return cartService.getCart(parseCartId(cartIdCookie));
    }

    @PostMapping("/items")
    public CartResponse addItem(
            @CookieValue(value = CART_COOKIE_NAME, required = false) String cartIdCookie,
            @Valid @RequestBody AddCartItemRequest request,
            HttpServletResponse response) {
        CartResponse cart = cartService.addItem(parseCartId(cartIdCookie), request);
        setCartCookie(response, cart.id());
        return cart;
    }

    @PatchMapping("/items/{itemId}")
    public CartResponse updateItemQuantity(
            @CookieValue(value = CART_COOKIE_NAME, required = false) String cartIdCookie,
            @PathVariable Long itemId,
            @Valid @RequestBody UpdateCartItemQuantityRequest request,
            HttpServletResponse response) {
        CartResponse cart = cartService.updateItemQuantity(parseCartId(cartIdCookie), itemId, request);
        setCartCookie(response, cart.id());
        return cart;
    }

    @DeleteMapping("/items/{itemId}")
    public CartResponse removeItem(
            @CookieValue(value = CART_COOKIE_NAME, required = false) String cartIdCookie,
            @PathVariable Long itemId,
            HttpServletResponse response) {
        CartResponse cart = cartService.removeItem(parseCartId(cartIdCookie), itemId);
        setCartCookie(response, cart.id());
        return cart;
    }

    // A missing cookie is null (no cookie sent at all); a present-but-invalid value (tampered/corrupt)
    // is treated the same way rather than surfacing an error - CartService already treats a well-formed
    // but unknown cart id leniently (falls back to creating a new cart), so this just extends that same
    // leniency to malformed input, rather than letting it 500.
    private static UUID parseCartId(String cartIdCookie) {
        if (cartIdCookie == null) {
            return null;
        }
        try {
            return UUID.fromString(cartIdCookie);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    // app.cart-cookie.secure defaults to false because this app currently runs over plain HTTP in dev -
    // a Secure cookie simply wouldn't be stored/sent by the browser under HTTP. Set
    // CART_COOKIE_SECURE=true once deployed behind HTTPS, rather than hardcoding it here.
    private void setCartCookie(HttpServletResponse response, UUID cartId) {
        ResponseCookie cookie = ResponseCookie.from(CART_COOKIE_NAME, cartId.toString())
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Lax")
                .path("/")
                .maxAge(CART_COOKIE_MAX_AGE)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
