import {getCategories} from "@/lib/api/categories";
import {getProducts} from "@/lib/api/products";
import {HeroBanner} from "@/components/home/HeroBanner";
import {CategoriesSection} from "@/components/home/CategoriesSection";
import {ProductsSection} from "@/components/home/ProductsSection";
import {TrustSection} from "@/components/home/TrustSection";

const FEATURED_PRODUCT_COUNT = 8;

export default async function Home() {
    const [categories, products] = await Promise.all([getCategories(), getProducts()]);
    const featuredProducts = products.slice(0, FEATURED_PRODUCT_COUNT);

    return (
        <main className="flex flex-1 flex-col">
            <HeroBanner />
            <CategoriesSection categories={categories} />
            <ProductsSection products={featuredProducts} />
            <TrustSection />
        </main>
    );
}
