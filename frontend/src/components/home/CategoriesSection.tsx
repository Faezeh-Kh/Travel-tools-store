import type {Category} from "@/lib/api/types";
import {CategoryCard} from "@/components/CategoryCard";

export function CategoriesSection({categories}: {categories: Category[]}) {
    return (
        <section>
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
                <h2 className="w-fit border-b-2 border-accent pb-2 text-2xl font-bold">دسته‌بندی‌ها</h2>
                {categories.length === 0 ? (
                    <p className="text-zinc-500">در حال حاضر دسته‌بندی‌ای برای نمایش وجود ندارد.</p>
                ) : (
                    <ul className="grid list-none grid-cols-2 gap-4 sm:grid-cols-3">
                        {categories.map((category) => (
                            <li key={category.id}>
                                <CategoryCard category={category} />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
