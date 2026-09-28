package com.store.traveltools.product;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.store.traveltools.common.dto.PageResponse;
import com.store.traveltools.product.dto.ProductDetailResponse;
import com.store.traveltools.product.dto.ProductSearchRequest;
import com.store.traveltools.product.dto.ProductSummaryResponse;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public PageResponse<ProductSummaryResponse> getProducts(@Valid @ModelAttribute ProductSearchRequest request) {
        return productService.searchActiveProducts(request);
    }

    @GetMapping("/{slug}")
    public ProductDetailResponse getProduct(@PathVariable String slug) {
        return productService.getActiveProductBySlug(slug);
    }
}
