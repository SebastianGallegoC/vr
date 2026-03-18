/**
 * VegasDelRio - Cliente API del Portal de Propietarios.
 *
 * Instancia de Axios separada del admin. Usa JWT propio (HS256)
 * almacenado en localStorage en lugar de Supabase Auth.
 */

import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const PORTAL_TOKEN_KEY = "portal_token";
const PORTAL_PROFILE_KEY = "portal_profile";

export function getPortalToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PORTAL_TOKEN_KEY);
}

export function setPortalToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(PORTAL_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(PORTAL_TOKEN_KEY);
    localStorage.removeItem(PORTAL_PROFILE_KEY);
  }
}

export function getPortalProfile<T>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PORTAL_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(PORTAL_PROFILE_KEY);
    return null;
  }
}

export function setPortalProfile(profile: unknown) {
  if (typeof window === "undefined") return;
  if (profile) {
    localStorage.setItem(PORTAL_PROFILE_KEY, JSON.stringify(profile));
  } else {
    localStorage.removeItem(PORTAL_PROFILE_KEY);
  }
}

export const portalClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// ---- Interceptor: Agregar token del portal ----
portalClient.interceptors.request.use((config) => {
  const token = getPortalToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- Interceptor: 401 → redirect a /portal/login ----
portalClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      setPortalToken(null);
      window.location.href = "/portal/login";
    }
    return Promise.reject(error);
  },
);
