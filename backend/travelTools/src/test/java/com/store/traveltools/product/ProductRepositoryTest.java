package com.store.traveltools.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import com.store.traveltools.AbstractIntegrationTest;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ProductRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private ProductRepository productRepository;

    @Test
    void findByActiveTrueOrderByNameAsc_returnsSeededProductsSortedByName() {
        List<Product> products = productRepository.findByActiveTrueOrderByNameAsc();

        assertThat(products).hasSize(5);
        assertThat(products).allMatch(Product::isActive);
        assertThat(products).isSortedAccordingTo(Comparator.comparing(Product::getName));
    }

    @Test
    void findBySlugAndActiveTrue_returnsProductWithItsCategory() {
        Optional<Product> product = productRepository.findBySlugAndActiveTrue("folding-camping-chair");

        assertThat(product).isPresent();
        assertThat(product.get().getCategory().getSlug()).isEqualTo("camping-furniture");
    }

    @Test
    void findBySlugAndActiveTrue_returnsEmptyForUnknownSlug() {
        Optional<Product> product = productRepository.findBySlugAndActiveTrue("does-not-exist");

        assertThat(product).isEmpty();
    }
}
