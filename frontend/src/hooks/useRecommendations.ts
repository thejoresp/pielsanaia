import { useEffect, useState } from 'react';
import { pedirRecomendaciones } from '../api/client';

interface EstadoRecomendaciones {
  recomendaciones: string[];
  descripcion: string;
  loading: boolean;
  error: boolean;
}

/**
 * Pide descripción y recomendaciones al LLM para una predicción.
 * El AbortController cancela la llamada al desmontar (y el doble montaje de
 * StrictMode en desarrollo), así no se gastan dos llamadas al LLM.
 */
export function useRecommendations(prediccion?: string): EstadoRecomendaciones {
  const [estado, setEstado] = useState<EstadoRecomendaciones>({
    recomendaciones: [],
    descripcion: '',
    loading: Boolean(prediccion),
    error: false,
  });

  useEffect(() => {
    if (!prediccion) return;
    const controller = new AbortController();
    setEstado({ recomendaciones: [], descripcion: '', loading: true, error: false });
    pedirRecomendaciones(prediccion, controller.signal)
      .then((data) =>
        setEstado({
          recomendaciones: data.recomendaciones ?? [],
          descripcion: data.descripcion ?? '',
          loading: false,
          error: false,
        })
      )
      .catch(() => {
        if (controller.signal.aborted) return;
        setEstado({ recomendaciones: [], descripcion: '', loading: false, error: true });
      });
    return () => controller.abort();
  }, [prediccion]);

  return estado;
}
