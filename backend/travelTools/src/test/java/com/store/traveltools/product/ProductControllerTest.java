package com.store.traveltools.product;

import static org.mockito.BDDMockito.given;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import com.store.traveltools.common.exception.NotFoundException;
import com.store.traveltools.product.dto.ProductDetailResponse;
import com.store.traveltools.product.dto.ProductSummaryResponse;

@WebMvcTest(ProductController.class)
class ProductControllerTest {

    @Autowired
    private MockMvcTester mockMvc;

    @MockitoBean
    private ProductService productService;

    @Test
    void getProducts_returnsActiveProductsFromService() {
        given(productService.getActiveProducts()).willReturn(List.of(
                new ProductSummaryResponse(1L, "صندلی تاشو کمپینگ", "folding-camping-chair",
                        "صندلی سبک و تاشو.", null, new BigDecimal("950000.00"), new BigDecimal("950000.00"))));

        mockMvc.get().uri("/api/products")
                .assertThat()
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$[0].slug").isEqualTo("folding-camping-chair");
    }

    @Test
    void getProduct_returnsProductDetailForKnownSlug() {
        given(productService.getActiveProductBySlug("folding-camping-chair")).willReturn(
                new ProductDetailResponse(1L, "صندلی تاشو کمپینگ", "folding-camping-chair",
                        "صندلی سبک و تاشو.", "توضیحات کامل.", List.of(), Map.of(),
                        "مبلمان کمپینگ", "camping-furniture", List.of()));

        mockMvc.get().uri("/api/products/folding-camping-chair")
                .assertThat()
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.categorySlug").isEqualTo("camping-furniture");
    }

    @Test
    void getProduct_returnsNotFoundForUnknownSlug() {
        given(productService.getActiveProductBySlug("does-not-exist"))
                .willThrow(new NotFoundException("Product not found: does-not-exist"));

        mockMvc.get().uri("/api/products/does-not-exist")
                .assertThat()
                .hasStatus(404)
                .bodyJson()
                .extractingPath("$.code").isEqualTo("NOT_FOUND");
    }
}
