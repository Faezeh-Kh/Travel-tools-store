package com.store.traveltools.category;

import static org.mockito.BDDMockito.given;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import com.store.traveltools.category.dto.CategoryResponse;

@WebMvcTest(CategoryController.class)
class CategoryControllerTest {

    @Autowired
    private MockMvcTester mockMvc;

    @MockitoBean
    private CategoryService categoryService;

    @Test
    void getCategories_returnsFullCategoryPayloadFromService() {
        CategoryResponse category = new CategoryResponse(
                1L, "کمپینگ و سرپناه", "camping-shelter", "چادر و تجهیزات سرپناه.");
        given(categoryService.getActiveCategories()).willReturn(List.of(category));

        mockMvc.get().uri("/api/categories")
                .assertThat()
                .hasStatusOk()
                .hasContentType(MediaType.APPLICATION_JSON)
                .bodyJson()
                .convertTo(CategoryResponse[].class)
                .isEqualTo(new CategoryResponse[] {category});
    }

    @Test
    void getCategories_returnsEmptyArrayWhenNoActiveCategoriesExist() {
        given(categoryService.getActiveCategories()).willReturn(List.of());

        mockMvc.get().uri("/api/categories")
                .assertThat()
                .hasStatusOk()
                .bodyJson()
                .isEqualTo("[]");
    }
}
