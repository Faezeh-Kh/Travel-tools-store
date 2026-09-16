package com.store.traveltools.category;

import com.store.traveltools.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class CategoryRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private CategoryRepository categoryRepository;

    @Test
    void findByActiveTrueOrderByNameAsc_returnsOnlyActiveCategoriesInSortedOrder() {
        // Inserted in reverse alphabetical order so the assertion below actually proves the query
        // sorts by name, rather than passing merely because insertion order happened to match.
        Category second = categoryRepository.save(
                new Category("Test Active Category B", "test-active-category-b", "Fixture.", true));
        Category first = categoryRepository.save(
                new Category("Test Active Category A", "test-active-category-a", "Fixture.", true));
        Category inactive = categoryRepository.save(
                new Category("Test Inactive Category", "test-inactive-category", "Fixture.", false));

        List<Category> categories = categoryRepository.findByActiveTrueOrderByNameAsc();

        assertThat(categories).allMatch(Category::isActive);
        assertThat(categories).extracting(Category::getId).doesNotContain(inactive.getId());
        // Scoped to just these fixtures - not the full seeded+fixture list - so the result doesn't
        // depend on Flyway seed content or on collation-dependent ordering across Persian/Latin scripts.
        assertThat(categories)
                .filteredOn(category -> category.getId().equals(first.getId()) || category.getId().equals(second.getId()))
                .extracting(Category::getId)
                .containsExactly(first.getId(), second.getId());
    }

    @Test
    void savingCategoryWithDuplicateSlug_violatesUniqueConstraint() {
        categoryRepository.saveAndFlush(
                new Category("Test Category A", "test-duplicate-category-slug", "Fixture.", true));

        assertThatThrownBy(() -> categoryRepository.saveAndFlush(
                new Category("Test Category B", "test-duplicate-category-slug", "Fixture.", true)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
