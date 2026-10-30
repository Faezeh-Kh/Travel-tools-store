package com.store.traveltools.cart;

import java.util.UUID;

// The cart id cookie, shared by every controller that works on the visitor's cart (cart edits and checkout).
public final class CartCookie {

    public static final String NAME = "cartId";

    private CartCookie() {
    }

    // A missing cookie is null (no cookie sent at all); a present-but-invalid value (tampered/corrupt)
    // is treated the same way rather than surfacing an error - CartService already treats a well-formed
    // but unknown cart id leniently (falls back to creating a new cart), so this just extends that same
    // leniency to malformed input, rather than letting it 500.
    public static UUID parse(String cookieValue) {
        if (cookieValue == null) {
            return null;
        }
        try {
            return UUID.fromString(cookieValue);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
