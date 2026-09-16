package com.store.traveltools.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import com.store.traveltools.common.dto.ErrorResponse;
import com.store.traveltools.common.exception.NotFoundException;
import com.store.traveltools.product.dto.ProductDetailResponse;
import com.store.traveltools.product.dto.ProductSummaryResponse;
import com.store.traveltools.product.dto.ProductVariantResponse;

@WebMvcTest(ProductController.class)
class ProductControllerTest {

    @Autowired
    private MockMvcTester mockMvc;

    @MockitoBean
    private ProductService productService;

    @Test
    void getProducts_returnsFullProductSummaryPayloadFromService() {
        ProductSummaryResponse summary = new ProductSummaryResponse(1L, "صندلی تاشو کمپینگ", "folding-camping-chair",
                "صندلی سبک و تاشو.", null, new BigDecimal("950000.00"), new BigDecimal("950000.00"));
        given(productService.getActiveProducts()).willReturn(List.of(summary));

        mockMvc.get().uri("/api/products")
                .assertThat()
                .hasStatusOk()
                .hasContentType(MediaType.APPLICATION_JSON)
                .bodyJson()
                .convertTo(ProductSummaryResponse[].class)
                .isEqualTo(new ProductSummaryResponse[] {summary});
    }

    @Test
    void getProducts_returnsEmptyArrayWhenNoActiveProductsExist() {
        given(productService.getActiveProducts()).willReturn(List.of());

        mockMvc.get().uri("/api/products")
                .assertThat()
                .hasStatusOk()
                .bodyJson()
                .isEqualTo("[]");
    }

    @Test
    void getProduct_returnsFullProductDetailPayloadIncludingVariants() {
        ProductVariantResponse variant = new ProductVariantResponse(
                1L, "CHAIR-FOLD-STD", Map.of(), new BigDecimal("950000.00"), 25);
        ProductDetailResponse detail = new ProductDetailResponse(1L, "صندلی تاشو کمپینگ", "folding-camping-chair",
                "صندلی سبک و تاشو.", "توضیحات کامل.", List.of("/images/1.jpg"), Map.of("وزن", "1.2kg"),
                "مبلمان کمپینگ", "camping-furniture", List.of(variant));
        given(productService.getActiveProductBySlug("folding-camping-chair")).willReturn(detail);

        mockMvc.get().uri("/api/products/folding-camping-chair")
                .assertThat()
                .hasStatusOk()
                .hasContentType(MediaType.APPLICATION_JSON)
                .bodyJson()
                .convertTo(ProductDetailResponse.class)
                .isEqualTo(detail);
    }

    @Test
    void getProduct_returnsNotFoundErrorEnvelopeForUnknownSlug() {
        given(productService.getActiveProductBySlug("does-not-exist"))
                .willThrow(new NotFoundException("Product not found: does-not-exist"));

        mockMvc.get().uri("/api/products/does-not-exist")
                .assertThat()
                .hasStatus(404)
                .bodyJson()
                .convertTo(ErrorResponse.class)
                .satisfies(error -> {
                    assertThat(error.status()).isEqualTo(404);
                    assertThat(error.code()).isEqualTo("NOT_FOUND");
                    assertThat(error.message()).isEqualTo("Product not found: does-not-exist");
                    assertThat(error.fieldErrors()).isEmpty();
                });
    }

    @Test
    void getProduct_returnsGenericInternalErrorEnvelopeWithoutLeakingExceptionDetailForUnexpectedFailure() {
        given(productService.getActiveProductBySlug("boom"))
                .willThrow(new IllegalStateException("sensitive internal detail"));

        mockMvc.get().uri("/api/products/boom")
                .assertThat()
                .hasStatus(500)
                .bodyJson()
                .convertTo(ErrorResponse.class)
                .satisfies(error -> {
                    assertThat(error.code()).isEqualTo("INTERNAL_ERROR");
                    assertThat(error.message()).isEqualTo("An unexpected error occurred.")
                            .doesNotContain("sensitive internal detail");
                });
    }

    @Test
    void deleteProducts_returnsMethodNotAllowedErrorEnvelope() {
        mockMvc.delete().uri("/api/products")
                .assertThat()
                .hasStatus(405)
                .bodyJson()
                .convertTo(ErrorResponse.class)
                .satisfies(error -> assertThat(error.code()).isEqualTo("REQUEST_ERROR"));
    }
}
