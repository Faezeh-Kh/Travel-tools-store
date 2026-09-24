import type {Metadata} from "next";
import {getCategoryBySlug} from "@/lib/api/categories";
import {CtaLink} from "@/components/CtaLink";

export async function generateMetadata({params}: PageProps<"/categories/[slug]">): Promise<Metadata> {
    const {slug} = await params;
    const category = await getCategoryBySlug(slug);

    return {
        title: category.name,
        description: category.description,
    };
}

export default async function CategoryPage({params}: PageProps<"/categories/[slug]">) {
    const {slug} = await params;
    const category = await getCategoryBySlug(slug);

    return (
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 p-4 text-center sm:p-8">
            <h1 className="text-2xl font-bold">{category.name}</h1>
            <p className="text-zinc-600 dark:text-zinc-400">{category.description}</p>
            <CtaLink href="/products">مشاهده همه محصولات</CtaLink>
        </main>
    );
}
