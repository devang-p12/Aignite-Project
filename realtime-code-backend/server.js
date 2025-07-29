// realtime-code-backend/server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { spawn } = require('child_process'); // For executing Python code
const fs = require('fs'); // For file system operations (creating/deleting temp files)
const path = require('path'); // For path manipulation

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
// In development, allow all origins (*).
// In production, replace "*" with your Vercel frontend's domain (e.g., "https://your-frontend-name.vercel.app").
const io = socketIo(server, {
  cors: {
    origin: "*", // IMPORTANT: Restrict this in production to your frontend's domain
    methods: ["GET", "POST"]
  }
});

// Also apply CORS middleware for Express app (if you have any HTTP routes, though primarily for Socket.IO's handshake)
app.use(cors({
  origin: "*", // IMPORTANT: Restrict this in production to your frontend's domain
  methods: ["GET", "POST"]
}));

// Define the port. Render will provide process.env.PORT in production.
// Fallback to 3000 for local development.
const PORT = process.env.PORT || 3000;

// In-memory store for document content.
// IMPORTANT: For true persistence and multi-server setups, this should be replaced
// with a database like Firestore, where the backend fetches/updates content.
// For this project, the frontend is already saving to Firestore, and this backend
// primarily serves for real-time sync and execution.
const documents = new Map(); // Map<documentId (projectId), codeContent>

io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  // Event: Client joins a specific document (project) room
  socket.on('join_document', (documentId) => {
    socket.join(documentId);
    console.log(`User ${socket.id} joined document room: ${documentId}`);
    // When a user joins, if the document content is known to the server,
    // you might send it here. In this app, frontend fetches from Firestore.
  });

  // Event: Client leaves a specific document (project) room
  socket.on('leave_document', (documentId) => {
    socket.leave(documentId);
    console.log(`User ${socket.id} left document: ${documentId}`);
  });

  // Event: Code content changed by a client
  socket.on('code_change', (data) => {
    const { documentId, newContent, senderId, fileName } = data;
    // Update the server's in-memory state for execution context.
    // Note: The frontend is also persisting this to Firestore.
    documents.set(documentId, newContent);
    // Broadcast the change to all other clients in the same document room
    socket.to(documentId).emit('code_change', { newContent, senderId, fileName });
    console.log(`Code change in ${fileName} for ${documentId} from ${senderId.substring(0, 4)}. Content length: ${newContent.length}`);
  });

  // Event: Cursor/selection position updated by a client
  socket.on('cursor_update', (data) => {
    const { documentId, fileName, userId, position, selection } = data;
    // Broadcast cursor/selection updates to all other clients in the same document room
    socket.to(documentId).emit('cursor_update', { userId, position, selection, fileName });
  });

  // Event: Client requests to run code
  socket.on('run_code', async (documentId) => {
    // Retrieve the code content from the in-memory store.
    // In a production setup, you might fetch the latest code from Firestore here
    // to ensure you're running the most up-to-date version.
    const codeToExecute = documents.get(documentId);
    if (!codeToExecute) {
      socket.emit('code_output', { output: 'No code found in server memory for this document. Please ensure the file is active and saved.', error: false });
      return;
    }

    console.log(`User ${socket.id} requested to run code in document ${documentId}`);

    let output = '';
    let errorOutput = '';
    const tempFileName = path.join(__dirname, `temp_script_${Date.now()}_${socket.id}.py`);

    try {
      // Write the code to a temporary file
      fs.writeFileSync(tempFileName, codeToExecute);
      console.log(`Code written to ${tempFileName}`);

      // Spawn a Python child process to execute the code
      // Using 'python3' for better compatibility on some Linux/Unix systems,
      // fallback to 'python' if 'python3' is not found.
      const pythonProcess = spawn('python3', [tempFileName]);

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        // Clean up the temporary file
        fs.unlink(tempFileName, (err) => {
          if (err) console.error(`Error deleting temp file ${tempFileName}:`, err);
        });

        if (code !== 0) {
          // If Python process exited with an error code
          socket.emit('code_output', {
            output: errorOutput || `Python process exited with non-zero code: ${code}`,
            error: true
          });
        } else {
          // Successful execution
          socket.emit('code_output', { output: output, error: false });
        }
      });

      pythonProcess.on('error', (err) => {
        // Handle errors in spawning the Python process itself (e.g., 'python' not found)
        console.error('Failed to start Python process:', err);
        socket.emit('code_output', {
          output: `Error: Could not start Python interpreter. Is Python installed and in your PATH? (${err.message})`,
          error: true
        });
        // Ensure temp file is cleaned up even if spawn fails
        fs.unlink(tempFileName, (unlinkErr) => {
          if (unlinkErr) console.error(`Error deleting temp file on spawn error ${tempFileName}:`, unlinkErr);
        });
      });

    } catch (writeError) {
      console.error('Error writing temporary file:', writeError);
      socket.emit('code_output', {
        output: `Server Error: Could not prepare code for execution. (${writeError.message})`,
        error: true
      });
    }
  });

  // Event: Client disconnects
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Start the server listening on the specified PORT
server.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
