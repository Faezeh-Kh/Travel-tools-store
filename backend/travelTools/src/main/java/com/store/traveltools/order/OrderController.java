package com.store.traveltools.order;

import java.net.URI;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.store.traveltools.cart.CartCookie;
import com.store.traveltools.common.exception.NotFoundException;
import com.store.traveltools.order.dto.OrderResponse;
import com.store.traveltools.order.dto.PlaceOrderRequest;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // Checks out the visitor's cart (from the cart cookie). The cart cookie is left as it is: the cart row
    // survives checkout (only its items are removed), so the same cookie keeps working for the next purchase.
    // @ResponseStatus doesn't change the response (the ResponseEntity sets 201 itself); it tells springdoc
    // the success status, which it otherwise documents as 200.
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<OrderResponse> placeOrder(
            @CookieValue(value = CartCookie.NAME, required = false) String cartIdCookie,
            @Valid @RequestBody PlaceOrderRequest request) {
        OrderResponse order = orderService.placeOrder(CartCookie.parse(cartIdCookie), request);
        return ResponseEntity.created(URI.create("/api/orders/" + order.accessToken()))
                .cacheControl(CacheControl.noStore())
                .body(order);
    }

    // The token is taken as a String and parsed here, so a malformed one is simply "not found" (404), like an
    // unknown one: for a secret link, anything that doesn't match an order is just a link that doesn't exist.
    // no-store: the response holds personal details that browsers and proxies must not keep.
    @GetMapping("/{accessToken}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable String accessToken) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(orderService.getOrder(parseAccessToken(accessToken)));
    }

    private static UUID parseAccessToken(String accessToken) {
        try {
            return UUID.fromString(accessToken);
        } catch (IllegalArgumentException e) {
            throw new NotFoundException("Order not found.");
        }
    }
}
