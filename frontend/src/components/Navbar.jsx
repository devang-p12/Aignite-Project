import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

// Navbar Component
const Navbar = () => {
  const { setCurrentPage } = useContext(AppContext);

  return (
    <nav className="bg-gray-800 p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-white text-2xl font-bold cursor-pointer" onClick={() => setCurrentPage('home')}>
          AI Collab
        </div>
        <ul className="flex space-x-6">
          <li><button onClick={() => setCurrentPage('home')} className="text-gray-300 hover:text-white transition-colors duration-200">Home</button></li>
          <li><button onClick={() => setCurrentPage('projects')} className="text-gray-300 hover:text-white transition-colors duration-200">Projects</button></li>
          <li><button onClick={() => setCurrentPage('about')} className="text-gray-300 hover:text-white transition-colors duration-200">About Us</button></li>
          <li><button onClick={() => setCurrentPage('contact')} className="text-gray-300 hover:text-white transition-colors duration-200">Contact</button></li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
