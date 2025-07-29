import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate hook
import { motion } from 'framer-motion'; // Ensure motion is imported

const HomePage = ({ scrollY }) => { // Accept scrollY as a prop
  const navigate = useNavigate(); // Initialize navigate hook

  const handleGetStarted = () => {
    navigate('/projects'); // Navigate to the projects page
  };

  const handleStartCollaborating = () => {
    navigate('/projects'); // Navigate to the projects page
  };

  // Framer Motion variants for text animation
  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
  };

  const aigniteVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.8 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 1, ease: "easeOut", delay: 0.2 } },
  };

  return (
    // This outermost div remains transparent to show the Spline background
    <div className="flex flex-col items-center min-h-[calc(100vh-64px)] text-white overflow-hidden">
      {/* Custom CSS for animations and font */}
      <style>
        {`
        /* Import Poppins font */
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;700;800;900&display=swap'); /* Added 300 for font-light */

        /* Styles for the AIgnite text fade effect */
        .aignite-text {
          font-family: 'Poppins', sans-serif;
          background: linear-gradient(90deg, #ff00ff, #00ffff, #ff00ff); /* Pink to Cyan to Pink */
          background-size: 200% auto; /* Make gradient wider than text */
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: text-gradient-animation 3s linear infinite;
        }

        @keyframes text-gradient-animation {
          to {
            background-position: 200% center; /* Move gradient across the text */
          }
        }

        /* Styles for the circling border button effect */
        .animated-border-button {
          position: relative;
          z-index: 1;
          overflow: hidden;
          border: none; /* Remove default button border */
          padding: 0; /* Remove default padding to let pseudo-element define size */
        }

        .animated-border-button::before {
          content: '';
          position: absolute;
          top: -2px; /* Extend slightly beyond button for border effect */
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(45deg, #ff00ff, #00ffff, #00ff00, #ffff00, #ff00ff); /* Multi-color gradient */
          background-size: 400% 400%; /* Make gradient large enough to move */
          border-radius: 9999px; /* Fully rounded border */
          z-index: -1; /* Place behind the button content */
          animation: border-spin 3s linear infinite;
        }

        @keyframes border-spin {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; } /* Animate background position */
        }

        /* Ensure the button's content is visible and correctly positioned */
        .animated-border-button > span {
          display: block; /* Make span fill the button */
          padding: 12px 32px; /* Re-apply padding to the inner span */
          background-color: white; /* Button's background color */
          color: #8B5CF6; /* Button's text color (purple-700) */
          border-radius: 9999px; /* Match outer border-radius */
          transition: background-color 0.3s ease, transform 0.3s ease; /* Smooth transitions */
        }

        .animated-border-button:hover > span {
          background-color: #f3f4f6; /* Hover effect for inner span */
          transform: scale(1.02); /* Slight scale on hover */
        }

        /* Text shadow for other paragraphs */
        .text-shadow-dark {
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
        }

        /* Frosted glass effect for the main content container */
        .frosted-glass-bg { /* Renamed from anonymous class to frosted-glass-bg */
          background-color: rgba(0, 0, 0, 0.6); /* Changed opacity from 0.2 to 0.6 for a darker tint */
          backdrop-filter: blur(10px); /* Frosted glass effect */
          -webkit-backdrop-filter: blur(10px); /* For Safari */
          /* Removed border */
        }
        /* Added a class for smooth parallax transitions */
        .parallax-section {
          transition: transform 0.1s ease-out; /* Smooth transition for parallax */
        }
        `}
      </style>

      {/* Main content container with translucent background, rounded edges, and increased horizontal margin */}
      <motion.div
        className="flex flex-col items-center justify-center mx-auto my-20 p-8 rounded-xl shadow-lg frosted-glass-bg max-w-5xl parallax-section"
        style={{ transform: `translateY(${scrollY * 0.1}px)` }} // Slower parallax for hero
        initial="hidden"
        animate="visible"
        variants={textVariants} // Apply variants to the container
      >
        {/* Hero Content Area */}
        <div className="flex flex-col items-center text-center w-full max-w-3xl">
          <motion.h1
            className="text-8xl font-light uppercase mb-4 leading-tight aignite-text"
            variants={aigniteVariants} // Apply specific variants for AIgnite
          >
            AIgnite
          </motion.h1>
          <motion.p
            className="text-xl mb-6 opacity-80 font-inter text-shadow-dark"
            variants={textVariants} // Apply general text variants
          >
            Igniting collaborative intelligence for the future of AI.
          </motion.p>
          <motion.p
            className="text-lg mb-10 opacity-90 font-inter text-shadow-dark"
            variants={textVariants} // Apply general text variants
          >
            Seamlessly build, train, and share your machine learning projects with your team.
            Real-time code editing, file management, and instant execution.
          </motion.p>
          <motion.button
            onClick={handleGetStarted}
            className="shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out animated-border-button"
            variants={textVariants} // Apply general text variants
          >
            <span>Get Started</span>
          </motion.button>
        </div>
      </motion.div>

      {/* New Section 1: Features */}
      <motion.div
        className="w-full max-w-6xl mx-auto my-16 p-8 rounded-xl shadow-lg frosted-glass-bg parallax-section"
        style={{ transform: `translateY(${scrollY * 0.05}px)` }} // Even slower parallax
        initial="hidden"
        whileInView="visible" // Animate when in view
        viewport={{ once: true, amount: 0.5 }} // Trigger once when 50% in view
        variants={textVariants}
      >
        <h2 className="text-4xl font-bold text-center mb-10 text-shadow-dark">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="p-6 rounded-lg bg-black bg-opacity-40 border border-gray-700 shadow-md">
            <h3 className="text-2xl font-semibold mb-3 text-shadow-dark">Real-time Collaboration</h3>
            <p className="text-gray-300">Work simultaneously with your team on the same code, seeing changes instantly as they happen.</p>
          </div>
          <div className="p-6 rounded-lg bg-black bg-opacity-40 border border-gray-700 shadow-md">
            <h3 className="text-2xl font-semibold mb-3 text-shadow-dark">Integrated Code Editor</h3>
            <p className="text-gray-300">Leverage the power of Monaco Editor with syntax highlighting, auto-completion, and more for Python.</p>
          </div>
          <div className="p-6 rounded-lg bg-black bg-opacity-40 border border-gray-700 shadow-md">
            <h3 className="text-2xl font-semibold mb-3 text-shadow-dark">Live Code Execution</h3>
            <p className="text-gray-300">Run your Python code directly from the browser and see the output in real-time.</p>
          </div>
          <div className="p-6 rounded-lg bg-black bg-opacity-40 border border-gray-700 shadow-md">
            <h3 className="text-2xl font-semibold mb-3 text-shadow-dark">File Management</h3>
            <p className="text-gray-300">Organize your AI projects with a built-in file explorer, creating and managing multiple files per project.</p>
          </div>
          <div className="p-6 rounded-lg bg-black bg-opacity-40 border border-gray-700 shadow-md">
            <h3 className="text-2xl font-semibold mb-3 text-shadow-dark">Cursor & Selection Sync</h3>
            <p className="text-gray-300">Track your teammates' cursors and selections in the editor for a truly collaborative experience.</p>
          </div>
          <div className="p-6 rounded-lg bg-black bg-opacity-40 border border-gray-700 shadow-md">
            <h3 className="text-2xl font-semibold mb-3 text-shadow-dark">Secure & Persistent</h3>
            <p className="text-gray-300">Your projects and files are securely stored in Firestore, accessible only to authenticated users.</p>
          </div>
        </div>
      </motion.div>

      {/* New Section 2: How It Works */}
      <motion.div
        className="w-full max-w-6xl mx-auto my-16 p-8 rounded-xl shadow-lg frosted-glass-bg parallax-section"
        style={{ transform: `translateY(${scrollY * 0.12}px)` }} // Slightly faster parallax
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={textVariants}
      >
        <h2 className="text-4xl font-bold text-center mb-10 text-shadow-dark">How It Works</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-12">
          <div className="flex flex-col items-center text-center max-w-xs">
            <div className="text-5xl mb-4 text-blue-400">1</div>
            <h3 className="text-2xl font-semibold mb-2 text-shadow-dark">Create or Join</h3>
            <p className="text-gray-300">Start a new project or join an existing one using a unique project ID.</p>
          </div>
          <div className="flex flex-col items-center text-center max-w-xs">
            <div className="text-5xl mb-4 text-purple-400">2</div>
            <h3 className="text-2xl font-semibold mb-2 text-shadow-dark">Collaborate in Real-time</h3>
            <p className="text-gray-300">Edit code, manage files, and see your team's contributions live in the editor.</p>
          </div>
          <div className="flex flex-col items-center text-center max-w-xs">
            <div className="text-5xl mb-4 text-green-400">3</div>
            <h3 className="text-2xl font-semibold mb-2 text-shadow-dark">Run & Iterate</h3>
            <p className="text-gray-300">Execute your Python code directly and quickly iterate on your AI models.</p>
          </div>
        </div>
      </motion.div>

      {/* New Section 3: Call to Action */}
      <motion.div
        className="w-full max-w-4xl mx-auto my-16 p-8 rounded-xl shadow-lg frosted-glass-bg parallax-section"
        style={{ transform: `translateY(${scrollY * 0.08}px)` }} // Medium parallax speed
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={textVariants}
      >
        <h2 className="text-4xl font-bold mb-6 text-shadow-dark">Ready to AIgnite Your Collaboration?</h2>
        <p className="text-xl mb-10 text-gray-300">Join the future of collaborative AI model development today!</p>
        <button
          onClick={handleStartCollaborating}
          className="shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out animated-border-button"
        >
          <span>Start Collaborating Now</span>
        </button>
      </motion.div>

    </div>
  );
};

export default HomePage;
