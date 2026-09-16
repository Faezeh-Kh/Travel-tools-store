package com.store.traveltools.category;

import com.store.traveltools.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Comparator;
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

    @Test
    void savingCategoryWithDuplicateSlug_violatesUniqueConstraint() {
        categoryRepository.saveAndFlush(
                new Category("Test Category A", "test-duplicate-category-slug", "Fixture.", true));

        assertThatThrownBy(() -> categoryRepository.saveAndFlush(
                new Category("Test Category B", "test-duplicate-category-slug", "Fixture.", true)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
