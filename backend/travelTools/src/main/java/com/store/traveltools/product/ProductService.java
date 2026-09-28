package com.store.traveltools.product;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.store.traveltools.common.dto.PageResponse;
import com.store.traveltools.common.exception.NotFoundException;
import com.store.traveltools.product.ProductRepository.ProductCatalogRow;
import com.store.traveltools.product.dto.ProductDetailResponse;
import com.store.traveltools.product.dto.ProductSearchRequest;
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

    private static ProductSummaryResponse toSummary(ProductCatalogRow row) {
        return new ProductSummaryResponse(
                row.getId(), row.getName(), row.getSlug(), row.getShortDescription(),
                row.getPrimaryImage(), row.getMinPrice(), row.getMaxPrice());
    }

    private static ProductVariantResponse toVariantResponse(ProductVariant variant) {
        return new ProductVariantResponse(
                variant.getId(),
                variant.getSku(),
                variant.getAttributes(),
                variant.getPrice(),
                variant.getStockQuantity());
    }

    public PageResponse<ProductSummaryResponse> searchActiveProducts(ProductSearchRequest request) {
        String sort = request.sort() == null ? null : request.sort().name();

        Page<ProductCatalogRow> page = productRepository.search(
                request.search(), request.category(), request.inStock(), sort,
                PageRequest.of(request.page(), request.size()));

        List<ProductSummaryResponse> items = page.getContent().stream()
                .map(ProductService::toSummary)
                .toList();

        return new PageResponse<>(
                items, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
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
}
