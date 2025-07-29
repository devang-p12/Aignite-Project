import React from 'react';


// Footer Component

const Footer = () => {

return (

<footer className="bg-gray-900 text-gray-400 py-6 px-4 border-t border-gray-700 shadow-inner">

<div className="container mx-auto flex flex-col md:flex-row justify-between items-center text-sm">

{/* Copyright Information */}

<div className="mb-4 md:mb-0 text-center md:text-left">

&copy; {new Date().getFullYear()} AIgnite. All rights reserved.

</div>


{/* Navigation Links */}

<ul className="flex flex-wrap justify-center md:justify-end space-x-4">

<li>

<a href="#home" className="hover:text-white transition-colors duration-200">Home</a>

</li>

<li>

<a href="#projects" className="hover:text-white transition-colors duration-200">Projects</a>

</li>

<li>

<a href="#about" className="hover:text-white transition-colors duration-200">About Us</a>

</li>

<li>

<a href="#contact" className="hover:text-white transition-colors duration-200">Contact</a>

</li>

</ul>

</div>

</footer>

);

};


export default Footer; 