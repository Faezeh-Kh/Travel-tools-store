package com.store.traveltools.cart;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;

import com.store.traveltools.cart.dto.AddCartItemRequest;
import com.store.traveltools.cart.dto.CartResponse;
import com.store.traveltools.cart.dto.UpdateCartItemQuantityRequest;
import com.store.traveltools.common.dto.ErrorResponse;
import com.store.traveltools.common.dto.FieldErrorDetail;

// new ObjectMapper() rather than @Autowired: this @WebMvcTest slice doesn't expose one (confirmed via
// an earlier UnsatisfiedDependencyException in ProductControllerTest, which uses the same pattern for
// the same reason). Harmless while Jackson uses its defaults; if app-level Jackson customization is
// ever introduced, this and ProductControllerTest would both need revisiting together.
@WebMvcTest(CartController.class)
class CartControllerTest {

    @Autowired
    private MockMvcTester mockMvc;

    @MockitoBean
    private CartService cartService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final UUID CART_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    private static CartResponse emptyCartResponse(UUID id) {
        return new CartResponse(id, List.of(), BigDecimal.ZERO, BigDecimal.ZERO);
    }

    // Shared by every mutating-endpoint test so a regression in any single cookie attribute, on any
    // endpoint, gets caught - not just the attributes a given test happened to check.
    private static void assertCartCookieAttributes(String setCookieHeader, UUID expectedId) {
        assertThat(setCookieHeader)
                .contains("cartId=" + expectedId)
                .contains("HttpOnly")
                .contains("SameSite=Lax")
                .contains("Path=/")
                .contains("Max-Age=2592000"); // 30 days, in seconds
    }

    @Test
    void getCart_passesTheCookieCartIdToTheService() throws Exception {
        given(cartService.getCart(CART_ID)).willReturn(emptyCartResponse(CART_ID));

        mockMvc.get().uri("/api/cart").cookie(new Cookie("cartId", CART_ID.toString()))
                .assertThat()
                .hasStatusOk()
                .hasContentType(MediaType.APPLICATION_JSON)
                .bodyJson()
                .isEqualTo(objectMapper.writeValueAsString(emptyCartResponse(CART_ID)));

        verify(cartService).getCart(CART_ID);
    }

    @Test
    void getCart_passesNullWhenNoCookieIsPresent() {
        given(cartService.getCart(isNull())).willReturn(emptyCartResponse(null));

        mockMvc.get().uri("/api/cart").assertThat().hasStatusOk();

        verify(cartService).getCart(null);
    }

    @Test
    void getCart_treatsAMalformedCookieAsNoCartInsteadOfFailing() {
        given(cartService.getCart(isNull())).willReturn(emptyCartResponse(null));

        mockMvc.get().uri("/api/cart").cookie(new Cookie("cartId", "not-a-uuid"))
                .assertThat().hasStatusOk();

        verify(cartService).getCart(null);
    }

    @Test
    void getCart_doesNotSetACookie() {
        given(cartService.getCart(any())).willReturn(emptyCartResponse(null));

        var result = mockMvc.get().uri("/api/cart").exchange();

        assertThat(result.getResponse().getHeader(HttpHeaders.SET_COOKIE)).isNull();
    }

