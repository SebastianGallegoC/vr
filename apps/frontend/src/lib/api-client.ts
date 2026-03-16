/**
 * VegasDelRio - Cliente API (Axios).
 *
 * Instancia preconfigurada de Axios para comunicarse con el backend FastAPI.
 * Incluye interceptores para agregar tokens de autenticación automáticamente.
 * El token JWT se cachea en memoria y se actualiza vía onAuthStateChange
 * desde el AuthProvider, evitando llamadas async a getSession() por request.
 */

import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Token cacheado en memoria — actualizado por AuthProvider
let cachedToken: string | null = null;

export function setAuthToken(token: string | null) {
  cachedToken = token;
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// ---- Interceptor: Agregar token JWT cacheado (sync, sin await) ----
apiClient.interceptors.request.use(
  (config) => {
    if (cachedToken) {
      config.headers.Authorization = `Bearer ${cachedToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ---- Interceptor: Manejar errores de respuesta ----
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      cachedToken = null;
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
