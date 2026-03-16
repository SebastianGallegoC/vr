/**
 * VegasDelRio - Servicio API: Propietarios.
 */

import { apiClient } from "@/lib/api-client";
import type { Owner, OwnerCreate, OwnerUpdate } from "@/types";

export interface OwnerListResponse {
  items: Owner[];
  total: number;
  page: number;
  page_size: number;
}

export interface OwnerFilters {
  page?: number;
  page_size?: number;
  search?: string;
  activo?: boolean;
  sin_propiedad?: boolean;
}

export const ownersService = {
  /** Lista propietarios con paginación y filtros opcionales. */
  async list(filters: OwnerFilters = {}): Promise<OwnerListResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.page_size) params.set("page_size", String(filters.page_size));
    if (filters.search) params.set("search", filters.search);
    if (filters.activo !== undefined)
      params.set("activo", String(filters.activo));
    if (filters.sin_propiedad !== undefined)
      params.set("sin_propiedad", String(filters.sin_propiedad));

    const { data } = await apiClient.get<OwnerListResponse>(
      `/owners?${params.toString()}`
    );
    return data;
  },

  /** Obtiene un propietario por ID. */
  async get(id: string): Promise<Owner> {
    const { data } = await apiClient.get<Owner>(`/owners/${id}`);
    return data;
  },

  /** Crea un nuevo propietario. */
  async create(payload: OwnerCreate): Promise<Owner> {
    const { data } = await apiClient.post<Owner>("/owners", payload);
    return data;
  },

  /** Actualiza un propietario existente. */
  async update(id: string, payload: OwnerUpdate): Promise<Owner> {
    const { data } = await apiClient.put<Owner>(`/owners/${id}`, payload);
    return data;
  },

  /** Desactiva (soft delete) un propietario. */
  async deactivate(id: string): Promise<Owner> {
    return ownersService.update(id, { activo: false });
  },

  /** Reactiva un propietario. */
  async activate(id: string): Promise<Owner> {
    return ownersService.update(id, { activo: true });
  },
};
