/**
 * VegasDelRio - Servicio API: Cobros / Facturas.
 */

import { apiClient } from "@/lib/api-client";
import type {
  Bill,
  BillCreate,
  BillUpdate,
  PaginatedResponse,
} from "@/types";

export interface BillFilters {
  page?: number;
  page_size?: number;
  period_id?: string;
  status?: string;
}

export interface DashboardStats {
  total_propiedades: number;
  total_propietarios_activos: number;
  facturas_mes: number;
  facturas_pendientes: number;
}

export const billsService = {
  /** Lista facturas con paginación y filtros. */
  async list(filters: BillFilters = {}): Promise<PaginatedResponse<Bill>> {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.page_size) params.set("page_size", String(filters.page_size));
    if (filters.period_id) params.set("period_id", filters.period_id);
    if (filters.status) params.set("status", filters.status);

    const { data } = await apiClient.get<PaginatedResponse<Bill>>(
      `/billing/bills?${params.toString()}`,
    );
    return data;
  },

  /** Obtiene una factura por ID con sus items. */
  async get(id: string): Promise<Bill> {
    const { data } = await apiClient.get<Bill>(`/billing/bills/${id}`);
    return data;
  },

  /** Crea una factura individual. */
  async create(payload: BillCreate): Promise<Bill> {
    const { data } = await apiClient.post<Bill>("/billing/bills", payload);
    return data;
  },

  /** Actualiza el estado o notas de una factura. */
  async update(id: string, payload: BillUpdate): Promise<Bill> {
    const { data } = await apiClient.put<Bill>(
      `/billing/bills/${id}`,
      payload,
    );
    return data;
  },

  /** Obtiene estadísticas para el dashboard. */
  async getDashboardStats(): Promise<DashboardStats> {
    const { data } = await apiClient.get<DashboardStats>(
      "/billing/dashboard-stats",
    );
    return data;
  },
};
