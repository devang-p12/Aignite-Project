import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate for logout redirection

// Navbar Component
const Navbar = () => {
  const { userName, userId, logout } = useContext(AppContext); // Get userName, userId, and logout function
  const navigate = useNavigate(); // Initialize navigate hook

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/'); // Redirect to home page after logout (which will then go to login)
    } catch (error) {
      console.error("Failed to log out:", error);
      // Optionally, display an error message to the user
    }
  };

  return (
    <nav className="p-4">
      <div className="container mx-auto bg-black rounded-lg shadow-lg py-3 px-6 flex justify-between items-center my-4">
        <Link to="/" className="text-white text-2xl font-bold cursor-pointer">
          AIgnite
        </Link>
        <ul className="flex space-x-6 items-center"> {/* Added items-center for vertical alignment */}
          <li><Link to="/" className="text-gray-300 hover:text-white transition-colors duration-200">Home</Link></li>
          <li><Link to="/projects" className="text-gray-300 hover:text-white transition-colors duration-200">Projects</Link></li>
          <li><Link to="/documentation" className="text-gray-300 hover:text-white transition-colors duration-200">Documentation</Link></li>
          <li><Link to="/about" className="text-gray-300 hover:text-white transition-colors duration-200">About Us</Link></li>
          <li><Link to="/contact" className="text-gray-300 hover:text-white transition-colors duration-200">Contact</Link></li>
          {userId ? ( // Conditionally render based on userId
            <>
              <li className="text-gray-300 text-sm ml-4">
                Hello, <span className="font-semibold text-white">{userName}</span>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  className="bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-red-800 transition-colors duration-200"
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            <li>
              {/* This link will take the user to the root, which App.jsx will then redirect to LoginPage */}
              <Link to="/" className="bg-zinc-800 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-zinc-700 transition-colors duration-200">
                Login
              </Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
