/**
 * VegasDelRio - Servicio API: Propiedades (Casas).
 */

import { apiClient } from "@/lib/api-client";
import type { Property, PropertyCreate, PropertyUpdate } from "@/types";

export interface PropertyListResponse {
  items: Property[];
  total: number;
  page: number;
  page_size: number;
}

export interface PropertyFilters {
  page?: number;
  page_size?: number;
  search?: string;
  activo?: boolean;
}

export const propertiesService = {
  /** Lista casas con paginación y filtros opcionales. */
  async list(filters: PropertyFilters = {}): Promise<PropertyListResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.page_size) params.set("page_size", String(filters.page_size));
    if (filters.search) params.set("search", filters.search);
    if (filters.activo !== undefined)
      params.set("activo", String(filters.activo));

    const { data } = await apiClient.get<PropertyListResponse>(
      `/properties?${params.toString()}`
    );
    return data;
  },

  /** Obtiene una propiedad por ID. */
  async get(id: string): Promise<Property> {
    const { data } = await apiClient.get<Property>(`/properties/${id}`);
    return data;
  },

  /** Crea una nueva propiedad. */
  async create(payload: PropertyCreate): Promise<Property> {
    const { data } = await apiClient.post<Property>("/properties", payload);
    return data;
  },

  /** Actualiza una propiedad existente. */
  async update(id: string, payload: PropertyUpdate): Promise<Property> {
    const { data } = await apiClient.put<Property>(
      `/properties/${id}`,
      payload
    );
    return data;
  },

  /** Desactiva (soft delete) una propiedad. */
  async deactivate(id: string): Promise<Property> {
    return propertiesService.update(id, { activo: false });
  },

  /** Reactiva una propiedad. */
  async activate(id: string): Promise<Property> {
    return propertiesService.update(id, { activo: true });
  },

  /** Asigna un propietario principal a una casa. */
  async assignOwner(propertyId: string, ownerId: string): Promise<void> {
    await apiClient.post(`/properties/${propertyId}/owner`, {
      propietario_id: ownerId,
    });
  },

  /** Desasocia el propietario principal de una casa. */
  async removeOwner(propertyId: string): Promise<void> {
    await apiClient.delete(`/properties/${propertyId}/owner`);
  },
};
