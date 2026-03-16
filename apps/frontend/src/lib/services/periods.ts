/**
 * VegasDelRio - Servicio API: Periodos de Facturación.
 */

import { apiClient } from "@/lib/api-client";
import type {
  BillingPeriod,
  BillingPeriodCreate,
  BillingPeriodUpdate,
  GenerateBillsResponse,
  SendEmailsResponse,
} from "@/types";

export interface PeriodFilters {
  year?: number;
}

export const periodsService = {
  /** Lista periodos de facturación con filtro opcional por año. */
  async list(filters: PeriodFilters = {}): Promise<BillingPeriod[]> {
    const params = new URLSearchParams();
    if (filters.year) params.set("year", String(filters.year));

    const { data } = await apiClient.get<BillingPeriod[]>(
      `/billing/periods?${params.toString()}`,
    );
    return data;
  },

  /** Crea un nuevo periodo de facturación. */
  async create(payload: BillingPeriodCreate): Promise<BillingPeriod> {
    const { data } = await apiClient.post<BillingPeriod>(
      "/billing/periods",
      payload,
    );
    return data;
  },

  /** Actualiza un periodo de facturación existente. */
  async update(
    id: string,
    payload: BillingPeriodUpdate,
  ): Promise<BillingPeriod> {
    const { data } = await apiClient.put<BillingPeriod>(
      `/billing/periods/${id}`,
      payload,
    );
    return data;
  },

  /** Envía por email las facturas de un periodo a los propietarios. */
  async sendEmails(periodId: string): Promise<SendEmailsResponse> {
    const { data } = await apiClient.post<SendEmailsResponse>(
      `/billing/periods/${periodId}/send-emails`,
    );
    return data;
  },

  /** Genera facturas masivas para todas las casas activas de un periodo. */
  async generateBills(periodId: string): Promise<GenerateBillsResponse> {
    const { data } = await apiClient.post<GenerateBillsResponse>(
      "/billing/generate",
      { periodo_facturacion_id: periodId },
    );
    return data;
  },
};
