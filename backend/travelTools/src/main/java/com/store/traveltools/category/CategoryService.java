package com.store.traveltools.category;

import java.util.List;

import org.springframework.stereotype.Service;

import com.store.traveltools.category.dto.CategoryResponse;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<CategoryResponse> getActiveCategories() {
        return categoryRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(category -> new CategoryResponse(
                        category.getId(),
                        category.getName(),
                        category.getSlug(),
                        category.getDescription()))
                .toList();
    }
}
