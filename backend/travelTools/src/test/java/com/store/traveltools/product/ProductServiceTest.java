package com.store.traveltools.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.store.traveltools.category.Category;
import com.store.traveltools.common.exception.NotFoundException;
import com.store.traveltools.product.ProductVariantRepository.ActivePriceRange;
import com.store.traveltools.product.dto.ProductDetailResponse;
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

    private static Product mockProduct(Long id, String name, String slug, List<String> images) {
        Product product = mock(Product.class);
        given(product.getId()).willReturn(id);
        given(product.getName()).willReturn(name);
        given(product.getSlug()).willReturn(slug);
        given(product.getShortDescription()).willReturn("Short description.");
        given(product.getImages()).willReturn(images);
        return product;
    }

    private static ActivePriceRange mockPriceRange(Long productId, BigDecimal min, BigDecimal max) {
        ActivePriceRange range = mock(ActivePriceRange.class);
        given(range.getProductId()).willReturn(productId);
        given(range.getMinPrice()).willReturn(min);
        given(range.getMaxPrice()).willReturn(max);
        return range;
    }

    @Test
    void getActiveProducts_mapsPriceRangeAndPrimaryImageWhenPresent() {
        Product product = mockProduct(1L, "Test Product", "test-product", List.of("/images/1.jpg"));
        ActivePriceRange priceRange = mockPriceRange(1L, new BigDecimal("100.00"), new BigDecimal("200.00"));
        given(productRepository.findByActiveTrueOrderByNameAsc()).willReturn(List.of(product));
        given(productVariantRepository.findActivePriceRanges()).willReturn(List.of(priceRange));

        List<ProductSummaryResponse> result = productService.getActiveProducts();

        assertThat(result).containsExactly(new ProductSummaryResponse(
                1L, "Test Product", "test-product", "Short description.",
                "/images/1.jpg", new BigDecimal("100.00"), new BigDecimal("200.00")));
    }

    @Test
    void getActiveProducts_returnsNullPriceRangeWhenProductHasNoActiveVariantPriceRangeEntry() {
        Product product = mockProduct(2L, "Test Product No Range", "test-product-no-range", List.of());
        given(productRepository.findByActiveTrueOrderByNameAsc()).willReturn(List.of(product));
        given(productVariantRepository.findActivePriceRanges()).willReturn(List.of());

        List<ProductSummaryResponse> result = productService.getActiveProducts();

        assertThat(result).containsExactly(new ProductSummaryResponse(
                2L, "Test Product No Range", "test-product-no-range", "Short description.", null, null, null));
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
