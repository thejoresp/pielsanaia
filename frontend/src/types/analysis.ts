/** Tipos de análisis que ofrece el uploader. */
export type TipoAnalisis = 'acne' | 'rosacea' | 'moles' | 'ia';

/** Respuesta de los modelos locales (/skin/api/analyze-*). */
export interface Analysis {
  filename: string;
  content_type: string;
  prediccion: string;
  probabilidades: Record<string, number>;
}

/** Respuesta del análisis con IA (/skin/api/analyze-ia). */
export interface AnalysisIA {
  afeccion?: string;
  descripcion?: string;
  recomendaciones?: string[];
}

/** Respuesta de las recomendaciones del LLM (/skin/api/recomendaciones). */
export interface Recomendaciones {
  descripcion?: string;
  recomendaciones?: string[];
}
