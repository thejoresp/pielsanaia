import React from 'react';
import { Link } from 'react-router-dom';
import { CONDITIONS } from '../data/conditions';

const skinConditions = Object.values(CONDITIONS);

const ConditionsOverview: React.FC = () => {
  return (
    <div className="py-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Condiciones Comunes de la Piel</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        {skinConditions.map((condition) => (
          <Link 
            key={condition.id}
            to={`/conditions/${condition.id}`}
            className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            <div className="h-48 overflow-hidden">
              <img 
                src={condition.image} 
                alt={condition.title}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
            <div className="p-5">
              <div className="flex items-center mb-2">
                <div className="text-blue-600 mr-2">
                  <condition.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{condition.title}</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">{condition.summary}</p>
              <div className="mt-4 text-blue-600 font-medium flex items-center">
                Más información
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      <div className="mt-12 bg-blue-50 dark:bg-gray-700 rounded-xl p-6 border border-blue-100 dark:border-gray-700">
        <div className="flex items-center justify-center text-blue-800 dark:text-blue-200 mb-4">
          <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold">¿Tienes una preocupación específica?</h3>
        </div>
        <p className="text-blue-700 dark:text-gray-200 text-center">
          Consulta con un dermatólogo profesional para un diagnóstico preciso.
        </p>
        <div className="mt-4 flex justify-center">
          <button onClick={() => window.open('https://buenosaires.gob.ar/salud/hospitales-y-establecimientos-de-salud/turnos-en-hospitales-y-establecimientos-de-salud', '_blank', 'noopener,noreferrer')} 
          className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium">
            Más Info
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConditionsOverview;