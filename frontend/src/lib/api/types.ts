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

export const PRODUCT_SORT_VALUES = ["price-asc", "price-desc", "newest"] as const;

export type ProductSort = (typeof PRODUCT_SORT_VALUES)[number];

export type PageResponse<T> = {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type ProductSearchParams = {
  search?: string;
  category?: string;
  inStock?: boolean;
  sort?: ProductSort;
  page?: number;
  size?: number;
};

export type CartItem = {
  id: number;
  productVariantId: number;
  productName: string;
  sku: string;
  attributes: Record<string, string>;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
};

export type Cart = {
  id: string | null;
  items: CartItem[];
  subtotal: number;
  totalPrice: number;
};
