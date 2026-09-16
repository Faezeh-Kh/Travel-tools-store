package com.store.traveltools.category;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.store.traveltools.category.dto.CategoryResponse;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    // Not "trivial delegation for coverage": no other test exercises this mapping. CategoryControllerTest mocks
    // CategoryService itself, so a field-transposition bug here (e.g. swapping name/slug in the DTO constructor)
    // would otherwise go completely uncaught.
    @Test
    void getActiveCategories_mapsEachEntityFieldToTheResponseInOrder() {
        Category category = new Category("کمپینگ و سرپناه", "camping-shelter", "چادر و تجهیزات سرپناه.", true);
        given(categoryRepository.findByActiveTrueOrderByNameAsc()).willReturn(List.of(category));

        CategoryService categoryService = new CategoryService(categoryRepository);
        List<CategoryResponse> result = categoryService.getActiveCategories();

        assertThat(result).containsExactly(new CategoryResponse(
                category.getId(), category.getName(), category.getSlug(), category.getDescription()));
    }
}