    @Test
    void addItem_setsTheCartCookieFromTheResponseCartId() throws Exception {
        given(cartService.addItem(isNull(), eq(new AddCartItemRequest(1L, 2))))
                .willReturn(emptyCartResponse(CART_ID));

        var result = mockMvc.post().uri("/api/cart/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new AddCartItemRequest(1L, 2)))
                .exchange();

        result.assertThat().hasStatusOk();
        assertCartCookieAttributes(result.getResponse().getHeader(HttpHeaders.SET_COOKIE), CART_ID);
        verify(cartService).addItem(null, new AddCartItemRequest(1L, 2));
    }

    @Test
    void addItem_treatsAMalformedCookieAsNoCartInsteadOfFailing() throws Exception {
        given(cartService.addItem(isNull(), eq(new AddCartItemRequest(1L, 2))))
                .willReturn(emptyCartResponse(CART_ID));

        mockMvc.post().uri("/api/cart/items")
                .cookie(new Cookie("cartId", "not-a-uuid"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new AddCartItemRequest(1L, 2)))
                .assertThat().hasStatusOk();

        // A malformed cookie on POST specifically means the service is asked to create a *new* cart
        // (null cartId), not merely that it's read leniently - that's the behavior worth protecting here.
        verify(cartService).addItem(null, new AddCartItemRequest(1L, 2));
    }

    @Test
    void addItem_returnsValidationErrorForNonPositiveQuantity() {
        mockMvc.post().uri("/api/cart/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"productVariantId\": 1, \"quantity\": 0}")
                .assertThat()
                .hasStatus(400)
                .bodyJson()
                .convertTo(ErrorResponse.class)
                .satisfies(error -> {
                    assertThat(error.code()).isEqualTo("VALIDATION_ERROR");
                    assertThat(error.fieldErrors()).extracting(FieldErrorDetail::field).contains("quantity");
                });
    }

    @Test
    void addItem_returnsValidationErrorForMissingProductVariantId() {
        mockMvc.post().uri("/api/cart/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"quantity\": 1}")
                .assertThat()
                .hasStatus(400)
                .bodyJson()
                .convertTo(ErrorResponse.class)
                .satisfies(error -> {
                    assertThat(error.code()).isEqualTo("VALIDATION_ERROR");
                    assertThat(error.fieldErrors()).extracting(FieldErrorDetail::field)
                            .contains("productVariantId");
                });
    }

    @Test
    void updateItemQuantity_setsTheCartCookieAndPassesTheItemId() throws Exception {
        given(cartService.updateItemQuantity(CART_ID, 5L, new UpdateCartItemQuantityRequest(3)))
                .willReturn(emptyCartResponse(CART_ID));

        var result = mockMvc.patch().uri("/api/cart/items/5")
                .cookie(new Cookie("cartId", CART_ID.toString()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new UpdateCartItemQuantityRequest(3)))
                .exchange();

        result.assertThat().hasStatusOk();
        assertCartCookieAttributes(result.getResponse().getHeader(HttpHeaders.SET_COOKIE), CART_ID);
        verify(cartService).updateItemQuantity(CART_ID, 5L, new UpdateCartItemQuantityRequest(3));
    }

    @Test
    void updateItemQuantity_returnsValidationErrorForNonPositiveQuantity() {
        mockMvc.patch().uri("/api/cart/items/5")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"quantity\": 0}")
                .assertThat()
                .hasStatus(400)
                .bodyJson()
                .convertTo(ErrorResponse.class)
                .satisfies(error -> {
                    assertThat(error.code()).isEqualTo("VALIDATION_ERROR");
                    assertThat(error.fieldErrors()).extracting(FieldErrorDetail::field).contains("quantity");
                });
    }

    @Test
    void removeItem_setsTheCartCookieAndPassesTheItemId() {
        given(cartService.removeItem(CART_ID, 5L)).willReturn(emptyCartResponse(CART_ID));

        var result = mockMvc.delete().uri("/api/cart/items/5")
                .cookie(new Cookie("cartId", CART_ID.toString()))
                .exchange();

        result.assertThat().hasStatusOk();
        assertCartCookieAttributes(result.getResponse().getHeader(HttpHeaders.SET_COOKIE), CART_ID);
        verify(cartService).removeItem(CART_ID, 5L);
    }

    @Test
    void crossOriginRequestFromTheConfiguredFrontend_receivesCredentialedCorsHeaders() {
        given(cartService.getCart(any())).willReturn(emptyCartResponse(null));

        var result = mockMvc.get().uri("/api/cart")
                .header(HttpHeaders.ORIGIN, "http://localhost:3000")
                .exchange();

        result.assertThat().hasStatusOk();
        assertThat(result.getResponse().getHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN))
                .isEqualTo("http://localhost:3000");
        assertThat(result.getResponse().getHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS))
                .isEqualTo("true");
    }

    @Test
    void crossOriginRequestFromADisallowedOrigin_doesNotReceiveCorsHeaders() {
        given(cartService.getCart(any())).willReturn(emptyCartResponse(null));

        var result = mockMvc.get().uri("/api/cart")
                .header(HttpHeaders.ORIGIN, "http://evil.example.com")
                .exchange();

        assertThat(result.getResponse().getHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN)).isNull();
    }

    // Separate nested context so app.cart-cookie.secure can be overridden without affecting the
    // (secure=false, matching the real default) tests above.
    @Nested
    @TestPropertySource(properties = "app.cart-cookie.secure=true")
    class WithSecureCookieEnabled {

        @Test
        void addItem_marksTheCookieSecureWhenConfigured() throws Exception {
            given(cartService.addItem(isNull(), eq(new AddCartItemRequest(1L, 2))))
                    .willReturn(emptyCartResponse(CART_ID));

            var result = mockMvc.post().uri("/api/cart/items")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(new AddCartItemRequest(1L, 2)))
                    .exchange();

            assertThat(result.getResponse().getHeader(HttpHeaders.SET_COOKIE)).contains("Secure");
        }
    }
}
