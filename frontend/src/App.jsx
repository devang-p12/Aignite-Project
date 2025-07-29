import React, { useContext } from 'react';
import { AppContextProvider, AppContext } from './context/AppContext'; // Import AppContextProvider and AppContext

// Import Components and Pages
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ProjectsPage from './pages/ProjectsPage';
import EditorPage from './pages/EditorPage';
import AboutUsPage from './pages/AboutUsPage';
import ContactPage from './pages/ContactPage';

// Main App Component
function AppContent() {
  const { currentPage, userId } = useContext(AppContext);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Tailwind CSS CDN and Font */}
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />

      <Navbar />
      <main className="flex-1">
        {(() => { // Using IIFE for switch-case routing
          switch (currentPage) {
            case 'home':
              return <HomePage />;
            case 'projects':
              return <ProjectsPage />;
            case 'editor':
              return <EditorPage />;
            case 'about':
              return <AboutUsPage />;
            case 'contact':
              return <ContactPage />;
            default:
              return <HomePage />;
          }
        })()}
      </main>
      {userId && <div className="text-xs text-gray-500 p-2 text-right">User ID: {userId}</div>}
    </div>
  );
}

// Wrapper to provide the AppContext to the entire application
function App() {
  return (
    <AppContextProvider>
      <AppContent />
    </AppContextProvider>
  );
}

export default App;
