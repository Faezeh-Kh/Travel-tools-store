import {getCategories} from "@/lib/api/categories";
import {getProducts} from "@/lib/api/products";
import {HeroBanner} from "@/components/home/HeroBanner";
import {CategoriesSection} from "@/components/home/CategoriesSection";
import {ProductsSection} from "@/components/home/ProductsSection";
import {TrustSection} from "@/components/home/TrustSection";
import {connection} from "next/server";

// Divisible by every column count of the ProductsSection grid (2, 3, 4, 6), so each row is full at
// every breakpoint. Change both together.
const FEATURED_PRODUCT_COUNT = 12;

export default async function Home() {
    // Render per request: otherwise this page is prerendered at build time,
    // freezing the catalog and requiring the API during next build.
    await connection();

    const [categories, {items: featuredProducts}] = await Promise.all([
        getCategories(),
        getProducts({size: FEATURED_PRODUCT_COUNT}),
    ]);

    return (
        <main className="flex flex-1 flex-col">
            <HeroBanner />
            <CategoriesSection categories={categories} />
            <ProductsSection products={featuredProducts} />
            <TrustSection />
        </main>
    );
}
