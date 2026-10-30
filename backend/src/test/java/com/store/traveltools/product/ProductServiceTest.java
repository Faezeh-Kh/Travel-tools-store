package com.store.traveltools.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.store.traveltools.category.Category;
import com.store.traveltools.common.dto.PageResponse;
import com.store.traveltools.common.exception.NotFoundException;
import com.store.traveltools.product.ProductRepository.ProductCatalogRow;
import com.store.traveltools.product.dto.ProductDetailResponse;
import com.store.traveltools.product.dto.ProductSearchRequest;
import com.store.traveltools.product.dto.ProductSummaryResponse;
import com.store.traveltools.product.dto.ProductVariantResponse;

// Product/ProductVariant/Category are mocked rather than constructed, since ProductService's own logic (merging,
// null-handling, mapping) is what's under test here - not persistence - and their fixture constructors are
// package-private to their own packages (Category's to `category`), which this test does not share.
@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    private ProductService productService;

    @BeforeEach
    void setUp() {
        productService = new ProductService(productRepository, productVariantRepository);
    }

    private static ProductCatalogRow mockRow(
            Long id, String name, String slug, String primaryImage, BigDecimal minPrice, BigDecimal maxPrice) {
        ProductCatalogRow row = mock(ProductCatalogRow.class);
        given(row.getId()).willReturn(id);
        given(row.getName()).willReturn(name);
        given(row.getSlug()).willReturn(slug);
        given(row.getShortDescription()).willReturn("Short description.");
        given(row.getPrimaryImage()).willReturn(primaryImage);
        given(row.getMinPrice()).willReturn(minPrice);
        given(row.getMaxPrice()).willReturn(maxPrice);
        return row;
    }

    @Test
    void searchActiveProducts_mapsCatalogRowsAndPageMetadataToResponse() {
        ProductCatalogRow row = mockRow(1L, "Test Product", "test-product",
                "/images/1.jpg", new BigDecimal("100.00"), new BigDecimal("200.00"));
        Page<ProductCatalogRow> page = new PageImpl<>(List.of(row), PageRequest.of(0, 20), 1);
        given(productRepository.search(any(), any(), anyBoolean(), any(), any(Pageable.class))).willReturn(page);

        ProductSearchRequest request = new ProductSearchRequest(null, null, false, null, null, null);
        PageResponse<ProductSummaryResponse> result = productService.searchActiveProducts(request);

        assertThat(result.items()).containsExactly(new ProductSummaryResponse(
                1L, "Test Product", "test-product", "Short description.",
                "/images/1.jpg", new BigDecimal("100.00"), new BigDecimal("200.00")));
        assertThat(result.page()).isEqualTo(0);
        assertThat(result.size()).isEqualTo(20);
        assertThat(result.totalElements()).isEqualTo(1);
        assertThat(result.totalPages()).isEqualTo(1);
    }

    @Test
    void searchActiveProducts_returnsNullPriceFieldsWhenRowHasNoActiveVariants() {
        ProductCatalogRow row = mockRow(2L, "Test Product No Range", "test-product-no-range", null, null, null);
        Page<ProductCatalogRow> page = new PageImpl<>(List.of(row), PageRequest.of(0, 20), 1);
        given(productRepository.search(any(), any(), anyBoolean(), any(), any(Pageable.class))).willReturn(page);

        ProductSearchRequest request = new ProductSearchRequest(null, null, false, null, null, null);
        PageResponse<ProductSummaryResponse> result = productService.searchActiveProducts(request);

        assertThat(result.items()).containsExactly(new ProductSummaryResponse(
                2L, "Test Product No Range", "test-product-no-range", "Short description.", null, null, null));
    }

    @Test
    void searchActiveProducts_passesSortEnumNameToRepository() {
        given(productRepository.search(anyString(), anyString(), anyBoolean(), anyString(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of()));

        productService.searchActiveProducts(
                new ProductSearchRequest("چادر", "camping-shelter", true, ProductSort.PRICE_ASC, 1, 10));

        verify(productRepository).search("چادر", "camping-shelter", true, "PRICE_ASC", PageRequest.of(1, 10));
    }

    @Test
    void getActiveProductBySlug_throwsNotFoundExceptionWhenProductMissing() {
        given(productRepository.findBySlugAndActiveTrue("missing")).willReturn(Optional.empty());

        assertThatThrownBy(() -> productService.getActiveProductBySlug("missing"))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void getActiveProductBySlug_mapsProductCategoryAndActiveVariantsToDetailResponse() {
        Category category = mock(Category.class);
        given(category.getName()).willReturn("Test Category");
        given(category.getSlug()).willReturn("test-category");

        Product product = mock(Product.class);
        given(product.getId()).willReturn(3L);
        given(product.getName()).willReturn("Test Product Detail");
        given(product.getSlug()).willReturn("test-product-detail");
        given(product.getShortDescription()).willReturn("Short description.");
        given(product.getDescription()).willReturn("Full description.");
        given(product.getImages()).willReturn(List.of("/images/1.jpg"));
        given(product.getSpecifications()).willReturn(Map.of("Weight", "1kg"));
        given(product.getCategory()).willReturn(category);

        ProductVariant variant = mock(ProductVariant.class);
        given(variant.getId()).willReturn(10L);
        given(variant.getSku()).willReturn("TEST-SKU");
        given(variant.getAttributes()).willReturn(Map.of("Color", "Red"));
        given(variant.getPrice()).willReturn(new BigDecimal("100.00"));
        given(variant.getStockQuantity()).willReturn(5);

        given(productRepository.findBySlugAndActiveTrue("test-product-detail")).willReturn(Optional.of(product));
        given(productVariantRepository.findByProductIdAndActiveTrueOrderByIdAsc(3L)).willReturn(List.of(variant));

        ProductDetailResponse result = productService.getActiveProductBySlug("test-product-detail");

        assertThat(result).isEqualTo(new ProductDetailResponse(
                3L, "Test Product Detail", "test-product-detail", "Short description.", "Full description.",
                List.of("/images/1.jpg"), Map.of("Weight", "1kg"), "Test Category", "test-category",
                List.of(new ProductVariantResponse(10L, "TEST-SKU", Map.of("Color", "Red"),
                        new BigDecimal("100.00"), 5))));
    }
}
