/**
 * Telegram Stars Payment API Client
 *
 * Telegram Stars(XTR)를 사용한 TeleMon 프리미엄 결제 연동.
 */

import { request } from "@/lib/api";

export interface StarProduct {
  id: string;
  title: string;
  description: string;
  star_amount: number;
  plan: string | null;
  period_days: number | null;
  ai_calls: number | null;
  label: string;
}

export interface ProductsResponse {
  products: StarProduct[];
}

export interface InvoiceResponse {
  ok: boolean;
  invoice_id: string;
  product_id: string;
  star_amount: number;
}

/** 결제 가능한 상품 목록 조회 */
export async function fetchStarProducts(): Promise<StarProduct[]> {
  const res = await request<ProductsResponse>("/api/stars/products");
  return res.products;
}

/** Stars 인보이스 생성 및 전송 */
export async function createStarInvoice(productId: string): Promise<InvoiceResponse> {
  return request<InvoiceResponse>(`/api/stars/create-invoice`, {
    method: "POST",
    body: JSON.stringify({ product_id: productId }),
  });
}
