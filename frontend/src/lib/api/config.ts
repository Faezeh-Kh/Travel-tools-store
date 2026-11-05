export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

// Separate from API_BASE_URL: this one is read by browser code (cart mutations run client-side, unlike
// every other API call in this project, which runs server-side in Server Components). Next.js only
// inlines NEXT_PUBLIC_-prefixed env vars into the client bundle, so API_BASE_URL alone would be
// undefined in the browser.
// NOTE: An empty value means same origin (production, behind the reverse proxy): requests go to relative /api/... paths.
// Keep ??: || would replace "" with the localhost fallback.
export const PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
