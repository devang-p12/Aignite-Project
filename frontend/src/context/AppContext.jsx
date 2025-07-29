import React, { createContext, useState, useEffect } from 'react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- Global Firebase & App Configuration ---
// These variables are provided by the Canvas environment.
// For local development, they will be undefined.
// We provide sensible defaults or warnings.
const canvasAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-canvas-app-id';
const canvasFirebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const canvasInitialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

const myLocalFirebaseConfig = {
  apiKey: "AIzaSyBl-kgFIDJ7eIW81M2KKrvYKbw8edoBBA4",
  authDomain: "ai-collab-app-a52d4.firebaseapp.com",
  projectId: "ai-collab-app-a52d4",
  storageBucket: "ai-collab-app-a52d4.firebasestorage.app",
  messagingSenderId: "252905875949",
  appId: "1:252905875949:web:24cc6fa43cdb44d4c31fe4",
  measurementId: "G-2M2R3FZXSD"
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
  const [isAuthReady, setIsAuthReady] = useState(false);

  // UI/Navigation States (managed here for global access)
  const [currentPage, setCurrentPage] = useState('home');
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeFileName, setActiveFileName] = useState(null);

  // Initialize Firebase and handle authentication
  useEffect(() => {
    let app;
    let firestore;
    let firebaseAuth;
    let configToUse = null;
    let authTokenToUse = null;

    // Determine which Firebase config and auth token to use
    if (canvasFirebaseConfig) { // Running in Canvas environment
      configToUse = canvasFirebaseConfig;
      authTokenToUse = canvasInitialAuthToken;
      console.log("Firebase: Using Canvas-provided Firebase config.");
    } else if (myLocalFirebaseConfig.apiKey && myLocalFirebaseConfig.projectId) { // Running locally with provided config
      configToUse = myLocalFirebaseConfig;
      // For local development, we'll sign in anonymously, as no custom token is provided
      authTokenToUse = null;
      console.log("Firebase: Using local Firebase config.");
    } else {
      console.warn(
        "Firebase: No Firebase config provided. This is expected when running locally without a custom config. " +
        "Firebase features (like project storage) will not be functional."
      );
      setIsAuthReady(true); // Mark as ready but without functional Firebase
      return; // Exit if no config available
    }

    try {
      // Initialize Firebase App
      app = initializeApp(configToUse);
      firestore = getFirestore(app);
      firebaseAuth = getAuth(app);

      setFirebaseApp(app);
      setDb(firestore);
      setAuth(firebaseAuth);

      // Authenticate user
      const authenticate = async () => {
        try {
          if (authTokenToUse) {
            await signInWithCustomToken(firebaseAuth, authTokenToUse);
            console.log("Firebase: Signed in with custom token.");
          } else {
            await signInAnonymously(firebaseAuth);
            console.log("Firebase: Signed in anonymously.");
          }
        } catch (error) {
          console.error("Firebase: Authentication error:", error);
        } finally {
          setIsAuthReady(true); // Auth process attempted
        }
      };

      // Listen for auth state changes
      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
          setUserId(user.uid);
          console.log("Firebase: Auth state changed. User ID:", user.uid);
        } else {
          setUserId(null);
          console.log("Firebase: User logged out or not authenticated.");
        }
      });

      authenticate(); // Start authentication

      return () => unsubscribe(); // Clean up auth listener
    } catch (error) {
      console.error("Firebase: Failed to initialize Firebase:", error);
      setIsAuthReady(true); // Mark as ready even on error to unblock UI
    }
  }, []); // Run only once on mount

  // Provide all necessary values to the context consumers
  const contextValue = {
    firebaseApp,
    db,
    auth,
    userId,
    isAuthReady,
    appId: canvasAppId, // Pass appId for Firestore paths (consistent whether Canvas or local)
    currentPage, setCurrentPage,
    activeProjectId, setActiveProjectId,
    activeFileName, setActiveFileName,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
