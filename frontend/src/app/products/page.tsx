import {getProducts} from "@/lib/api/products";
import {ProductCard} from "@/components/ProductCard";

export default async function ProductsPage() {
    const products = await getProducts();

    return (
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-8">
            <h1 className="text-2xl font-bold">محصولات</h1>
            {products.length === 0 ? (
                <p className="text-zinc-500">در حال حاضر محصولی برای نمایش وجود ندارد.</p>
            ) : (
                <ul className="grid list-none grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {products.map((product) => (
                        <li key={product.id}>
                            <ProductCard product={product} />
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
