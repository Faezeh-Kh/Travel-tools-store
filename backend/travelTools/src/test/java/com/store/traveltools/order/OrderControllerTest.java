package com.store.traveltools.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import jakarta.servlet.http.Cookie;

import com.store.traveltools.common.dto.ErrorResponse;
import com.store.traveltools.common.dto.FieldErrorDetail;
import com.store.traveltools.common.exception.ConflictException;
import com.store.traveltools.common.exception.NotFoundException;
import com.store.traveltools.order.dto.OrderItemResponse;
import com.store.traveltools.order.dto.OrderResponse;
import com.store.traveltools.order.dto.PlaceOrderRequest;

// The HTTP contract only. The validation rules themselves are covered in PlaceOrderRequestTest; here one
// invalid request proves they are applied and shows the shape of the 400.
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvcTester mockMvc;

    @MockitoBean
    private OrderService orderService;

    private static final UUID CART_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID ACCESS_TOKEN = UUID.fromString("22222222-2222-2222-2222-222222222222");

    // Persian digits and spaces in the phone number, to show the JSON body really goes through the request's
    // normalizing constructor on its way to the service.
    private static final String VALID_BODY = """
            {"firstName": "علی", "lastName": "رضایی", "phoneNumber": "۰۹۱۲ ۱۲۳ ۴۵۶۷",
             "address": "خیابان آزادی، پلاک ۱۰", "city": "تهران", "postalCode": "1234567890"}
            """;

    private static final PlaceOrderRequest NORMALIZED_REQUEST = new PlaceOrderRequest("علی", "رضایی", "09121234567",
            "خیابان آزادی، پلاک ۱۰", "تهران", "1234567890", null);

    private static OrderResponse orderResponse() {
        OrderItemResponse item = new OrderItemResponse("چادر", "رنگ: سبز", null, "SKU-1", 2,
                new BigDecimal("150.00"), new BigDecimal("300.00"));
        // createdAt is left null: the test's assertions don't need it.
        return new OrderResponse("TT-100001", ACCESS_TOKEN, OrderStatus.PENDING, "علی", "رضایی", "09121234567",
                "خیابان آزادی، پلاک ۱۰", "تهران", "1234567890", null, List.of(item), new BigDecimal("300.00"),
                null);
    }

    @Test
    void placeOrder_returnsCreatedWithTheOrderAndALocationBuiltFromTheAccessToken() {
        given(orderService.placeOrder(eq(CART_ID), any())).willReturn(orderResponse());

        var result = mockMvc.post().uri("/api/orders")
                .cookie(new Cookie("cartId", CART_ID.toString()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_BODY)
                .exchange();

        result.assertThat()
                .hasStatus(201)
                .hasHeader(HttpHeaders.LOCATION, "/api/orders/" + ACCESS_TOKEN)
                .bodyJson()
                .convertTo(OrderResponse.class)
                .satisfies(order -> {
                    assertThat(order.orderNumber()).isEqualTo("TT-100001");
                    assertThat(order.accessToken()).isEqualTo(ACCESS_TOKEN);
                    assertThat(order.status()).isEqualTo(OrderStatus.PENDING);
                    assertThat(order.items()).extracting(OrderItemResponse::sku).containsExactly("SKU-1");
                });
        assertThat(result.getResponse().getHeader(HttpHeaders.CACHE_CONTROL)).contains("no-store");
        verify(orderService).placeOrder(CART_ID, NORMALIZED_REQUEST);
    }

    @Test
    void placeOrder_withoutACartCookie_passesNoCartIdAndReturnsTheServicesNotFound() {
        given(orderService.placeOrder(isNull(), any())).willThrow(new NotFoundException("Cart not found."));

        mockMvc.post().uri("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_BODY)
                .assertThat()
                .hasStatus(404)
                .bodyJson()
                .convertTo(ErrorResponse.class)
                .satisfies(error -> assertThat(error.code()).isEqualTo("NOT_FOUND"));
        verify(orderService).placeOrder(null, NORMALIZED_REQUEST);
    }

    // The cookie comes from the browser, so a tampered or corrupt value is realistic. It is treated like no
    // cookie at all (CartCookie.parse), so the result is the same 404 - never a 500.
    @Test
    void placeOrder_withAMalformedCartCookie_isTreatedLikeNoCartAndReturnsNotFound() {
        given(orderService.placeOrder(isNull(), any())).willThrow(new NotFoundException("Cart not found."));

        mockMvc.post().uri("/api/orders")
                .cookie(new Cookie("cartId", "invalid-uuid"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_BODY)
                .assertThat()
                .hasStatus(404)
                .bodyJson()
                .convertTo(ErrorResponse.class)
                .satisfies(error -> assertThat(error.code()).isEqualTo("NOT_FOUND"));
        verify(orderService).placeOrder(null, NORMALIZED_REQUEST);
    }

    // JSON that can't be parsed fails before Bean Validation: a controlled 400 with the generic request error and
    // a safe message (no parser details), not a 500.
    @Test
    void placeOrder_withMalformedJson_returnsARequestErrorWithoutCallingTheService() {
        mockMvc.post().uri("/api/orders")
                .cookie(new Cookie("cartId", CART_ID.toString()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"firstName\":")
                .assertThat()
                .hasStatus(400)
                .bodyJson()
                .convertTo(ErrorResponse.class)
                .satisfies(error -> {
                    assertThat(error.code()).isEqualTo("REQUEST_ERROR");
                    assertThat(error.message()).isEqualTo("The request could not be processed.");
                    assertThat(error.fieldErrors()).isEmpty();
                });
        verifyNoInteractions(orderService);
    }

    @Test
    void placeOrder_returnsValidationErrorsPerFieldWithoutCallingTheService() {
        mockMvc.post().uri("/api/orders")
                .cookie(new Cookie("cartId", CART_ID.toString()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"firstName": "علی", "lastName": "رضایی", "phoneNumber": "12345",
                         "address": "خیابان آزادی", "postalCode": "1234567890"}
                        """)
                .assertThat()
                .hasStatus(400)
                .bodyJson()
                .convertTo(ErrorResponse.class)
                .satisfies(error -> {
                    assertThat(error.code()).isEqualTo("VALIDATION_ERROR");
                    assertThat(error.fieldErrors()).extracting(FieldErrorDetail::field)
                            .containsExactlyInAnyOrder("phoneNumber", "city");
                });
        verifyNoInteractions(orderService);
    }

    @Test
    void placeOrder_returnsConflictWhenTheCartCannotBeOrdered() {
        given(orderService.placeOrder(eq(CART_ID), any()))
                .willThrow(new ConflictException("Only 1 unit(s) of SKU-1 are available."));

        mockMvc.post().uri("/api/orders")
                .cookie(new Cookie("cartId", CART_ID.toString()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_BODY)
                .assertThat()
                .hasStatus(409)
                .bodyJson()
                .convertTo(ErrorResponse.class)
                .satisfies(error -> assertThat(error.code()).isEqualTo("CONFLICT"));
    }

    @Test
    void getOrder_returnsTheOrderAndForbidsCachingIt() {
        given(orderService.getOrder(ACCESS_TOKEN)).willReturn(orderResponse());

        var result = mockMvc.get().uri("/api/orders/" + ACCESS_TOKEN).exchange();

        result.assertThat()
                .hasStatusOk()
                .bodyJson()
                .convertTo(OrderResponse.class)
                .satisfies(order -> {
                    assertThat(order.orderNumber()).isEqualTo("TT-100001");
                    assertThat(order.accessToken()).isEqualTo(ACCESS_TOKEN);
                    assertThat(order.status()).isEqualTo(OrderStatus.PENDING);
                    assertThat(order.firstName()).isEqualTo("علی");
                    assertThat(order.phoneNumber()).isEqualTo("09121234567");
                    assertThat(order.postalCode()).isEqualTo("1234567890");
                    assertThat(order.totalPrice()).isEqualByComparingTo("300.00");
                    assertThat(order.items()).singleElement().satisfies(item -> {
                        assertThat(item.sku()).isEqualTo("SKU-1");
                        assertThat(item.variantDescription()).isEqualTo("رنگ: سبز");
                        assertThat(item.quantity()).isEqualTo(2);
                        assertThat(item.unitPrice()).isEqualByComparingTo("150.00");
                        assertThat(item.totalPrice()).isEqualByComparingTo("300.00");
                    });
                });
        assertThat(result.getResponse().getHeader(HttpHeaders.CACHE_CONTROL)).contains("no-store");
    }

    @Test
    void getOrder_returnsNotFoundForAnUnknownToken() {
        given(orderService.getOrder(ACCESS_TOKEN)).willThrow(new NotFoundException("Order not found."));

        mockMvc.get().uri("/api/orders/" + ACCESS_TOKEN)
                .assertThat()
                .hasStatus(404)
                .bodyJson()
                .convertTo(ErrorResponse.class)
                .satisfies(error -> assertThat(error.code()).isEqualTo("NOT_FOUND"));
    }

    // Not a 400: anything that doesn't match an order - well-formed or not - is a link that doesn't exist.
    @Test
    void getOrder_returnsNotFoundForAMalformedTokenWithoutCallingTheService() {
        mockMvc.get().uri("/api/orders/TT-100001")
                .assertThat()
                .hasStatus(404)
                .bodyJson()
                .convertTo(ErrorResponse.class)
                .satisfies(error -> assertThat(error.code()).isEqualTo("NOT_FOUND"));
        verifyNoInteractions(orderService);
    }
}
