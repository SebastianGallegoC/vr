/**
 * VegasDelRio - Tipos TypeScript.
 *
 * Definiciones de tipos que reflejan los esquemas Pydantic del backend.
 * Mantener sincronizados con app/schemas/ del backend.
 */

// ============================================================
// Owner (Propietario)
// ============================================================

export interface Owner {
  id: string;
  full_name: string;
  id_type: string;
  id_number: string;
  email: string;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OwnerCreate {
  full_name: string;
  id_type?: string;
  id_number: string;
  email: string;
  phone?: string | null;
  notes?: string | null;
}

export interface OwnerUpdate {
  full_name?: string;
  id_type?: string;
  id_number?: string;
  email?: string;
  phone?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

// ============================================================
// Property (Casa)
// ============================================================

export interface Property {
  id: string;
  house_number: string;
  address: string | null;
  area_m2: number | null;
  aliquot: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropertyCreate {
  house_number: string;
  address?: string | null;
  area_m2?: number | null;
  aliquot?: number | null;
  notes?: string | null;
}

export interface PropertyUpdate {
  house_number?: string;
  address?: string | null;
  area_m2?: number | null;
  aliquot?: number | null;
  notes?: string | null;
  is_active?: boolean;
}

// ============================================================
// Billing Period (Periodo de Facturación)
// ============================================================

export type PeriodStatus = "open" | "closed" | "cancelled";

export interface BillingPeriod {
  id: string;
  month: number;
  year: number;
  description: string;
  base_amount: number;
  due_date: string;
  status: PeriodStatus;
  created_at: string;
  updated_at: string;
}

export interface BillingPeriodCreate {
  month: number;
  year: number;
  description: string;
  base_amount: number;
  due_date: string;
}

// ============================================================
// Bill (Factura/Cobro)
// ============================================================

export type BillStatus =
  | "draft"
  | "pending"
  | "paid"
  | "overdue"
  | "cancelled";

export interface BillItem {
  id: string;
  concept: string;
  description: string | null;
  amount: number;
  created_at: string;
}

export interface Bill {
  id: string;
  bill_number: string;
  property_id: string;
  billing_period_id: string;
  owner_id: string;
  total_amount: number;
  status: BillStatus;
  pdf_url: string | null;
  notes: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  items: BillItem[];
}

// ============================================================
// Notification Log
// ============================================================

export type NotificationChannel = "email" | "whatsapp" | "telegram" | "sms";
export type NotificationStatus = "pending" | "sent" | "delivered" | "failed";

export interface NotificationLog {
  id: string;
  bill_id: string;
  channel: NotificationChannel;
  recipient: string;
  status: NotificationStatus;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

// ============================================================
// Respuestas Paginadas
// ============================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ============================================================
// Generación Masiva
// ============================================================

export interface GenerateBillsRequest {
  billing_period_id: string;
  send_notifications?: boolean;
}

export interface GenerateBillsResponse {
  task_id: string;
  message: string;
  bills_to_generate: number;
}
