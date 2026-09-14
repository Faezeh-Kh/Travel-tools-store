package com.store.traveltools.product;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.store.traveltools.common.exception.NotFoundException;
import com.store.traveltools.product.ProductVariantRepository.ActivePriceRange;
import com.store.traveltools.product.dto.ProductDetailResponse;
import com.store.traveltools.product.dto.ProductSummaryResponse;
import com.store.traveltools.product.dto.ProductVariantResponse;

@Service
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;

    public ProductService(ProductRepository productRepository, ProductVariantRepository productVariantRepository) {
        this.productRepository = productRepository;
        this.productVariantRepository = productVariantRepository;
    }

    public List<ProductSummaryResponse> getActiveProducts() {
        List<Product> products = productRepository.findByActiveTrueOrderByNameAsc();

        Map<Long, ActivePriceRange> priceRangesByProductId = productVariantRepository
                .findActivePriceRanges().stream()
                .collect(Collectors.toMap(ActivePriceRange::getProductId, range -> range));

        return products.stream()
                .map(product -> toSummary(product, priceRangesByProductId.get(product.getId())))
                .toList();
    }

    public ProductDetailResponse getActiveProductBySlug(String slug) {
        Product product = productRepository.findBySlugAndActiveTrue(slug)
                .orElseThrow(() -> new NotFoundException("Product not found: " + slug));

        List<ProductVariantResponse> variants = productVariantRepository
                .findByProductIdAndActiveTrueOrderByIdAsc(product.getId()).stream()
                .map(ProductService::toVariantResponse)
                .toList();

        return new ProductDetailResponse(
                product.getId(),
                product.getName(),
                product.getSlug(),
                product.getShortDescription(),
                product.getDescription(),
                product.getImages(),
                product.getSpecifications(),
                product.getCategory().getName(),
                product.getCategory().getSlug(),
                variants);
    }

    private static ProductSummaryResponse toSummary(Product product, @Nullable ActivePriceRange priceRange) {
        String primaryImage = product.getImages().isEmpty() ? null : product.getImages().get(0);
        BigDecimal minPrice = priceRange != null ? priceRange.getMinPrice() : null;
        BigDecimal maxPrice = priceRange != null ? priceRange.getMaxPrice() : null;

        return new ProductSummaryResponse(
                product.getId(),
                product.getName(),
                product.getSlug(),
                product.getShortDescription(),
                primaryImage,
                minPrice,
                maxPrice);
    }

    private static ProductVariantResponse toVariantResponse(ProductVariant variant) {
        return new ProductVariantResponse(
                variant.getId(),
                variant.getSku(),
                variant.getAttributes(),
                variant.getPrice(),
                variant.getStockQuantity());
    }
}
