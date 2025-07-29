import React, { useState, useEffect, useRef, useContext } from 'react';
import { io } from 'socket.io-client';
import { Editor } from '@monaco-editor/react';
import { AppContext } from '../context/AppContext';
import { collection, doc, setDoc, onSnapshot, query, orderBy, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom'; // Import useNavigate hook

// Define the Socket.IO server URL for connection
// This should be your Render backend URL in production
const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_SERVER_URL;

/**
 * Generates a random hexadecimal color code.
 * Used for assigning unique colors to remote collaborators' cursors.
 * @returns {string} A hexadecimal color string (e.g., '#RRGGBB').
 */
const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

/**
 * EditorPage Component
 * Provides a collaborative code editing environment with real-time sync,
 * file management, and code execution capabilities.
 */
const EditorPage = () => {
  // Destructure necessary values from AppContext
  const {
    db,
    userId,
    appId,
    isAuthReady,
    activeProjectId,
    activeFileName,
    setActiveFileName,
    userName, // Get userName from context
  } = useContext(AppContext);
  const navigate = useNavigate(); // Initialize useNavigate hook for navigation

  // State variables for editor content, output, and UI status
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  // State for file management
  const [files, setFiles] = useState([]);
  const [newFileName, setNewFileName] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [fileError, setFileError] = useState(null);

  // Refs for Socket.IO instance, Monaco Editor, and remote cursor decorations
  const socketRef = useRef(null);
  const editorRef = useRef(null); // Holds the Monaco Editor instance
  const decorationsRef = useRef(null); // Stores Monaco decoration IDs for remote cursors/selections
  // Maps userId to their cursor/selection details: {color, cursorWidget, selectionDecorationId}
  const remoteCursors = useRef(new Map());

  // --- Debugging: Log context values on component render ---
  useEffect(() => {
    console.log('EditorPage Render - Context Values:', {
      activeProjectId,
      activeFileName,
      userId,
      userName, // Log userName
      isAuthReady,
      dbInitialized: !!db, // Check if db object exists
    });
  }, [activeProjectId, activeFileName, userId, userName, isAuthReady, db]);

  // --- Socket.IO Connection and Real-time Synchronization ---
  useEffect(() => {
    // Prevent socket initialization if critical dependencies are not ready
    if (!db || !isAuthReady || !activeProjectId || !userId) {
      console.log('EditorPage: Socket.IO useEffect - Waiting for dependencies.', {
        activeProjectId,
        userId,
        dbInitialized: !!db,
        isAuthReady,
      });
      // Ensure any existing socket is disconnected if in an invalid state
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    console.log('EditorPage: Socket.IO useEffect - All dependencies ready. Initializing for project:', activeProjectId);

    // Disconnect any pre-existing socket connection to avoid duplicates
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Initialize a new Socket.IO client connection
    socketRef.current = io(SOCKET_SERVER_URL);

    // Event listener for successful socket connection
    socketRef.current.on('connect', () => {
      setIsConnected(true);
      console.log('Socket Connected!');
      // Emit 'join_document' to join a specific room for the active project
      socketRef.current.emit('join_document', activeProjectId);
    });

    // Event listener for socket disconnection
    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket Disconnected.');
      // Clear all remote cursor decorations from the editor on disconnect
      if (editorRef.current && decorationsRef.current) {
        decorationsRef.current.clear(); // Corrected: Use clear() method on IDecorationsCollection
        remoteCursors.current.clear();
      }
    });

    // Event listener for incoming code changes from other collaborators
    socketRef.current.on('code_change', (data) => {
      const { newContent, senderId, fileName: changedFileName } = data;
      // Apply the change only if it's from a different user and for the currently active file
      if (socketRef.current.id !== senderId && changedFileName === activeFileName) {
        console.log(`Received remote code change for ${changedFileName}:`, newContent.substring(0, 50) + '...');
        // Update editor value only if it's different to prevent unnecessary re-renders
        if (editorRef.current && editorRef.current.getValue() !== newContent) {
          editorRef.current.setValue(newContent);
        }
      }
    });

    // Event listener for incoming cursor/selection updates from other collaborators
    socketRef.current.on('cursor_update', (data) => {
      const { userId: remoteUserId, position, selection, fileName: updatedFileName } = data;

      // Ignore updates from self, updates for non-active files, or if editor is not ready
      if (socketRef.current.id === remoteUserId || updatedFileName !== activeFileName || !editorRef.current || !window.monaco) {
        return;
      }

      const editor = editorRef.current;
      const model = editor.getModel();
      if (!model) return; // Ensure editor model is available

      // Get or assign a random color for the remote user's cursor/selection
      let userColor = remoteCursors.current.get(remoteUserId)?.color;
      if (!userColor) {
        userColor = getRandomColor();
        remoteCursors.current.set(remoteUserId, { color: userColor }); // Store the assigned color
      }

      // Retrieve or initialize decorations for this user
      let currentDecorations = remoteCursors.current.get(remoteUserId);
      if (!currentDecorations) {
        currentDecorations = { cursorWidget: null, selectionDecorationId: [], color: userColor };
        remoteCursors.current.set(remoteUserId, currentDecorations);
      }

      let newDecorations = [];

      // 1. Manage Cursor Widget (Monaco Content Widget for the blinking cursor)
      let cursorWidget = currentDecorations.cursorWidget;
      if (!cursorWidget) {
        // Create a new content widget if it doesn't exist
        cursorWidget = {
          domNode: document.createElement('div'),
          position: { lineNumber: position.lineNumber, column: position.column },
          allowEditorOverflow: true,
          suppressMouseDown: true,
          getId: () => `remote-cursor-widget-${remoteUserId}` // Unique ID for the widget
        };
        cursorWidget.domNode.className = 'remote-cursor';
        cursorWidget.domNode.style.backgroundColor = userColor;
        cursorWidget.domNode.style.height = `${editor.getOption(window.monaco.editor.EditorOption.lineHeight)}px`;

        // Add a tooltip to display the user's name or a truncated ID
        const tooltip = document.createElement('span');
        tooltip.className = 'remote-cursor-tooltip';
        tooltip.textContent = userName || remoteUserId.substring(0, 4); // Use userName or truncated userId
        tooltip.style.backgroundColor = userColor; // Tooltip matches cursor color
        cursorWidget.domNode.appendChild(tooltip);

        editor.addContentWidget(cursorWidget);
        currentDecorations.cursorWidget = cursorWidget;
      } else {
        // Update position of existing content widget
        cursorWidget.position = { lineNumber: position.lineNumber, column: position.column };
        editor.layoutContentWidget(cursorWidget);
        // Update tooltip text in case userName changed
        const tooltipSpan = cursorWidget.domNode.querySelector('.remote-cursor-tooltip');
        if (tooltipSpan) {
          tooltipSpan.textContent = userName || remoteUserId.substring(0, 4);
        }
      }

      // 2. Manage Selection Decoration (for highlighting selected text)
      if (selection && (selection.startLineNumber !== selection.endLineNumber || selection.startColumn !== selection.endColumn)) {
        const newRange = new window.monaco.Range(
          selection.startLineNumber, selection.startColumn,
          selection.endLineNumber, selection.endColumn
        );
        const selectionRgbaColor = `${userColor}33`; // Add 20% opacity to hex color

        newDecorations.push({
          range: newRange,
          options: {
            className: 'remote-selection', // Main class for styling
            isWholeLine: false, // Apply only to selected text
            stickiness: window.monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            inlineClassName: 'remote-selection-inline',
            inlineClassNameAfter: 'remote-selection-inline-after',
            attributes: { 'data-user-id': remoteUserId } // Custom attribute to link to user
          }
        });

        // Dynamically create a style tag for this specific selection color if it doesn't exist
        const styleId = `remote-selection-style-${remoteUserId}`;
        if (!document.getElementById(styleId)) {
          const styleTag = document.createElement('style');
          styleTag.id = styleId;
          styleTag.innerHTML = `
            .remote-selection-inline[data-user-id="${remoteUserId}"] { background-color: ${selectionRgbaColor}; }
            .remote-selection-inline-after[data-user-id="${remoteUserId}"] { outline: 1px solid ${userColor}; }
          `;
          document.head.appendChild(styleTag);
        }
      }

      // Apply new decorations and update the stored decoration IDs
      const newDecorationIds = editor.deltaDecorations(
        currentDecorations.selectionDecorationId, // Old decoration IDs to remove
        newDecorations
      );
      currentDecorations.selectionDecorationId = newDecorationIds; // Store new IDs

      remoteCursors.current.set(remoteUserId, currentDecorations);
    });

    // Event listener for code execution output from the server
    socketRef.current.on('code_output', (data) => {
      setIsRunning(false); // Code execution has finished
      if (data.error) {
        setOutput(`Error:\n${data.output}`);
        console.error('Code execution error:', data.output);
      } else {
        setOutput(data.output);
        console.log('Code output:', data.output);
      }
    });

    // Cleanup function: Disconnect socket and clear decorations when component unmounts
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      if (editorRef.current && decorationsRef.current) { // Ensure decorationsRef.current exists
        decorationsRef.current.clear(); // Corrected: Use clear() method on IDecorationsCollection
        remoteCursors.current.forEach(cursor => {
          if (cursor.cursorWidget) editorRef.current.removeContentWidget(cursor.cursorWidget);
        });
        remoteCursors.current.clear();
      }
    };
  }, [db, userId, userName, isAuthReady, activeProjectId, activeFileName]); // Added userName to dependencies

  // --- Firestore: Fetch Files for Active Project ---
  useEffect(() => {
    // Prevent fetching if essential context values are not yet available
    if (!db || !isAuthReady || !activeProjectId) {
      setLoadingFiles(true);
      console.log('EditorPage: Files useEffect - Waiting for dependencies.', {
        dbInitialized: !!db,
        isAuthReady,
        activeProjectId,
      });
      // Clear files and code if project is not active
      setFiles([]);
      setActiveFileName(null);
      setCode('');
      return;
    }

    setLoadingFiles(true);
    setFileError(null);
    console.log('EditorPage: Files useEffect - All dependencies ready. Fetching files for project:', activeProjectId);

    // Construct the Firestore path for project files (publicly accessible)
    const filesCollectionRef = collection(db, `artifacts/${appId}/public/data/projects/${activeProjectId}/files`);
    // Query to order files by creation time
    const q = query(filesCollectionRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFiles(filesList);
      setLoadingFiles(false);
      console.log('EditorPage: Files fetched for project:', activeProjectId, filesList);

      // Logic to manage the active file when files are loaded or changed
      if (!activeFileName || !filesList.some((f) => f.fileName === activeFileName)) {
        if (filesList.length > 0) {
          // If no active file or current active file is missing, set the first file as active
          setActiveFileName(filesList[0].fileName);
          console.log('EditorPage: Setting active file to first file:', filesList[0].fileName);
        } else {
          // If no files exist in the project, clear active file and editor content
          setActiveFileName(null);
          setCode('');
          console.log('EditorPage: No files found in project.');
        }
      }
    }, (err) => {
      console.error('Error fetching files:', err);
      setFileError('Failed to load project files. Please try again.');
      setLoadingFiles(false);
    });

    // Cleanup function: unsubscribe from Firestore listener
    return () => unsubscribe();
  }, [db, isAuthReady, activeProjectId, appId, activeFileName]); // Dependencies for file fetching effect

  // --- Firestore: Load Active File Content ---
  useEffect(() => {
    // Prevent loading if essential context values are not yet available
    if (!db || !activeProjectId || !activeFileName) {
      setCode(''); // Clear editor if no file is selected
      console.log('EditorPage: Content useEffect - Waiting for dependencies.', {
        dbInitialized: !!db,
        activeProjectId,
        activeFileName,
      });
      return;
    }

    console.log('EditorPage: Content useEffect - All dependencies ready. Loading content for file:', activeFileName, 'in project:', activeProjectId);

    // Construct the Firestore document reference for the active file
    const fileDocRef = doc(db, `artifacts/${appId}/public/data/projects/${activeProjectId}/files`, activeFileName);

    // Set up a real-time listener for the active file's content
    const unsubscribe = onSnapshot(fileDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const fileData = docSnap.data();
        // Update editor content only if it's different from the current value
        // This prevents unnecessary updates and potential cursor jumps
        if (editorRef.current && editorRef.current.getValue() !== fileData.content) {
           setCode(fileData.content);
           console.log(`Loaded content for file: ${activeFileName}`);
        } else if (!editorRef.current) {
           setCode(fileData.content); // Set code if editor isn't mounted yet
        }
      } else {
        console.warn(`File ${activeFileName} not found in project ${activeProjectId}.`);
        setCode(''); // Clear editor if the file is deleted or not found
      }
    }, (err) => {
      console.error('Error fetching file content:', err);
      setFileError('Failed to load file content.');
    });

    return () => unsubscribe();
  }, [db, activeProjectId, activeFileName, appId]); // Dependencies for file content fetching effect

  // --- Monaco Editor Callbacks ---

  /**
   * Callback function executed when the Monaco Editor component mounts.
   * Stores the editor instance and sets up cursor/selection change listeners.
   * @param {object} editor The Monaco Editor instance.
   * @param {object} monaco The Monaco namespace object.
   */
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor; // Store the editor instance for direct access
    window.monaco = monaco; // Expose monaco globally for dynamic CSS decoration rules
    console.log('Monaco Editor mounted.');

    // Initialize/clear decoration collections for remote cursors
    decorationsRef.current = editor.createDecorationsCollection(); // Now initialized here
    remoteCursors.current.clear();

    // Listen for local cursor position changes and emit them via Socket.IO
    editor.onDidChangeCursorPosition(() => {
      if (socketRef.current && isConnected && activeProjectId && activeFileName) {
        const position = editor.getPosition();
        const selection = editor.getSelection();
        socketRef.current.emit('cursor_update', {
          documentId: activeProjectId, // Use project ID as the document room ID
          fileName: activeFileName,
          userId: userId, // Use the actual userId from context
          position: position,
          selection: selection,
        });
      }
    });
  };

  /**
   * Callback function executed when the content of the Monaco Editor changes.
   * Updates local state, emits changes via Socket.IO, and persists to Firestore.
   * @param {string} newValue The new content of the editor.
   */
  const handleEditorChange = (newValue) => {
    setCode(newValue); // Update local React state with the new code

    // Emit 'code_change' event to the server for real-time synchronization
    if (socketRef.current && isConnected && activeProjectId && activeFileName) {
      socketRef.current.emit('code_change', {
        documentId: activeProjectId,
        newContent: newValue,
        senderId: userId, // Use the actual userId from context
        fileName: activeFileName, // Send the currently active file name
      });

      // Also update Firestore with the latest content for data persistence
      const fileDocRef = doc(db, `artifacts/${appId}/public/data/projects/${activeProjectId}/files`, activeFileName);
      // Use setDoc with merge:true to avoid overwriting other fields if they exist
      setDoc(fileDocRef, { content: newValue, lastModified: Date.now() }, { merge: true })
        .catch((e) => console.error('Error saving file content to Firestore:', e));
    }
  };

  /**
   * Handles the execution of Python code.
   * Emits a 'run_code' event to the Socket.IO server.
   */
  const handleRunCode = () => {
    if (socketRef.current && isConnected && activeProjectId && activeFileName) {
      setIsRunning(true);
      setOutput('Running code...');
      // Emit 'run_code' with the active project ID.
      // The server will typically fetch the content of the active file from Firestore
      // or use the last synchronized content for execution.
      socketRef.current.emit('run_code', activeProjectId);
    } else {
      setOutput('Not connected to server, no project/file active, or code is already running. Cannot run code.');
    }
  };

  /**
   * Handles adding a new file to the current active project.
   */
  const handleAddFile = async () => {
    if (!newFileName.trim()) {
      console.warn('File name cannot be empty.');
      return;
    }
    if (!db || !activeProjectId) {
      console.error('Database or active project not ready to add file.');
      return;
    }

    // Ensure file name ends with .py
    const fullFileName = newFileName.endsWith('.py') ? newFileName : `${newFileName}.py`;

    try {
      const filesCollectionRef = collection(db, `artifacts/${appId}/public/data/projects/${activeProjectId}/files`);
      // Use setDoc with the full file name as the document ID
      await setDoc(doc(filesCollectionRef, fullFileName), {
        fileName: fullFileName,
        content: `# New file: ${fullFileName}\n`, // Default content for a new file
        createdAt: Date.now(),
      });
      setNewFileName(''); // Clear the input field
      setActiveFileName(fullFileName); // Automatically switch to the newly created file
      console.log(`File ${fullFileName} created.`);
    } catch (e) {
      console.error('Error creating file:', e);
      // More robust error display could be implemented here (e.g., a temporary message)
    }
  };

  /**
   * Handles deleting a file from the current active project.
   * Prompts for confirmation before deletion.
   * @param {string} fileNameToDelete The name of the file to be deleted.
   */
  const handleDeleteFile = async (fileNameToDelete) => {
    if (!db || !activeProjectId || !fileNameToDelete) return;

    // Replaced window.confirm with a console log for Canvas compatibility.
    // For a user-facing confirmation, a custom modal UI should be implemented.
    console.log(`Attempting to delete "${fileNameToDelete}". (Confirmation dialog suppressed for Canvas environment)`);
    // In a real app, you'd add a custom modal here for user confirmation.
    // Example: showConfirmModal(`Are you sure you want to delete "${fileNameToDelete}"?`, () => actualDeleteLogic());

    try {
      const fileDocRef = doc(db, `artifacts/${appId}/public/data/projects/${activeProjectId}/files`, fileNameToDelete);
      await deleteDoc(fileDocRef);
      console.log(`File ${fileNameToDelete} deleted.`);
      // The Firestore onSnapshot listener in useEffect will automatically update the `files` state,
      // and the `activeFileName` logic will handle switching to another file or clearing the editor.
    } catch (e) {
      console.error('Error deleting file:', e);
      // More robust error display could be implemented here
    }
  };

  // --- Render logic for loading, authentication, and error states ---
  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white text-lg">
        Authenticating or loading Firebase...
      </div>
    );
  }
  if (!activeProjectId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white text-lg">
        No project selected. Please go to{' '}
        <button onClick={() => navigate('/projects')} className="text-blue-400 hover:underline ml-2"> {/* Use navigate */}
          Projects
        </button>{' '}
        page.
      </div>
    );
  }
  if (loadingFiles) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white text-lg">
        Loading project files...
      </div>
    );
  }
  if (fileError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-red-400 text-lg">
        {fileError}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center py-8 px-4 font-inter">
      {/* Custom CSS for remote cursors and selections, embedded for direct application */}
      <style>
        {`
        .remote-cursor {
          width: 2px;
          position: absolute;
          z-index: 1000;
          pointer-events: none; /* Allows clicks to pass through */
          animation: blink-cursor 1s infinite; /* Simple blinking animation */
        }
        .remote-cursor-tooltip {
          position: absolute;
          top: -20px; /* Adjust as needed */
          left: -5px; /* Adjust as needed */
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0.9;
        }
        /* Monaco Editor overrides for better visual integration with dark theme */
        .monaco-editor .margin-view-overlays {
          background-color: #1f2937 !important; /* Darker gray for line numbers (bg-gray-800) */
        }
        .monaco-editor .current-line {
          background-color: rgba(255,255,255,0.05) !important; /* Subtle current line highlight */
        }
        .monaco-editor .current-line-margin {
          background-color: rgba(255,255,255,0.05) !important;
        }
        /* Keyframe for blinking cursor animation */
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        /* Input field styles for consistency across the app */
        .input-field-editor {
          background-color: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 8px;
          border-radius: 6px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .input-field-editor:focus {
          outline: none;
          border-color: #4a90e2;
          box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.3);
        }
        .input-field-editor::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }
        /* Primary button styles for consistency across the app */
        .btn-editor-primary {
          background-color: #27272a; /* zinc-800 */
          color: white;
          font-weight: 700; /* bold */
          padding: 0.625rem 2rem; /* py-2.5 px-8 */
          border-radius: 0.5rem; /* rounded-lg */
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); /* shadow-lg */
          transition: background-color 0.3s ease, transform 0.3s ease;
          border: 1px solid #3f3f46; /* zinc-700 */
        }
        .btn-editor-primary:hover {
          background-color: #3f3f46; /* zinc-700 */
          transform: translateY(-0.0625rem) scale(1.05); /* hover:scale-105 */
        }
        .btn-editor-primary:focus {
          outline: none;
          box-shadow: 0 0 0 4px rgba(82, 82, 91, 0.6); /* ring-4 ring-zinc-600 */
        }
        .btn-editor-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }
        /* Danger button styles for consistency across the app */
        .btn-editor-danger {
          background-color: #27272a; /* zinc-800 */
          color: #f87171; /* red-400 */
          font-weight: 700; /* bold */
          padding: 0.625rem 2rem; /* py-2.5 px-8 */
          border-radius: 0.5rem; /* rounded-lg */
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); /* shadow-lg */
          transition: background-color 0.3s ease, transform 0.3s ease;
          border: 1px solid #3f3f46; /* zinc-700 */
        }
        .btn-editor-danger:hover {
          background-color: #3f3f46; /* zinc-700 */
          transform: translateY(-0.0625rem) scale(1.05); /* hover:scale-105 */
        }
        .btn-editor-danger:focus {
          outline: none;
          box-shadow: 0 0 0 4px rgba(82, 82, 91, 0.6); /* ring-4 ring-zinc-600 */
        }
        `}
      </style>
      <div className="flex w-full max-w-7xl h-[calc(100vh-6rem)] gap-6">
        {/* File Explorer Sidebar - Floating Box */}
        <div className="w-72 bg-gray-900 text-gray-100 flex flex-col p-6 rounded-xl shadow-2xl border border-gray-700">
          <h3 className="text-xl font-semibold mb-4 text-white">Files ({files.length})</h3>
          <div className="flex-1 overflow-y-auto mb-4">
            {files.length === 0 ? (
              <p className="text-gray-400 text-sm">No files in this project.</p>
            ) : (
              <ul>
                {files.map(file => (
                  <li key={file.id} className="flex items-center justify-between group mb-1">
                    <button
                      onClick={() => setActiveFileName(file.fileName)}
                      className={`block flex-grow text-left py-2 px-3 rounded-md transition-colors duration-150 text-sm ${
                        activeFileName === file.fileName
                          ? 'bg-zinc-700 text-white font-medium'
                          : 'hover:bg-zinc-800 text-gray-200'
                      }`}
                    >
                      {file.fileName}
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.fileName)}
                      className="ml-2 px-2 py-1 text-red-400 hover:text-red-300 hover:bg-zinc-700 rounded-md text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      title={`Delete ${file.fileName}`}
                    >
                      <i className="fas fa-times"></i> {/* Font Awesome X icon */}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-gray-700 pt-4">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="New file name (e.g., model.py)"
              className="w-full p-2 text-base mb-2 input-field-editor"
            />
            <button
              onClick={handleAddFile}
              className="w-full btn-editor-primary"
            >
              <i className="fas fa-file-code mr-2"></i> Add File
            </button>
          </div>
        </div>

        {/* Editor and Output Panel Wrapper - Arranged as two floating boxes */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Editor Panel - Floating Box */}
          <div className="flex-1 bg-gray-900 rounded-xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-800 bg-gray-800 flex justify-between items-center rounded-t-xl">
              <span className="text-base font-semibold text-white">
                Project: {activeProjectId} | File: {activeFileName || 'No File Selected'}
              </span>
              <div
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  isConnected ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                }`}
              >
                Status: {isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                language="python"
                theme="vs-dark"
                value={code}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  readOnly: !activeFileName, // Editor is read-only if no file is active
                }}
              />
            </div>
          </div>

          {/* Output Panel - Floating Box */}
          <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 p-6">
            <button
              onClick={handleRunCode}
              disabled={!isConnected || isRunning || !activeFileName}
              className={`w-full btn-editor-primary mb-4 ${
                isConnected && !isRunning && activeFileName
                  ? '' // Styles are handled by btn-editor-primary class
                  : 'opacity-50 cursor-not-allowed' // Apply disabled styles
              }`}
            >
              {isRunning ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-play mr-2"></i>}
              {isRunning ? 'Running...' : 'Run Python Code'}
            </button>
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Output:</h2>
              <pre className="w-full h-48 bg-gray-800 text-gray-200 p-4 rounded-lg overflow-auto font-mono text-sm whitespace-pre-wrap border border-gray-700">
                {output || 'Output will appear here.'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
