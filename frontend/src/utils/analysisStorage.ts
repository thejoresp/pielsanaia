import type { TipoAnalisis } from '../types/analysis';

// Respaldo en sessionStorage para que el resultado sobreviva a una recarga de la página.
const clave = (tipo: TipoAnalisis) => `pielsana:analisis:${tipo}`;

export function guardarAnalisis(tipo: TipoAnalisis, data: unknown): void {
  try {
    sessionStorage.setItem(clave(tipo), JSON.stringify(data));
  } catch {
    /* storage no disponible (modo privado, cuota): no es crítico */
  }
}

export function leerAnalisis<T>(tipo: TipoAnalisis): T | null {
  try {
    const raw = sessionStorage.getItem(clave(tipo));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
