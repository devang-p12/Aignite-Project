import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for redirection

const LoginPage = () => {
  const { isAuthReady, userId, authError, loginWithEmailPassword, signupWithEmailPassword, updateUserProfile } = useContext(AppContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // New state for username
  const [isSigningUp, setIsSigningUp] = useState(false); // Toggle between sign-in and sign-up
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null); // For immediate input validation errors

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthReady && userId) {
      navigate('/projects'); // Redirect to projects page after successful login
    }
  }, [isAuthReady, userId, navigate]);

  // Clear local error when authError from context changes
  useEffect(() => {
    if (authError) {
      setLocalError(authError);
    } else {
      setLocalError(null);
    }
  }, [authError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null); // Clear previous local errors
    setLoading(true);

    if (!email || !password) {
      setLocalError("Email and password cannot be empty.");
      setLoading(false);
      return;
    }
    if (isSigningUp && !username.trim()) {
      setLocalError("Username cannot be empty for sign up.");
      setLoading(false);
      return;
    }

    try {
      if (isSigningUp) {
        const userCredential = await signupWithEmailPassword(email, password);
        if (userCredential && userCredential.user) {
          // Update user profile with the provided username after successful sign-up
          await updateUserProfile(username);
        }
        // Redirection handled by useEffect after userId updates
      } else {
        await loginWithEmailPassword(email, password);
        // Redirection handled by useEffect after userId updates
      }
    } catch (err) {
      // Error is already set in AppContext and propagated to localError via useEffect
      console.error("Login/Signup failed:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center py-12 px-4 font-inter">
      <div className="max-w-md w-full space-y-8 bg-gray-900 p-10 rounded-xl shadow-2xl border border-gray-700 text-center">
        <h2 className="text-center text-4xl font-extrabold text-white mb-6 tracking-tight">
          {isSigningUp ? 'Create Your Account' : 'Welcome Back'}
        </h2>
        <p className="text-lg text-gray-300 mb-8">
          {isSigningUp ? 'Sign up to start collaborating on AI projects.' : 'Sign in to access your projects.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {localError && (
            <div className="p-3 rounded-lg text-center font-semibold bg-red-900/50 text-red-300 border border-red-700 text-sm">
              {localError}
            </div>
          )}

          {isSigningUp && ( // Show username input only for sign-up
            <div>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-600 focus:border-blue-400 text-base transition-all duration-200 bg-gray-800 text-white placeholder-gray-500"
                required={isSigningUp} // Required only if signing up
              />
            </div>
          )}
          <div>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-600 focus:border-blue-400 text-base transition-all duration-200 bg-gray-800 text-white placeholder-gray-500"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-600 focus:border-blue-400 text-base transition-all duration-200 bg-gray-800 text-white placeholder-gray-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-zinc-800 text-white font-bold py-2.5 px-8 rounded-lg shadow-lg hover:bg-zinc-700 transform hover:scale-105 transition-all duration-300 ease-in-out
                       focus:outline-none focus:ring-4 focus:ring-zinc-600 border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <i className="fas fa-spinner fa-spin mr-2"></i>
            ) : isSigningUp ? (
              'Sign Up'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="text-gray-300 text-sm mt-4">
          {isSigningUp ? (
            <>
              Already have an account?{' '}
              <button
                onClick={() => { setIsSigningUp(false); setLocalError(null); }} // Clear error on toggle
                className="text-blue-400 hover:underline font-semibold"
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => { setIsSigningUp(true); setLocalError(null); }} // Clear error on toggle
                className="text-blue-400 hover:underline font-semibold"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
