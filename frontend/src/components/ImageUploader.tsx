import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, X, Image as ImageIcon, CheckCircle } from 'lucide-react';
import type { TipoAnalisis } from '../types/analysis';
import { guardarAnalisis } from '../utils/analysisStorage';
import { ApiError, ENDPOINTS, analizarImagen } from '../api/client';

const MAX_IMAGE_MB = 5;

// Endpoint del backend y ruta de resultados de cada tipo de análisis
const ANALISIS: Record<TipoAnalisis, { endpoint: string; ruta: string }> = {
  acne: { endpoint: ENDPOINTS.acne, ruta: '/results-acne' },
  rosacea: { endpoint: ENDPOINTS.rosacea, ruta: '/results-rosacea' },
  moles: { endpoint: ENDPOINTS.lunares, ruta: '/results-lunares' },
  ia: { endpoint: ENDPOINTS.ia, ruta: '/results-ia' },
};

const mensajeDeError = (status: number): string => {
  if (status === 413) return `La imagen es demasiado grande (máximo ${MAX_IMAGE_MB} MB).`;
  if (status === 429) return 'Hiciste demasiadas solicitudes. Espera un minuto e intenta de nuevo.';
  if (status === 503) return 'El servicio de IA no está disponible en este momento. Intenta más tarde.';
  if (status === 400) return 'El archivo debe ser una imagen.';
  return 'Error al analizar la imagen. Intenta nuevamente.';
};

