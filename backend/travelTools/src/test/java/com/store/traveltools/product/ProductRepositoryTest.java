package com.store.traveltools.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

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

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Category testCategory;

    @BeforeEach
    void createTestCategory() {
        // Repository tests must not depend on Flyway seed data (PROJECT.md "Testing conventions"). Category's
        // fixture constructor is package-private to `category`, so a minimal row is inserted directly here
        // rather than widening its visibility just for this cross-package test's convenience.
        Long categoryId = jdbcTemplate.queryForObject(
                "INSERT INTO categories (name, slug, description, active) VALUES (?, ?, ?, TRUE) RETURNING id",
                Long.class, "Test Category", "test-category-for-product-repository-test", "Fixture.");
        testCategory = categoryRepository.getReferenceById(categoryId);
    }

    @Test
    void findByActiveTrueOrderByNameAsc_returnsOnlyActiveProductsInSortedOrder() {
        Product active = productRepository.save(new Product(testCategory, "Test Active Product",
                "test-active-product", "Short description.", "Full description.", List.of(), Map.of(), true));
        Product inactive = productRepository.save(new Product(testCategory, "Test Inactive Product",
                "test-inactive-product", "Short description.", "Full description.", List.of(), Map.of(), false));

        List<Product> products = productRepository.findByActiveTrueOrderByNameAsc();

        assertThat(products).allMatch(Product::isActive);
        assertThat(products).extracting(Product::getId).contains(active.getId());
        assertThat(products).extracting(Product::getId).doesNotContain(inactive.getId());
        assertThat(products).isSortedAccordingTo(Comparator.comparing(Product::getName));
    }

    @Test
    void findBySlugAndActiveTrue_returnsProductWithItsCategory() {
        Product product = productRepository.save(new Product(testCategory, "Test Product With Category",
                "test-product-with-category", "Short description.", "Full description.", List.of(), Map.of(), true));

        Optional<Product> found = productRepository.findBySlugAndActiveTrue("test-product-with-category");

        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(product.getId());
        assertThat(found.get().getCategory().getId()).isEqualTo(testCategory.getId());
    }

    @Test
    void findBySlugAndActiveTrue_returnsEmptyForUnknownSlug() {
        Optional<Product> product = productRepository.findBySlugAndActiveTrue("does-not-exist");

        assertThat(product).isEmpty();
    }

    @Test
    void findBySlugAndActiveTrue_returnsEmptyForExistingButInactiveProduct() {
        productRepository.save(new Product(testCategory, "Test Inactive Product For Slug",
                "test-inactive-product-for-slug", "Short description.", "Full description.", List.of(), Map.of(),
                false));

        Optional<Product> found = productRepository.findBySlugAndActiveTrue("test-inactive-product-for-slug");

        assertThat(found).isEmpty();
    }

    @Test
    void savingProductWithDuplicateSlug_violatesUniqueConstraint() {
        productRepository.saveAndFlush(new Product(testCategory, "Test Product A", "test-duplicate-product-slug",
                "Short description.", "Full description.", List.of(), Map.of(), true));

        assertThatThrownBy(() -> productRepository.saveAndFlush(new Product(testCategory, "Test Product B",
                "test-duplicate-product-slug", "Short description.", "Full description.", List.of(), Map.of(),
                true)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
