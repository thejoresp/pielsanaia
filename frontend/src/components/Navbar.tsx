import React from 'react';
import { Link } from 'react-router-dom';
import DarkModeToggle from './DarkModeToggle';

const Navbar: React.FC = () => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img src="/logo.png" alt="Piel Sana IA" className="h-8 w-auto" />
              <span className="ml-2 text-xl font-semibold text-blue-900 dark:text-gray-100 hidden md:inline">Piel Sana IA</span>
            </Link>
          </div>
          <nav className="flex items-center space-x-4">
            <Link to="/" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 text-sm font-medium">
              Inicio
            </Link>
            <Link to="/about" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 text-sm font-medium">
              Acerca de
            </Link>
            <a
              href="#contact"
              className="bg-[#2bb3b8] dark:bg-[#145c5e] text-white hover:bg-[#5fa6a8] dark:hover:bg-[#19787a] hover:text-black px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Contacto
            </a>
            <DarkModeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navbar;