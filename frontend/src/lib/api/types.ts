export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
};

export type ProductSummary = {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  primaryImage: string | null;
  minPrice: number | null;
  maxPrice: number | null;
};

export type ProductVariant = {
  id: number;
  sku: string;
  attributes: Record<string, string>;
  price: number;
  stockQuantity: number;
};

export type ProductDetail = {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  images: string[];
  specifications: Record<string, string>;
  categoryName: string;
  categorySlug: string;
  variants: ProductVariant[];
};
