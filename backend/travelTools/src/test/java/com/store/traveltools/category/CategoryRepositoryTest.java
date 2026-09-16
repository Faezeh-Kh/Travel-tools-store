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
    void findByActiveTrueOrderByNameAsc_returnsOnlyActiveCategoriesInSortedOrder() {
        Category active = categoryRepository.save(
                new Category("Test Active Category", "test-active-category", "Fixture for repository test.", true));
        Category inactive = categoryRepository.save(new Category(
                "Test Inactive Category", "test-inactive-category", "Fixture for repository test.", false));

        List<Category> categories = categoryRepository.findByActiveTrueOrderByNameAsc();

        assertThat(categories).allMatch(Category::isActive);
        assertThat(categories).extracting(Category::getId).contains(active.getId());
        assertThat(categories).extracting(Category::getId).doesNotContain(inactive.getId());
        assertThat(categories).isSortedAccordingTo(Comparator.comparing(Category::getName));
    }

    // Intentionally hardcodes the V1 migration's seed values: this test's explicit purpose is
    // verifying the initial category seed data, not generic repository query behavior.
    @Test
    void v1SeedMigration_insertsExpectedCategorySlugs() {
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
