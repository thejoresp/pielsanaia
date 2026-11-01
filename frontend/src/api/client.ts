import type { Recomendaciones } from '../types/analysis';

// Cliente único del backend: todas las llamadas del front pasan por acá.
export const API_URL: string = import.meta.env.VITE_API_URL ?? '';

export const ENDPOINTS = {
  acne: '/skin/api/analyze-acne',
  rosacea: '/skin/api/analyze-rosacea',
  lunares: '/skin/api/analyze-lunares',
  ia: '/skin/api/analyze-ia',
  recomendaciones: '/skin/api/recomendaciones',
} as const;

/** Error HTTP del backend; `status` permite elegir el mensaje para el usuario. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

async function post<T>(endpoint: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', ...init });
  if (!res.ok) throw new ApiError(res.status);
  return res.json() as Promise<T>;
}

/** Envía la imagen a un endpoint de análisis (multipart `file`). */
export function analizarImagen<T>(endpoint: string, file: File): Promise<T> {
  const body = new FormData();
  body.append('file', file);
  return post<T>(endpoint, { body });
}

/** Pide al LLM descripción y recomendaciones para una predicción del modelo local. */
export function pedirRecomendaciones(prediccion: string, signal?: AbortSignal): Promise<Recomendaciones> {
  return post<Recomendaciones>(ENDPOINTS.recomendaciones, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prediccion }),
    signal,
  });
}
