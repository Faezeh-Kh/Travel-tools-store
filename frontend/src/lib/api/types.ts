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
  productSlug: string;
  primaryImage: string | null;
  sku: string;
  attributes: Record<string, string>;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  stockQuantity: number;
};

export type Cart = {
  id: string | null;
  items: CartItem[];
  subtotal: number;
  totalPrice: number;
};

// The body of POST /api/orders. The backend trims every field and normalizes Persian/Arabic digits in
// phoneNumber/postalCode, so the form can send what the shopper typed.
export type PlaceOrderRequest = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  city: string;
  postalCode: string;
  notes: string;
};

export type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";

// Purchase-time snapshot: these values never change after checkout, even if the product does.
export type OrderItem = {
  productName: string;
  variantDescription: string;
  productImage: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type Order = {
  orderNumber: string;
  accessToken: string;
  status: OrderStatus;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  city: string;
  postalCode: string;
  notes: string | null;
  items: OrderItem[];
  totalPrice: number;
  createdAt: string;
};

// One entry of the backend's `fieldErrors` array on a 400 VALIDATION_ERROR response.
export type FieldError = {
  field: string;
  message: string;
};
