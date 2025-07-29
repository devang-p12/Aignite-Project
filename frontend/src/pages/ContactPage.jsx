import React from 'react';

// Contact Page Component
const ContactPage = () => (
  <div className="container mx-auto p-8 my-8 bg-white shadow-lg rounded-lg">
    <h2 className="text-4xl font-bold text-gray-800 mb-6 text-center">Contact Us</h2>
    <p className="text-lg text-gray-700 mb-4 text-center">
      Have questions, feedback, or need support? We'd love to hear from you!
    </p>
    <div className="max-w-md mx-auto bg-gray-50 p-6 rounded-lg shadow-inner">
      <p className="text-md text-gray-800 mb-2"><strong>Email:</strong> support@aicolab.com</p>
      <p className="text-md text-gray-800 mb-2"><strong>Phone:</strong> +1 (555) 123-4567</p>
      <p className="text-md text-gray-800"><strong>Address:</strong> 123 AI Avenue, Innovation City, Techland</p>
    </div>
    <p className="text-sm text-gray-600 mt-6 text-center">
      Our team will get back to you as soon as possible.
    </p>
  </div>
);

export default ContactPage;
