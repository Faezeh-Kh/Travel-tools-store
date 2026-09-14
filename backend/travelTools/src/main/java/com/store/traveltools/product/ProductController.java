package com.store.traveltools.product;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.store.traveltools.product.dto.ProductDetailResponse;
import com.store.traveltools.product.dto.ProductSummaryResponse;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public List<ProductSummaryResponse> getProducts() {
        return productService.getActiveProducts();
    }

    @GetMapping("/{slug}")
    public ProductDetailResponse getProduct(@PathVariable String slug) {
        return productService.getActiveProductBySlug(slug);
    }
}
