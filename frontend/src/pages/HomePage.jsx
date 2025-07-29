import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

// Home Page Component
const HomePage = () => {
  const { setCurrentPage } = useContext(AppContext);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gradient-to-br from-blue-500 to-purple-600 text-white p-8">
      <h1 className="text-5xl font-extrabold mb-6 text-center leading-tight">
        Collaborate on AI Models in Real-time
      </h1>
      <p className="text-xl text-center max-w-2xl mb-10 opacity-90">
        Seamlessly build, train, and share your machine learning projects with your team.
        Real-time code editing, file management, and instant execution.
      </p>
      <button
        onClick={() => setCurrentPage('projects')}
        className="bg-white text-purple-700 font-bold py-3 px-8 rounded-full shadow-lg hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 ease-in-out"
      >
        Get Started
      </button>
    </div>
  );
};

export default HomePage;
