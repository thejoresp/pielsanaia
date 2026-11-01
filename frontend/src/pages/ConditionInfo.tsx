import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getCondition } from '../data/conditions';

const ConditionInfo: React.FC = () => {
  const { condition } = useParams<{ condition: string }>();
  const data = getCondition(condition);

  if (!data) return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8 text-center">
      <h2 className="text-2xl font-bold text-gray-900">Condición no encontrada</h2>
      <p className="mt-2 text-gray-600">La información sobre esta condición no está disponible.</p>
      <Link to="/" className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800">
        <ArrowLeft className="h-5 w-5 mr-1" />
        Volver al inicio
      </Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <ArrowLeft className="h-5 w-5 mr-1" />
        Volver al inicio
      </Link>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="h-64 overflow-hidden">
          <img 
            src={data.image} 
            alt={data.title} 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">{data.title}</h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">{data.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Causas</h2>
              <ul className="space-y-2">
                {data.causes.map((cause, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mr-3 flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-gray-600 dark:text-gray-300">{cause}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Síntomas</h2>
              <ul className="space-y-2">
                {data.symptoms.map((symptom, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-300">{symptom}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Tratamiento</h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-700 mb-6">
              <ul className="space-y-2">
                {data.treatment.map((treatment, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-200">{treatment}</span>
                  </li>
                ))}
              </ul>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Prevención</h2>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-100 dark:border-green-700">
              <ul className="space-y-2">
                {data.prevention.map((prevention, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="h-5 w-5 text-green-600 dark:text-green-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-200">{prevention}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <svg className="h-6 w-6 text-yellow-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Importante</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              La información proporcionada es de carácter general y educativo. Siempre consulta con un dermatólogo 
              profesional para un diagnóstico preciso y un plan de tratamiento personalizado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConditionInfo;