import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import type { Analysis } from '../types/analysis';
import { leerAnalisis } from '../utils/analysisStorage';
import { ArrowLeft, Thermometer, CheckCircle, AlertTriangle } from 'lucide-react';

const rosaceaDescription = 'La rosácea es una afección crónica que causa enrojecimiento y vasos sanguíneos visibles en la cara. Puede producir brotes de enrojecimiento, granos y, en casos graves, engrosamiento de la piel.';

const ResultsRosacea: React.FC = () => {
  const location = useLocation();
  // useState fija el valor: leerAnalisis devuelve un objeto nuevo en cada render
  const [analysis] = useState<Analysis | null>(
    () => (location.state?.analysis as Analysis | undefined) ?? leerAnalisis<Analysis>('rosacea')
  );
  const [recomendaciones, setRecomendaciones] = useState<string[]>([]);
  const [loadingRec, setLoadingRec] = useState(false);
  const [descripcion, setDescripcion] = useState<string>("");
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (analysis?.prediccion) {
      setLoadingRec(true);
      fetch(`${API_URL}/skin/openai-recomendaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prediccion: analysis.prediccion })
      })
        .then(res => res.json())
        .then(data => {
          setRecomendaciones(data.recomendaciones || []);
          setDescripcion(data.descripcion || "");
        })
        .catch(() => {
          setRecomendaciones([]);
          setDescripcion("");
        })
        .finally(() => setLoadingRec(false));
    }
  }, [analysis, API_URL]);

  if (!analysis) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-bold mb-4">No hay resultado disponible</h2>
        <Link to="/">Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 fade-in">
      <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <ArrowLeft className="h-5 w-5 mr-1" />
        Volver al inicio
      </Link>
      <div className="bg-white dark:bg-gray-900 shadow rounded-lg overflow-hidden">
        <div className="bg-blue-600 dark:bg-blue-700 py-6 px-6 rounded-t-lg shadow-xl border-2 border-blue-400 dark:border-blue-700">
          <div className="flex items-center space-x-4">
            <Thermometer className="h-10 w-10 text-red-500" />
            <h1 className="text-3xl font-bold text-white animate-fade-in">Afección detectada: {analysis.prediccion}</h1>
          </div>
        </div>
        <div className="p-6 bg-gray-50 dark:bg-gray-800">
          {descripcion && (
            <div className="mb-6 rounded-lg p-6 bg-red-100 dark:bg-red-900/80 border border-red-300 dark:border-red-600 shadow-lg animate-fade-in">
              <p className="text-gray-700 dark:text-red-100 text-base">{descripcion}</p>
            </div>
          )}
          {recomendaciones.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-blue-800 dark:text-blue-300">Recomendaciones</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {recomendaciones.map((rec, idx) => (
                  <div key={idx} className="flex items-start bg-green-50 dark:bg-green-900 border-l-4 border-green-400 dark:border-green-500 rounded-lg p-4 shadow-sm animate-fade-in">
                    <CheckCircle className="h-6 w-6 text-green-500 dark:text-green-300 mr-3 mt-1" />
                    <span className="text-gray-800 dark:text-green-100 text-base">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-start space-x-2 mb-6 animate-fade-in-slow">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-900 bg-yellow-100 rounded px-3 py-2 text-sm font-medium">
              <span className="font-medium">Nota importante:</span> Este análisis es preliminar y no constituye un diagnóstico médico. Siempre consulta con un dermatólogo para una evaluación profesional.
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-800 border border-blue-200 dark:border-blue-700 rounded-lg p-6 mb-6 animate-fade-in-slow">
            <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-100 mb-3">Próximos Pasos</h3>
            <p className="text-gray-700 dark:text-blue-100 mb-4">
              Para un diagnóstico preciso y un plan de tratamiento personalizado, te recomendamos consultar con un dermatólogo. Tu salud dermatológica es importante.
            </p>
            <button onClick={() => window.open('https://buenosaires.gob.ar/salud/hospitales-y-establecimientos-de-salud/turnos-en-hospitales-y-establecimientos-de-salud', '_blank', 'noopener,noreferrer')}
              className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 transition-colors text-lg font-semibold shadow">
              Encontrar Especialista
            </button>
          </div>
          <div className="text-center">
            <Link to="/" className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-400 font-medium">
              Realizar nuevo análisis
            </Link>
          </div>
        </div>
      </div>
      <style>{`
        .fade-in { animation: fadeIn 0.7s ease-in; }
        .animate-fade-in { animation: fadeIn 0.7s ease-in; }
        .animate-fade-in-slow { animation: fadeIn 1.2s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px);} to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
};

export default ResultsRosacea; 