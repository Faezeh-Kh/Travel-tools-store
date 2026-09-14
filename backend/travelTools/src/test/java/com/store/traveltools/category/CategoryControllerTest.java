package com.store.traveltools.category;

import static org.mockito.BDDMockito.given;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
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
    void getCategories_returnsActiveCategoriesFromService() {
        given(categoryService.getActiveCategories()).willReturn(List.of(
                new CategoryResponse(1L, "کمپینگ و سرپناه", "camping-shelter", "چادر و تجهیزات سرپناه.")));

        mockMvc.get().uri("/api/categories")
                .assertThat()
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$[0].slug").isEqualTo("camping-shelter");
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
