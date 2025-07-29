import React, { useContext, useState, useEffect } from 'react';
import { AppContextProvider, AppContext } from './context/AppContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import Components and Pages
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ProjectsPage from './pages/ProjectsPage';
import EditorPage from './pages/EditorPage';
import AboutUsPage from './pages/AboutUsPage';
import ContactPage from './pages/ContactPage';
import DocumentationPage from './pages/DocumentationPage';
import LoginPage from './pages/LoginPage'; // Import the LoginPage component
import Footer from './components/Footer';

// Main App Content Component (will be wrapped by BrowserRouter)
function AppContent() {
  // Get authentication status and user info from AppContext
  const { userId, isAuthReady, userName } = useContext(AppContext);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [scrollY, setScrollY] = useState(0);

  // Update window dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle mouse movement to influence grid visibility
  useEffect(() => {
    const handleMouseMove = (event) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Handle scroll movement for parallax strips
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Calculate grid intensity based on mouse position
  const centerX = windowDimensions.width / 2;
  const centerY = windowDimensions.height / 2;
  const distanceToCenter = Math.sqrt(
    Math.pow(mousePosition.x - centerX, 2) + Math.pow(mousePosition.y - centerY, 2)
  );

  const maxDistance = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
  const normalizedDistance = Math.min(1, distanceToCenter / maxDistance);
  const intensity = 1 - normalizedDistance;

  const gridLineOpacity = 0.1 + (intensity * 0.3);
  const gridDotOpacity = 0.2 + (intensity * 0.6);

  // Configuration for moving strips
  const strips = [
    { text: 'AI MODELS', speed: 0.2, top: '10%', left: '5%' },
    { text: 'MACHINE LEARNING', speed: 0.3, top: '30%', left: '70%' },
    { text: 'DEEP LEARNING', speed: 0.25, top: '50%', left: '15%' },
    { text: 'NEURAL NETWORKS', speed: 0.35, top: '70%', left: '50%' },
    { text: 'DATA SCIENCE', speed: 0.28, top: '90%', left: '25%' },
  ];

  // Conditional rendering based on authentication status
  if (!isAuthReady) {
    // If authentication process is not yet ready, show a loading/login screen
    return <LoginPage />;
  }

  if (!userId) {
    // If authentication is ready but no user is logged in, show the login page.
    return <LoginPage />;
  }

  // If authentication is ready and a user is logged in, render the main application content
  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden app-background-grid"
      style={{
        '--grid-line-opacity': gridLineOpacity,
        '--grid-dot-opacity': gridDotOpacity,
      }}
    >
      {/* Tailwind CSS CDN and Font */}
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@800&display=swap" rel="stylesheet" />
      {/* Font Awesome for icons */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />

      {/* Custom CSS for the glowing grid, vignette, and moving strips */}
      <style>
        {`
        .app-background-grid {
          background-color: #000; /* Base black background */
          background-image:
            radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 1) 85%),
            radial-gradient(circle, rgba(0, 255, 255, var(--grid-dot-opacity)) 1px, transparent 1px),
            radial-gradient(circle, rgba(255, 0, 255, var(--grid-dot-opacity)) 1px, transparent 1px),
            linear-gradient(to right, rgba(0, 255, 255, var(--grid-line-opacity)) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 0, 255, var(--grid-line-opacity)) 1px, transparent 1px);

          background-size:
            100% 100%,
            40px 40px,
            40px 40px,
            40px 40px,
            40px 40px;

          background-position:
            center center,
            0 0,
            20px 20px,
            0 0,
            0 0;
        }

        .moving-strip {
          position: absolute;
          font-family: 'Poppins', sans-serif;
          font-size: 4rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.03);
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
          transform: rotate(0deg);
          transition: transform 0.1s linear;
          text-shadow: 0px 0px 10px rgba(0, 255, 255, 0.1), 0px 0px 10px rgba(255, 0, 255, 0.1);
        }
        `}
      </style>

      {/* Moving Strips Layer (behind content, above grid) */}
      <div className="absolute inset-0 z-0">
        {strips.map((strip, index) => (
          <div
            key={index}
            className="moving-strip"
            style={{
              top: strip.top,
              left: strip.left,
              transform: `translateY(${scrollY * strip.speed}px) rotate(0deg)`,
            }}
          >
            {strip.text}
          </div>
        ))}
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage scrollY={scrollY} />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/about" element={<AboutUsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/documentation" element={<DocumentationPage />} />
            <Route path="*" element={<HomePage scrollY={scrollY} />} /> {/* Fallback route */}
          </Routes>
        </main>
        {/* Display User Name */}
        {userName && (
          <div className="text-xs text-gray-500 p-2 text-right">
            Logged in as: <span className="font-semibold text-gray-300">{userName}</span>
          </div>
        )}
        <Footer />
      </div>
    </div>
  );
}

// Wrapper to provide the AppContext to the entire application and BrowserRouter
function App() {
  return (
    <AppContextProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AppContextProvider>
  );
}

export default App;
