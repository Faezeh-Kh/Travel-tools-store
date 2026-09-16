package com.store.traveltools.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import com.store.traveltools.AbstractIntegrationTest;
import com.store.traveltools.category.Category;
import com.store.traveltools.category.CategoryRepository;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ProductRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Test
    void findByActiveTrueOrderByNameAsc_returnsOnlyActiveProductsInSortedOrder() {
        Category category = categoryRepository.findAll().getFirst();
        Product active = productRepository.save(new Product(category, "Test Active Product",
                "test-active-product", "Short description.", "Full description.", List.of(), Map.of(), true));
        Product inactive = productRepository.save(new Product(category, "Test Inactive Product",
                "test-inactive-product", "Short description.", "Full description.", List.of(), Map.of(), false));

        List<Product> products = productRepository.findByActiveTrueOrderByNameAsc();

        assertThat(products).allMatch(Product::isActive);
        assertThat(products).extracting(Product::getId).contains(active.getId());
        assertThat(products).extracting(Product::getId).doesNotContain(inactive.getId());
        assertThat(products).isSortedAccordingTo(Comparator.comparing(Product::getName));
    }

    @Test
    void findBySlugAndActiveTrue_returnsProductWithItsCategory() {
        Category category = categoryRepository.findAll().getFirst();
        Product product = productRepository.save(new Product(category, "Test Product With Category",
                "test-product-with-category", "Short description.", "Full description.", List.of(), Map.of(), true));

        Optional<Product> found = productRepository.findBySlugAndActiveTrue("test-product-with-category");

        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(product.getId());
        assertThat(found.get().getCategory().getId()).isEqualTo(category.getId());
    }

    @Test
    void findBySlugAndActiveTrue_returnsEmptyForUnknownSlug() {
        Optional<Product> product = productRepository.findBySlugAndActiveTrue("does-not-exist");

        assertThat(product).isEmpty();
    }
}
