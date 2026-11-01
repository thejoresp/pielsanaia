/** Tipos de análisis que ofrece el uploader. */
export type TipoAnalisis = 'acne' | 'rosacea' | 'moles' | 'openai';

/** Respuesta de los modelos locales (/skin/api/analyze-*). */
export interface Analysis {
  filename: string;
  content_type: string;
  prediccion: string;
  probabilidades: Record<string, number>;
}

/** Respuesta del análisis con IA (/skin/openai-analizar). */
export interface AnalysisIA {
  afeccion?: string;
  descripcion?: string;
  recomendaciones?: string[];
}