const ConsentModal: React.FC<{ onAccept: () => void; onClose: () => void }> = ({ onAccept, onClose }) => {
  const [checked, setChecked] = useState(false);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Consentimiento</h2>
          <div className="prose prose-sm dark:text-gray-200">
            <h3 className="text-lg font-semibold mb-2">📄 Consentimiento Informado para el Tratamiento de Datos Faciales</h3>
            <p>
              Piel Sana IA te informa que, para poder analizar tu imagen, necesitamos tu consentimiento para el tratamiento de datos personales sensibles, conforme a la Ley N.º 25.326 de Protección de Datos Personales y normativa aplicable.
            </p>
            <h4 className="font-semibold mt-4 mb-2">¿Para qué se usan tus datos?</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Promover el bienestar, autocuidado y prevención de problemas dermatológicos.</li>
              <li>Brindar información orientativa sobre el estado de tu piel y posibles condiciones frecuentes.</li>
              <li>Facilitar el acceso a herramientas de salud para todas las personas, sin distinción.</li>
            </ul>
            <h4 className="font-semibold mt-4 mb-2">¿Qué datos se procesan?</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Imágenes faciales que subas para el análisis.</li>
              <li>Datos derivados de la imagen (resultados automáticos del análisis).</li>
            </ul>
            <h4 className="font-semibold mt-4 mb-2">Privacidad y Seguridad</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Tus imágenes se procesan solo para el análisis y se eliminan inmediatamente después.</li>
              <li>No se almacenan datos personales ni se comparten con terceros.</li>
              <li>Se aplican medidas de seguridad para proteger tu información.</li>
            </ul>
            <h4 className="font-semibold mt-4 mb-2">Tus derechos</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Puedes solicitar acceso, rectificación, actualización, cancelación u oposición al tratamiento de tus datos escribiendo a <a href="mailto:contacto@pielsanaia.click">contacto@pielsanaia.click</a>.</li>
            </ul>
            <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="font-medium text-gray-700 dark:text-gray-200">
                Al aceptar, confirmas que has leído y comprendido la información anterior, y prestas tu consentimiento libre, expreso e informado para el tratamiento temporal de tus datos sensibles en los términos expuestos.
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center">
            <input
              id="consent-check"
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="consent-check" className="text-gray-800 dark:text-gray-200 text-sm select-none">
              He leído y acepto el consentimiento informado para el tratamiento de mis datos sensibles.
            </label>
          </div>
          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={onAccept}
              className={`px-4 py-2 rounded-md text-white ${checked ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'}`}
              disabled={!checked}
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const analysisTypes: { key: TipoAnalisis; label: string; image: string; description: string }[] = [
  {
    key: 'acne',
    label: 'Acné',
    image: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&w=400',
    description: 'Detección y análisis de lesiones acneicas.',
  },
  {
    key: 'rosacea',
    label: 'Rosácea',
    image: 'https://images.pexels.com/photos/1138531/pexels-photo-1138531.jpeg?auto=compress&w=400',
    description: 'Identificación de enrojecimiento y vasos sanguíneos.',
  },
  {
    key: 'moles',
    label: 'Lunares',
    image: 'https://images.pexels.com/photos/1115128/pexels-photo-1115128.jpeg?auto=compress&w=400',
    description: 'Análisis de lunares y lesiones atípicas.',
  },
  {
    key: 'ia',
    label: 'Detectar Condición',
    image: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&w=400',
    description: 'Analiza tu imagen con IA avanzada y detecta automáticamente el tipo de problema de piel.',
  }
];

const ImageUploader: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisType, setAnalysisType] = useState<TipoAnalisis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Valida y carga la imagen (la usan el input de archivo y el drag & drop)
  const procesarArchivo = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor sube una imagen válida');
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      alert(`La imagen supera el máximo de ${MAX_IMAGE_MB} MB`);
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target && typeof ev.target.result === 'string') {
        setImage(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && analysisType && consentAccepted) {
      procesarArchivo(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      procesarArchivo(file);
    }
  };

  const handleConsentAccept = () => {
    setShowConsent(false);
    setConsentAccepted(true);
  };

  const handleRemoveImage = () => {
    setImage(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile || !analysisType) return;
    setIsAnalyzing(true);
    const { endpoint, ruta } = ANALISIS[analysisType];

    try {
      const data = await analizarImagen<unknown>(endpoint, selectedFile);
      guardarAnalisis(analysisType, data);
      navigate(ruta, { state: { analysis: data } });
    } catch (err) {
      // 0 = error de red (sin respuesta del servidor)
      alert(mensajeDeError(err instanceof ApiError ? err.status : 0));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl shadow-md">
      {showConsent && (
        <ConsentModal 
          onAccept={handleConsentAccept}
          onClose={() => {
            setShowConsent(false);
            setConsentAccepted(false);
          }}
        />
      )}
      
      <div className="flex items-center text-blue-600 mb-4 justify-center">
        <ImageIcon className="h-6 w-6 mr-2" />
        <h2 className="text-xl font-semibold text-center">Análisis de Imagen</h2>
      </div>
      
      {!image && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 text-gray-800 text-center">Selecciona el tipo de análisis que deseas realizar</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-6">
            {analysisTypes.map((type) => (
              <button
                key={type.key}
                type="button"
                onClick={() => {
                  setAnalysisType(type.key);
                  setShowConsent(true);
                  setConsentAccepted(false);
                }}
                className={`relative flex flex-col items-start h-full bg-white dark:bg-gray-800 border rounded-xl shadow-sm transition-all duration-300 ease-in-out focus:outline-none overflow-hidden text-left
                  ${analysisType === type.key ? 'border-blue-500 ring-2 ring-blue-400 shadow-xl scale-105' : 'border-gray-200 hover:border-blue-300 hover:shadow-lg hover:scale-102'}
                  focus:ring-2 focus:ring-blue-300`}
                tabIndex={0}
                style={{ boxShadow: analysisType === type.key ? '0 4px 24px 0 rgba(37, 99, 235, 0.10)' : undefined }}
              >
                {analysisType === type.key && (
                  <span className="absolute top-2 right-2 z-10 text-blue-500 transition-opacity duration-300 ease-in-out">
                    <CheckCircle className="h-6 w-6" />
                  </span>
                )}
                <div className="p-6 flex-1 flex flex-col w-full">
                  <span className="text-blue-700 font-semibold text-lg mb-1 dark:text-blue-300">{type.label}</span>
                  <span className="text-gray-600 dark:text-gray-300 text-sm mb-2 flex-1">{type.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {!image ? (
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center ${
            isDragging ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
          } transition-colors duration-200`}
          onDragOver={consentAccepted ? handleDragOver : undefined}
          onDragLeave={consentAccepted ? handleDragLeave : undefined}
          onDrop={consentAccepted ? handleDrop : undefined}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">Sube una foto de tu piel</p>
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">Arrastra y suelta o haz clic para seleccionar</p>
          
          <div className="mt-6">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={consentAccepted ? handleFileInput : undefined}
              ref={fileInputRef}
              disabled={!analysisType || !consentAccepted}
            />
            <button
              type="button"
              onClick={() => analysisType && consentAccepted && fileInputRef.current?.click()}
              className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                analysisType && consentAccepted ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              disabled={!analysisType || !consentAccepted}
            >
              <Camera className="h-5 w-5 mr-2" />
              Seleccionar Imagen
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={image}
              alt="Imagen para análisis"
              className="mx-auto max-h-80 rounded-lg object-contain"
            />
            <button
              className="absolute top-2 right-2 flex items-center justify-center w-10 h-10 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-full shadow hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors focus:outline-none"
              title="Eliminar imagen"
              onClick={handleRemoveImage}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
                isAnalyzing ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200`}
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white\" xmlns="http://www.w3.org/2000/svg\" fill="none\" viewBox="0 0 24 24">
                    <circle className="opacity-25\" cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analizando...
                </>
              ) : (
                'Analizar Imagen'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;