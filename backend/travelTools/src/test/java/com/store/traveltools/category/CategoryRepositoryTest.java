package com.store.traveltools.category;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Comparator;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import com.store.traveltools.AbstractIntegrationTest;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class CategoryRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private CategoryRepository categoryRepository;

    @Test
    void findByActiveTrueOrderByNameAsc_returnsSeededCategoriesSortedByName() {
        List<Category> categories = categoryRepository.findByActiveTrueOrderByNameAsc();

        assertThat(categories).hasSize(5);
        assertThat(categories).allMatch(Category::isActive);
        assertThat(categories).isSortedAccordingTo(Comparator.comparing(Category::getName));
    }

    @Test
    void seededCategoriesHaveTheExpectedUniqueSlugs() {
        List<Category> categories = categoryRepository.findAll();

        assertThat(categories).extracting(Category::getSlug)
                .containsExactlyInAnyOrder(
                        "camping-shelter",
                        "camping-furniture",
                        "cooking-food",
                        "lighting-power",
                        "travel-accessories");
    }
}
