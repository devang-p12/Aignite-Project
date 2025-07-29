import React, { useState, useEffect, useRef, useContext } from 'react';
import { io } from 'socket.io-client';
import { Editor } from '@monaco-editor/react';
import { AppContext } from '../context/AppContext';
import { collection, doc, setDoc, onSnapshot, query, orderBy, deleteDoc } from 'firebase/firestore';

// Define the Socket.IO server URL
const SOCKET_SERVER_URL = 'http://localhost:3000';

// Editor Page Component
const EditorPage = () => {
  const { db, userId, appId, isAuthReady, activeProjectId, activeFileName, setActiveFileName, setCurrentPage } = useContext(AppContext);

  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [files, setFiles] = useState([]); // List of files in the project
  const [newFileName, setNewFileName] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [fileError, setFileError] = useState(null);

  const socketRef = useRef(null);
  const editorRef = useRef(null); // Monaco editor instance
  const decorationsRef = useRef({}); // To store remote cursors/selections (Monaco decoration IDs)
  const remoteCursors = useRef(new Map()); // Map<userId, {cursorWidget, selectionDecorationId}>

  // --- Socket.IO Connection & Real-time Sync ---
  useEffect(() => {
    if (!activeProjectId || !userId) return; // Wait for project and user ID

    // Disconnect existing socket if any to prevent multiple connections
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    socketRef.current = io(SOCKET_SERVER_URL);

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      console.log('Socket Connected!');
      // Join a unique document room based on the active project ID
      socketRef.current.emit('join_document', activeProjectId);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket Disconnected.');
      // Clear all remote cursors on disconnect
      if (editorRef.current) {
          editorRef.current.deltaDecorations(Array.from(decorationsRef.current.values()), []);
          decorationsRef.current = {};
          remoteCursors.current.clear();
      }
    });

    // Handle incoming code changes from other collaborators
    socketRef.current.on('code_change', (data) => {
      const { newContent, senderId, fileName: changedFileName } = data;
      // Apply change only if it's from a different user AND for the currently active file
      if (socketRef.current.id !== senderId && changedFileName === activeFileName) {
        console.log(`Received remote code change for ${changedFileName}:`, newContent.substring(0, 50) + '...');
        if (editorRef.current && editorRef.current.getValue() !== newContent) {
          // Monaco's setValue updates the editor content
          editorRef.current.setValue(newContent);
        }
      }
    });

    // Handle incoming cursor/selection updates from other collaborators
    socketRef.current.on('cursor_update', (data) => {
      const { userId: remoteUserId, position, selection, fileName: updatedFileName } = data;
      // Ignore self's updates, updates for other files, or if editor not ready
      if (socketRef.current.id === remoteUserId || updatedFileName !== activeFileName || !editorRef.current || !window.monaco) {
        return;
      }

      const editor = editorRef.current;
      const model = editor.getModel();
      if (!model) return;

      // Get current decorations for this user
      let currentDecorations = remoteCursors.current.get(remoteUserId) || {
          cursorWidget: null,
          selectionDecorationId: [] // Array of decoration IDs
      };
      let newDecorations = [];

      // 1. Update/Create Cursor Widget (Monaco Content Widget)
      let cursorWidget = currentDecorations.cursorWidget;
      if (!cursorWidget) {
          cursorWidget = {
              domNode: document.createElement('div'),
              position: { lineNumber: position.lineNumber, column: position.column },
              allowEditorOverflow: true,
              suppressMouseDown: true
          };
          cursorWidget.domNode.className = 'remote-cursor';
          cursorWidget.domNode.style.backgroundColor = '#007bff'; // Example color
          cursorWidget.domNode.style.width = '2px';
          cursorWidget.domNode.style.height = `${editor.getOption(window.monaco.editor.EditorOption.lineHeight)}px`;
          cursorWidget.domNode.style.position = 'absolute';
          cursorWidget.domNode.style.zIndex = '1000';
          cursorWidget.domNode.style.pointerEvents = 'none'; // Don't block clicks
          // Add a tooltip for the user's ID
          const tooltip = document.createElement('span');
          tooltip.className = 'remote-cursor-tooltip';
          tooltip.textContent = remoteUserId.substring(0, 4); // Short ID for display
          cursorWidget.domNode.appendChild(tooltip);

          editor.addContentWidget(cursorWidget);
          currentDecorations.cursorWidget = cursorWidget;
      } else {
          cursorWidget.position = { lineNumber: position.lineNumber, column: position.column };
          editor.layoutContentWidget(cursorWidget);
      }

      // 2. Update/Create Selection Decoration
      if (selection && (selection.startLineNumber !== selection.endLineNumber || selection.startColumn !== selection.endColumn)) {
          const newRange = new window.monaco.Range(
              selection.startLineNumber, selection.startColumn,
              selection.endLineNumber, selection.endColumn
          );
          newDecorations.push({
              range: newRange,
              options: {
                  className: 'remote-selection', // Main class for background
                  isWholeLine: false, // Apply only to selected text
                  stickiness: window.monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                  // backgroundColor: 'rgba(0, 0, 255, 0.3)' // Example color, can use CSS class for more control
              }
          });
      }

      // Apply new decorations and update the decoration ID
      // deltaDecorations returns an array of new decoration IDs
      const newDecorationIds = editor.deltaDecorations(
          currentDecorations.selectionDecorationId, // Old decoration IDs to remove
          newDecorations
      );
      currentDecorations.selectionDecorationId = newDecorationIds; // Store new IDs

      remoteCursors.current.set(remoteUserId, currentDecorations);
      // console.log(`Remote cursor/selection updated for ${remoteUserId}`);
    });

    // Handle code execution output from the server
    socketRef.current.on('code_output', (data) => {
      setIsRunning(false); // Code execution finished
      if (data.error) {
        setOutput(`Error:\n${data.output}`);
        console.error('Code execution error:', data.output);
      } else {
        setOutput(data.output);
        console.log('Code output:', data.output);
      }
    });

    // Cleanup function: disconnect socket when component unmounts
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      // Clean up all remote cursors/selections when leaving editor page
      if (editorRef.current) {
          editorRef.current.deltaDecorations(Array.from(decorationsRef.current.values()), []);
          decorationsRef.current = {};
          remoteCursors.current.forEach(cursor => {
              if (cursor.cursorWidget) editorRef.current.removeContentWidget(cursor.cursorWidget);
          });
          remoteCursors.current.clear();
      }
    };
  }, [activeProjectId, activeFileName, userId]); // Re-run effect if project or file changes

  // --- Firestore: Fetch Files for Active Project ---
  useEffect(() => {
    if (!db || !isAuthReady || !activeProjectId) {
      setLoadingFiles(true);
      return;
    }

    setLoadingFiles(true);
    setFileError(null);

    // Public path for project files (accessible by anyone with projectId)
    const filesCollectionRef = collection(db, `artifacts/${appId}/public/data/projects/${activeProjectId}/files`);
    const q = query(filesCollectionRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFiles(filesList);
      setLoadingFiles(false);

      // If no active file is set, or current active file is deleted,
      // set the first file as active.
      if (!activeFileName || !filesList.some(f => f.fileName === activeFileName)) {
          if (filesList.length > 0) {
              setActiveFileName(filesList[0].fileName);
          } else {
              setActiveFileName(null); // No files in project
              setCode(''); // Clear editor
          }
      }
    }, (err) => {
      console.error("Error fetching files:", err);
      setFileError("Failed to load project files. Please try again.");
      setLoadingFiles(false);
    });

    return () => unsubscribe(); // Clean up listener
  }, [db, isAuthReady, activeProjectId, activeFileName, appId]); // Depend on activeFileName to re-evaluate default

  // --- Firestore: Load Active File Content ---
  useEffect(() => {
    if (!db || !activeProjectId || !activeFileName) {
      setCode(''); // Clear editor if no file selected
      return;
    }

    const fileDocRef = doc(db, `artifacts/${appId}/public/data/projects/${activeProjectId}/files`, activeFileName);

    const unsubscribe = onSnapshot(fileDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const fileData = docSnap.data();
        // Only update if content is different to avoid flickering/loops
        if (editorRef.current && editorRef.current.getValue() !== fileData.content) {
           setCode(fileData.content);
           console.log(`Loaded content for file: ${activeFileName}`);
        } else if (!editorRef.current) {
           setCode(fileData.content); // Set code if editor isn't mounted yet
        }
      } else {
        console.warn(`File ${activeFileName} not found in project ${activeProjectId}.`);
        setCode(''); // File might have been deleted or not yet created
      }
    }, (err) => {
      console.error("Error fetching file content:", err);
      setFileError("Failed to load file content.");
    });

    return () => unsubscribe();
  }, [db, activeProjectId, activeFileName, appId]); // Re-fetch when active file changes

  // --- Monaco Editor Callbacks ---
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor; // Store the editor instance
    window.monaco = monaco; // Expose monaco instance globally for decorators (for CSS)
    console.log("Monaco Editor mounted.");

    // Clear any stale remote cursors/selections from previous sessions
    decorationsRef.current = editor.createDecorationsCollection();
    remoteCursors.current.clear();

    // Listen for local cursor/selection changes and emit to others
    editor.onDidChangeCursorPosition(() => {
      if (socketRef.current && isConnected && activeProjectId && activeFileName) {
        const position = editor.getPosition();
        const selection = editor.getSelection();
        socketRef.current.emit('cursor_update', {
          documentId: activeProjectId, // Use project ID as document ID for room
          fileName: activeFileName,
          userId: socketRef.current.id,
          position: position,
          selection: selection
        });
      }
    });
  };

  // Handle local code changes in the Monaco Editor
  const handleEditorChange = (newValue, event) => {
    setCode(newValue); // Update local React state

    // Emit 'code_change' event to the server for real-time sync
    if (socketRef.current && isConnected && activeProjectId && activeFileName) {
      socketRef.current.emit('code_change', {
        documentId: activeProjectId,
        newContent: newValue,
        senderId: socketRef.current.id,
        fileName: activeFileName // Send the active file name
      });

      // Also update Firestore with the latest content for persistence
      const fileDocRef = doc(db, `artifacts/${appId}/public/data/projects/${activeProjectId}/files`, activeFileName);
      // Use setDoc with merge:true to avoid overwriting other fields if they exist
      setDoc(fileDocRef, { content: newValue, lastModified: Date.now() }, { merge: true })
        .catch(e => console.error("Error saving file content to Firestore:", e));
    }
  };

  // Handler for running the code
  const handleRunCode = () => {
    if (socketRef.current && isConnected && activeProjectId && activeFileName) {
      setIsRunning(true);
      setOutput('Running code...');
      // When running code, we send the content of the active file
      // The backend assumes 'documentId' (projectId) maps to the current active file's content
      // This is a simplification; for multi-file projects, you might send the specific file's content
      // or instruct the backend to read it from Firestore.
      socketRef.current.emit('run_code', activeProjectId);
    } else {
      setOutput('Not connected to server, no project/file active, or code is already running. Cannot run code.');
    }
  };

  // Handler for adding a new file
  const handleAddFile = async () => {
    if (!newFileName.trim() || !db || !activeProjectId) {
      alert("File name cannot be empty.");
      return;
    }
    const fullFileName = newFileName.endsWith('.py') ? newFileName : `${newFileName}.py`;

    try {
      const filesCollectionRef = collection(db, `artifacts/${appId}/public/data/projects/${activeProjectId}/files`);
      // Use setDoc with the file name as the document ID
      await setDoc(doc(filesCollectionRef, fullFileName), {
        fileName: fullFileName,
        content: `# New file: ${fullFileName}\n`,
        createdAt: Date.now()
      });
      setNewFileName('');
      setActiveFileName(fullFileName); // Automatically switch to the new file
      console.log(`File ${fullFileName} created.`);
    } catch (e) {
      console.error("Error creating file:", e);
      alert("Failed to create file.");
    }
  };

  // Handler for deleting a file
  const handleDeleteFile = async (fileNameToDelete) => {
    if (!db || !activeProjectId || !fileNameToDelete) return;

    const confirmed = window.confirm(`Are you sure you want to delete "${fileNameToDelete}"?`);
    if (!confirmed) return;

    try {
      const fileDocRef = doc(db, `artifacts/${appId}/public/data/projects/${activeProjectId}/files`, fileNameToDelete);
      await deleteDoc(fileDocRef);
      console.log(`File ${fileNameToDelete} deleted.`);
      // Firestore snapshot listener will automatically update `files` state
      // and `activeFileName` logic in useEffect will handle switching to another file or clearing.
    } catch (e) {
      console.error("Error deleting file:", e);
      alert("Failed to delete file.");
    }
  };

  // Render loading/error states
  if (!isAuthReady || !db || !userId) {
    return <div className="text-center p-8 text-gray-600">Authenticating or loading Firebase...</div>;
  }
  if (!activeProjectId) {
    return <div className="text-center p-8 text-gray-600">No project selected. Please go to <button onClick={() => setCurrentPage('projects')} className="text-blue-600 hover:underline">Projects</button> page.</div>;
  }
  if (loadingFiles) {
        return <div className="text-center p-8 text-gray-600">Loading project files...</div>;
  }
  if (fileError) {
        return <div className="text-center p-8 text-red-600">{fileError}</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-100 font-inter">
      {/* Custom CSS for remote cursors/selections */}
      <style>
        {`
        .remote-cursor {
          background-color: #007bff; /* Blue cursor */
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
          background-color: #007bff;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0.9;
        }
        .remote-selection {
          background-color: rgba(0, 123, 255, 0.3); /* Blue semi-transparent selection */
        }
        /* Monaco Editor overrides for better visual integration */
        .monaco-editor .margin-view-overlays {
          background-color: #f3f4f6 !important; /* Light gray for line numbers */
        }
        .monaco-editor .current-line {
          background-color: rgba(0,0,0,0.05) !important; /* Subtle current line highlight */
        }
        .monaco-editor .current-line-margin {
          background-color: rgba(0,0,0,0.05) !important;
        }
        /* Keyframe for blinking cursor */
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        `}
      </style>
      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer Sidebar */}
        <div className="w-64 bg-gray-800 text-gray-100 flex flex-col p-4 shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-white">Files ({files.length})</h3>
          <div className="flex-1 overflow-y-auto mb-4">
            {files.length === 0 ? (
              <p className="text-gray-400 text-sm">No files in this project.</p>
            ) : (
              <ul>
                {files.map(file => (
                  <li key={file.id} className="flex items-center justify-between group">
                    <button
                      onClick={() => setActiveFileName(file.fileName)}
                      className={`block w-full text-left py-2 px-3 rounded-md transition-colors duration-150 ${
                        activeFileName === file.fileName
                          ? 'bg-blue-600 text-white font-medium'
                          : 'hover:bg-gray-700 text-gray-200'
                      }`}
                    >
                      {file.fileName}
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.fileName)}
                      className="ml-2 px-2 py-1 text-red-400 hover:text-red-200 hover:bg-red-700 rounded-md text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      title={`Delete ${file.fileName}`}
                    >
                      &times;
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
              className="w-full p-2 mb-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleAddFile}
              className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition-colors duration-200"
            >
              Add File
            </button>
          </div>
        </div>

        {/* Editor and Output Panel */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-800">
              Project: {activeProjectId} | File: {activeFileName || 'No File Selected'}
            </span>
            <div
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
                fontSize: 14,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                readOnly: !activeFileName // Make editor read-only if no file selected
              }}
            />
          </div>
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleRunCode}
              disabled={!isConnected || isRunning || !activeFileName}
              className={`w-full py-2 px-4 rounded-md font-semibold transition-colors duration-200 ${
                isConnected && !isRunning && activeFileName
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  : 'bg-gray-400 text-gray-700 cursor-not-allowed'
              }`}
            >
              {isRunning ? 'Running...' : 'Run Python Code'}
            </button>
            <div className="mt-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Output:</h2>
              <pre className="w-full h-48 bg-gray-800 text-white p-4 rounded-lg overflow-auto font-mono text-sm whitespace-pre-wrap">
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
