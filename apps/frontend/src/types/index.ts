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
  nombre_completo: string;
  tipo_documento: string;
  numero_documento: string;
  correos: string[];
  telefonos: string[];
  notas: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
  casa_actual: OwnerCurrentPropertyInfo | null;
}

export interface OwnerCurrentPropertyInfo {
  propiedad_id: string;
  numero_casa: string;
}

export interface OwnerCreate {
  nombre_completo: string;
  tipo_documento?: string;
  numero_documento: string;
  correos: string[];
  telefonos?: string[];
  notas?: string | null;
}

export interface OwnerUpdate {
  nombre_completo?: string;
  tipo_documento?: string;
  numero_documento?: string;
  correos?: string[];
  telefonos?: string[];
  notas?: string | null;
  activo?: boolean;
}

// ============================================================
// Property (Casa)
// ============================================================

export interface Property {
  id: string;
  numero_casa: string;
  direccion: string | null;
  area_m2: number | null;
  alicuota: number | null;
  notas: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
  propietario_actual: CurrentOwnerInfo | null;
}

export interface CurrentOwnerInfo {
  propietario_id: string;
  nombre_completo: string;
  numero_documento: string;
}

export interface PropertyCreate {
  numero_casa: string;
  direccion?: string | null;
  area_m2?: number | null;
  alicuota?: number | null;
  notas?: string | null;
}

export interface PropertyUpdate {
  numero_casa?: string;
  direccion?: string | null;
  area_m2?: number | null;
  alicuota?: number | null;
  notas?: string | null;
  activo?: boolean;
}

// ============================================================
// Billing Period (Periodo de Facturación)
// ============================================================

export type PeriodStatus = "open" | "closed" | "cancelled";

export interface BillingPeriod {
  id: string;
  mes: number;
  anio: number;
  descripcion: string;
  monto_base: number;
  fecha_vencimiento: string;
  recargo_mora: number;
  estado: PeriodStatus;
  creado_en: string;
  actualizado_en: string;
}

export interface BillingPeriodCreate {
  mes: number;
  anio: number;
  descripcion: string;
  monto_base: number;
  fecha_vencimiento: string;
  recargo_mora?: number;
}

export interface BillingPeriodUpdate {
  descripcion?: string;
  monto_base?: number;
  fecha_vencimiento?: string;
  recargo_mora?: number;
  estado?: PeriodStatus;
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
  concepto: string;
  descripcion: string | null;
  monto: number;
  creado_en: string;
}

export interface Bill {
  id: string;
  numero_factura: string;
  propiedad_id: string;
  periodo_facturacion_id: string;
  propietario_id: string;
  monto_total: number;
  estado: BillStatus;
  url_pdf: string | null;
  notas: string | null;
  enviado_en: string | null;
  pagado_en: string | null;
  creado_en: string;
  actualizado_en: string;
  items: BillItem[];

  // Campos embebidos del backend para evitar lookups adicionales
  numero_casa: string | null;
  nombre_propietario: string | null;
  periodo_descripcion: string | null;
}

export interface BillItemCreate {
  concepto: string;
  descripcion?: string | null;
  monto: number;
}

export interface BillCreate {
  propiedad_id: string;
  periodo_facturacion_id: string;
  propietario_id: string;
  notas?: string | null;
  items: BillItemCreate[];
}

export interface BillUpdate {
  estado?: BillStatus;
  notas?: string | null;
  pagado_en?: string | null;
}

// ============================================================
// Notification Log
// ============================================================

export type NotificationChannel = "email" | "whatsapp" | "telegram" | "sms";
export type NotificationStatus = "pending" | "sent" | "delivered" | "failed";

export interface NotificationLog {
  id: string;
  factura_id: string;
  canal: NotificationChannel;
  destinatario: string;
  estado: NotificationStatus;
  mensaje_error: string | null;
  enviado_en: string | null;
  creado_en: string;
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
  periodo_facturacion_id: string;
  enviar_notificaciones?: boolean;
}

export interface GenerateBillsResponse {
  facturas_generadas: number;
  facturas_omitidas: number;
  mensaje: string;
  errores: string[];
}

export interface SendEmailsResponse {
  total_facturas: number;
  emails_enviados: number;
  emails_fallidos: number;
  errores: string[];
}

// ============================================================
// Portal de Propietarios
// ============================================================

export interface PortalOwnerInfo {
  id: string;
  nombre_completo: string;
  email: string;
}

export interface PortalPropertyInfo {
  id: string;
  numero_casa: string;
}

export interface PortalLoginResponse {
  access_token: string;
  token_type: string;
  propietario: PortalOwnerInfo;
  propiedad: PortalPropertyInfo;
}

export interface PortalProfile {
  propietario: PortalOwnerInfo;
  propiedad: PortalPropertyInfo;
}

export interface PortalBillItem {
  concepto: string;
  descripcion: string | null;
  monto: number;
}

export interface PortalBill {
  id: string;
  numero_factura: string;
  monto_total: number;
  estado: BillStatus;
  notas: string | null;
  pagado_en: string | null;
  creado_en: string;
  periodo_descripcion: string | null;
  items: PortalBillItem[];
}
