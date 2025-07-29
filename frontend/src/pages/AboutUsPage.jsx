import React from 'react';

// About Us Page Component
const AboutUsPage = () => (
  <div className="min-h-screen bg-black flex items-center justify-center py-12 px-4 font-inter">
    <div className="max-w-4xl w-full space-y-8 bg-gray-900 p-10 rounded-xl shadow-2xl border border-gray-700">
      <h2 className="text-center text-4xl font-extrabold text-white mb-6 tracking-tight">About Us</h2>
      <p className="text-lg text-gray-300 mb-4">
        Welcome to AIgnite, your dedicated platform for collaborative artificial intelligence development.
        Our mission is to empower teams to work together on complex AI projects with unprecedented efficiency and real-time synchronization.
      </p>
      <p className="text-lg text-gray-300 mb-4">
        Founded by passionate AI enthusiasts, we understand the challenges of distributed teams and the need for immediate feedback in iterative model development.
        AIgnite provides a seamless environment where every line of code, every file change, and every execution result is instantly shared among collaborators.
      </p>
      <p className="text-lg text-gray-300">
        We believe in fostering innovation through collaboration, breaking down geographical barriers, and accelerating the pace of AI research and development.
        Join us in shaping the future of collaborative AI!
      </p>
    </div>
  </div>
);

export default AboutUsPage;
