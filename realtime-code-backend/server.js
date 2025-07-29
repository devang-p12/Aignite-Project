// realtime-code-backend/server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST"]
  }
});

app.use(cors());

const PORT = process.env.PORT || 3000;

const documents = new Map(); // Map<documentId, codeContent> - still used for code execution context

io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  socket.on('join_document', (documentId) => {
    socket.join(documentId);
    console.log(`User ${socket.id} joined document: ${documentId}`);
  });

  socket.on('leave_document', (documentId) => {
    socket.leave(documentId);
    console.log(`User ${socket.id} left document: ${documentId}`);
  });

  socket.on('code_change', (data) => {
    const { documentId, newContent, senderId, fileName } = data;
    documents.set(documentId, newContent); // Update server's state for execution context
    socket.to(documentId).emit('code_change', { newContent, senderId, fileName });
  });

  socket.on('cursor_update', (data) => {
    const { documentId, fileName, userId, position, selection } = data;
    socket.to(documentId).emit('cursor_update', { userId, position, selection, fileName });
  });

  socket.on('run_code', async (documentId) => {
    const codeToExecute = documents.get(documentId);
    if (!codeToExecute) {
      socket.emit('code_output', { output: 'No code to run in this document.', error: false });
      return;
    }

    console.log(`User ${socket.id} requested to run code in document ${documentId}`);
    console.log('--- Code to Execute ---');
    console.log(codeToExecute);
    console.log('-----------------------');

    let output = '';
    let error = '';

    const pythonProcess = spawn('python', ['-c', codeToExecute]);

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      if (code !== 0) {
        socket.emit('code_output', {
          output: error || `Python process exited with non-zero code: ${code}`,
          error: true
        });
      } else {
        socket.emit('code_output', { output: output, error: false });
      }
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      socket.emit('code_output', {
        output: `Error: Could not start Python interpreter. Is Python installed and in your PATH? (${err.message})`,
        error: true
      });
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});