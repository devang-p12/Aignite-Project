import React, { createContext, useState, useEffect } from 'react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- Global Firebase & App Configuration ---
// These variables are provided by the Canvas environment.
// For local development, they will be undefined.
// We provide sensible defaults or warnings.
const canvasAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-canvas-app-id';
const canvasFirebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const canvasInitialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Your local Firebase configuration, loaded from environment variables
// For Vite, environment variables are exposed via import.meta.env and MUST be prefixed with VITE_
const myLocalFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Create the AppContext
export const AppContext = createContext(null);

// AppContextProvider component to wrap your entire application
export const AppContextProvider = ({ children }) => {
  // Firebase States
  const [firebaseApp, setFirebaseApp] = useState(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState(null); // User's display name or email
  const [isAuthReady, setIsAuthReady] = useState(false); // Indicates if Firebase Auth is initialized and user state is known
  const [authError, setAuthError] = useState(null); // New: for authentication errors

  // UI/Navigation States (managed here for global access, though React Router handles page switching)
  const [currentPage, setCurrentPage] = useState('home'); // Kept for potential internal logic if needed
  const [activeProjectId, setActiveProjectId] = useState(null); // State for the currently active project
  const [activeFileName, setActiveFileName] = useState(null); // State for the currently active file

  // Initialize Firebase and handle authentication
  useEffect(() => {
    let app;
    let firestore;
    let firebaseAuthInstance; // Renamed to avoid conflict with state setter
    let configToUse = null;
    let authTokenToUse = null;

    // Determine which Firebase config and auth token to use
    if (canvasFirebaseConfig) { // Running in Canvas environment
      configToUse = canvasFirebaseConfig;
      authTokenToUse = canvasInitialAuthToken;
      console.log("Firebase: Using Canvas-provided Firebase config.");
    } else if (myLocalFirebaseConfig.apiKey && myLocalFirebaseConfig.projectId) { // Running locally with provided config
      // Ensure local config values are not undefined (meaning .env vars were loaded)
      if (Object.values(myLocalFirebaseConfig).some(val => val === undefined)) {
        console.error("Firebase: Local .env variables for Firebase are not loaded correctly. Please check your .env file and Vite configuration. myLocalFirebaseConfig:", myLocalFirebaseConfig);
        setIsAuthReady(true); // Mark ready to avoid infinite loading, but Firebase won't function
        return;
      }
      configToUse = myLocalFirebaseConfig;
      // For local development, we'll sign in anonymously by default if no custom token
      authTokenToUse = null;
      console.log("Firebase: Using local Firebase config from .env.");
    } else {
      console.warn(
        "Firebase: No Firebase config provided. This is expected when running locally without a custom config. " +
        "Firebase features (like project storage) will not be functional."
      );
      setIsAuthReady(true); // Mark as ready but without functional Firebase
      return; // Exit if no config available
    }

    // Check if the determined config is actually valid before initializing
    if (!configToUse || !configToUse.apiKey || !configToUse.projectId) {
        console.error("Firebase: Invalid or incomplete Firebase config. Cannot initialize. Config:", configToUse);
        setIsAuthReady(true);
        return;
    }

    try {
      // Initialize Firebase App
      app = initializeApp(configToUse);
      firestore = getFirestore(app);
      firebaseAuthInstance = getAuth(app); // Get auth instance

      setFirebaseApp(app);
      setDb(firestore);
      setAuth(firebaseAuthInstance); // Set auth state

      console.log("Firebase: App, Firestore, and Auth instances created.");

      // Listen for auth state changes
      const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (user) => {
        if (user) {
          // User is signed in.
          setUserId(user.uid);
          // Prioritize displayName, then email, then a truncated UID for anonymous users
          setUserName(user.displayName || user.email || `User-${user.uid.substring(0, 4)}`);
          setAuthError(null); // Clear any previous auth errors on successful login
          console.log("Firebase: Auth state changed. User ID:", user.uid, "Name:", user.displayName || user.email || `User-${user.uid.substring(0, 4)}`);
        } else {
          // User is signed out.
          setUserId(null);
          setUserName(null); // Clear userName when logged out
          console.log("Firebase: User logged out or not authenticated.");
        }
        setIsAuthReady(true); // Mark auth process as ready after initial check
      });

      // Attempt initial authentication (anonymous or custom token) if no user is signed in
      const initialAuthCheck = async () => {
        // Ensure firebaseAuthInstance is available before trying to sign in
        if (!firebaseAuthInstance) {
          console.warn("Firebase: Auth instance not available for initial check.");
          return;
        }
        if (!firebaseAuthInstance.currentUser) {
          try {
            if (authTokenToUse) {
              await signInWithCustomToken(firebaseAuthInstance, authTokenToUse);
              console.log("Firebase: Signed in with custom token.");
            } else {
              // For local development or if custom token fails, try anonymous
              await signInAnonymously(firebaseAuthInstance);
              console.log("Firebase: Signed in anonymously.");
            }
          } catch (error) {
            console.error("Firebase: Initial authentication error:", error);
            setAuthError(error.message); // Store error message
            // onAuthStateChanged will handle setting isAuthReady to true
            // but userId/userName will remain null, leading to the LoginPage.
          }
        } else {
          setIsAuthReady(true); // If already signed in (e.g., persistent session), mark ready
        }
      };

      initialAuthCheck(); // Start the initial authentication check

      return () => unsubscribe(); // Clean up auth listener on component unmount
    } catch (error) {
      console.error("Firebase: Failed to initialize Firebase:", error);
      setAuthError(error.message); // Store initialization error
      setIsAuthReady(true); // Mark as ready even on error to unblock UI
    }
  }, []); // Run only once on mount

  /**
   * Attempts to sign up a user with email and password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<UserCredential>}
   */
  const signupWithEmailPassword = async (email, password) => {
    setAuthError(null); // Clear previous errors
    if (!auth) { // Check if auth is available before proceeding
      setAuthError("Firebase Auth not initialized. Please wait or check console for errors.");
      throw new Error("Firebase Auth not initialized.");
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("User signed up successfully:", userCredential.user.uid);
      return userCredential;
    } catch (error) {
      console.error("Error signing up with email and password:", error);
      setAuthError(error.message);
      throw error; // Re-throw to allow component to handle
    }
  };

  /**
   * Attempts to sign in a user with email and password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<UserCredential>}
   */
  const loginWithEmailPassword = async (email, password) => {
    setAuthError(null); // Clear previous errors
    if (!auth) { // Check if auth is available before proceeding
      setAuthError("Firebase Auth not initialized. Please wait or check console for errors.");
      throw new Error("Firebase Auth not initialized.");
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("User logged in successfully:", userCredential.user.uid);
      return userCredential;
    } catch (error) {
      console.error("Error logging in with email and password:", error);
      setAuthError(error.message);
      throw error; // Re-throw to allow component to handle
    }
  };

  /**
   * Updates the display name of the current authenticated user.
   * This is typically called after sign-up or if the user wants to change their name.
   * @param {string} newDisplayName The new display name for the user.
   * @returns {Promise<void>}
   */
  const updateUserProfile = async (newDisplayName) => {
    setAuthError(null); // Clear previous errors
    if (!auth || !auth.currentUser) {
      setAuthError("No user is currently logged in to update profile.");
      throw new Error("No user logged in.");
    }
    try {
      await updateProfile(auth.currentUser, { displayName: newDisplayName });
      setUserName(newDisplayName); // Update the userName in context immediately
      console.log("User profile updated successfully. New display name:", newDisplayName);
    } catch (error) {
      console.error("Error updating user profile:", error);
      setAuthError(error.message);
      throw error;
    }
  };

  /**
   * Logs out the current user.
   * @returns {Promise<void>}
   */
  const logout = async () => {
    setAuthError(null); // Clear previous errors
    if (!auth) {
      setAuthError("Firebase Auth not initialized.");
      return;
    }
    try {
      await signOut(auth);
      console.log("User logged out successfully.");
    } catch (error) {
      console.error("Error logging out:", error);
      setAuthError(error.message);
    }
  };


  // Provide all necessary values to the context consumers
  const contextValue = {
    firebaseApp,
    db,
    auth,
    userId,
    userName, // Provide userName in context
    isAuthReady,
    authError, // Provide authError
    appId: canvasAppId, // Pass appId for Firestore paths (consistent whether Canvas or local)
    currentPage, setCurrentPage, // Kept for backward compatibility, though React Router is primary
    activeProjectId, setActiveProjectId,
    activeFileName, setActiveFileName,
    // New authentication functions
    signupWithEmailPassword,
    loginWithEmailPassword,
    logout,
    updateUserProfile, // New: Provide updateUserProfile
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
