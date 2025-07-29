import React from 'react';

// Contact Page Component
const ContactPage = () => (
  <div className="min-h-screen bg-black flex items-center justify-center py-12 px-4 font-inter">
    <div className="max-w-4xl w-full space-y-8 bg-gray-900 p-10 rounded-xl shadow-2xl border border-gray-700">
      <h2 className="text-center text-4xl font-extrabold text-white mb-6 tracking-tight">Contact Us</h2>
      <p className="text-lg text-gray-300 mb-4 text-center">
        Have questions, feedback, or need support? We'd love to hear from you!
      </p>
      <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg shadow-inner border border-gray-700"> {/* Darker background for contact info */}
        <p className="text-md text-gray-200 mb-2"><strong>Email:</strong> support@aignite.com</p>
        <p className="text-md text-gray-200 mb-2"><strong>Phone:</strong> +1 (555) 123-4567</p>
        <p className="text-md text-gray-200"><strong>Address:</strong> 123 AI Avenue, Innovation City, Techland</p>
      </div>

      {/* Dummy Subscribe Section */}
      <div className="mt-10 p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
        <h3 className="text-2xl font-bold text-white mb-4 text-center">Stay Updated!</h3>
        <p className="text-md text-gray-300 mb-4 text-center">Subscribe to our newsletter for the latest news and updates.</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="email"
            placeholder="Enter your email address"
            className="flex-grow p-3 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-600 focus:border-blue-400 text-base transition-all duration-200 bg-gray-700 text-white placeholder-gray-400"
          />
          <button
            className="w-full sm:w-auto bg-zinc-800 text-white font-bold py-2.5 px-8 rounded-lg shadow-lg hover:bg-zinc-700 transform hover:scale-105 transition-all duration-300 ease-in-out
                       focus:outline-none focus:ring-4 focus:ring-zinc-600 border border-zinc-700"
          >
            Subscribe
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-400 mt-6 text-center">
        Our team will get back to you as soon as possible.
      </p>
    </div>
  </div>
);

export default ContactPage;
