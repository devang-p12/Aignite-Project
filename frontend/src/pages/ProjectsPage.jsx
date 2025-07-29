import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { collection, doc, setDoc, onSnapshot, query, orderBy, deleteDoc, getDoc } from 'firebase/firestore';
import { generateUUID } from '../utils/uuid';
import { useNavigate } from 'react-router-dom'; // Import useNavigate hook

// Projects Page Component
const ProjectsPage = () => {
  const { db, userId, isAuthReady, appId, setActiveProjectId, setActiveFileName } = useContext(AppContext);
  const navigate = useNavigate(); // Initialize useNavigate hook

  const [projects, setProjects] = useState([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectIdToJoin, setProjectIdToJoin] = useState(''); // New state for joining project
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null); // For displaying user messages (e.g., project name empty)
  const [showConfirmModal, setShowConfirmModal] = useState(false); // State for confirmation modal
  const [projectToDelete, setProjectToDelete] = useState(null); // Project to delete when modal is open

  useEffect(() => {
    if (!isAuthReady || !db || !userId) {
      setLoading(true);
      return;
    }

    setLoading(true);
    setError(null);

    // Firestore path for user's private projects
    const projectsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/projects`);
    // Order by createdAt in descending order to show latest projects first
    const q = query(projectsCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsList);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching projects:", err);
      setError("Failed to load projects. Please try again.");
      setLoading(false);
    });

    return () => unsubscribe(); // Clean up listener on component unmount
  }, [db, userId, isAuthReady, appId]); // Add appId to dependencies to re-run effect if it changes

  // Function to display a temporary message
  const displayMessage = (msg, type = 'info') => {
    setMessage({ text: msg, type });
    const timer = setTimeout(() => {
      setMessage(null);
    }, 3000); // Message disappears after 3 seconds
    return () => clearTimeout(timer);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      displayMessage("Project name cannot be empty.", 'error');
      return;
    }
    if (!db || !userId) {
      displayMessage("Database or user not ready.", 'error');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const newProjectId = generateUUID(); // Generate a UUID for the project
      const projectsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/projects`);
      const projectDocRef = doc(projectsCollectionRef, newProjectId); // Use generated UUID as document ID

      await setDoc(projectDocRef, {
        name: newProjectName,
        createdAt: Date.now(),
        ownerId: userId,
        projectId: newProjectId // Store the ID within the document too
      });

      // Create a default 'main.py' file for the new project in public data
      const filesCollectionRef = collection(db, `artifacts/${appId}/public/data/projects/${newProjectId}/files`);
      await setDoc(doc(filesCollectionRef, 'main.py'), {
        fileName: 'main.py',
        content: '# Start coding your AI model here!\nprint("Hello from AI Collab!")',
        createdAt: Date.now()
      });

      setNewProjectName('');
      displayMessage("Project created successfully!", 'success');
      console.log("Project created with ID:", newProjectId);
      handleOpenProject(newProjectId, 'main.py'); // Open the new project
    } catch (e) {
      console.error("Error creating project:", e);
      setError("Failed to create project. Please try again.");
      displayMessage("Failed to create project.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProject = (projectId, fileName = 'main.py') => {
    setActiveProjectId(projectId);
    setActiveFileName(fileName);
    navigate('/editor'); // Use navigate to go to the editor page
  };

  const handleJoinProject = async () => {
    if (!projectIdToJoin.trim()) {
      displayMessage("Project ID cannot be empty.", 'error');
      return;
    }
    if (!db || !userId) {
      displayMessage("Database or user not ready.", 'error');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Verify if the project exists by checking its public files collection
      const filesCollectionRef = collection(db, `artifacts/${appId}/public/data/projects/${projectIdToJoin}/files`);
      const firstFileDoc = await getDoc(doc(filesCollectionRef, 'main.py')); // Check for a default file

      if (!firstFileDoc.exists()) {
        setError("Project with this ID does not exist or has no files.");
        displayMessage("Project with this ID does not exist or has no files.", 'error');
        setLoading(false);
        return;
      }

      // If it exists, add it to the current user's projects list if not already there
      const projectDocRef = doc(collection(db, `artifacts/${appId}/users/${userId}/projects`), projectIdToJoin);
      const projectDocSnap = await getDoc(projectDocRef);

      if (!projectDocSnap.exists()) {
        // Fetch project name from a public metadata if available, or use a default
        // For simplicity, we'll just add a generic entry to the user's list
        await setDoc(projectDocRef, {
          name: `Joined Project (${projectIdToJoin.substring(0, 8)}...)`, // Generic name
          createdAt: Date.now(),
          ownerId: userId, // Current user is now an 'owner' in their list
          projectId: projectIdToJoin
        });
        displayMessage(`Successfully joined project!`, 'success');
        console.log(`User ${userId} joined project ${projectIdToJoin}.`);
      } else {
        displayMessage(`You are already part of this project.`, 'info');
        console.log(`User ${userId} already has project ${projectIdToJoin} in their list.`);
      }

      setProjectIdToJoin('');
      handleOpenProject(projectIdToJoin, 'main.py'); // Open the joined project
    } catch (e) {
      console.error("Error joining project:", e);
      setError("Failed to join project. Please check the ID and try again.");
      displayMessage("Failed to join project. Please check the ID and try again.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteProject = (projectId, projectName) => {
    setProjectToDelete({ id: projectId, name: projectName });
    setShowConfirmModal(true);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete || !db || !userId) return;

    const { id: projectIdToDelete, name: projectName } = projectToDelete;

    setLoading(true);
    setError(null);
    setShowConfirmModal(false); // Close the modal

    try {
      // Delete project document from user's private list
      const projectDocRef = doc(db, `artifacts/${appId}/users/${userId}/projects`, projectIdToDelete);
      await deleteDoc(projectDocRef);

      // IMPORTANT: Deleting associated files from public/data is more complex
      // as Firestore doesn't have cascade deletes. You'd need to:
      // 1. Get all file documents for this project.
      // 2. Delete them one by one.
      // For simplicity in this demo, we only delete the project entry from the user's list.
      // The files themselves will remain in public/data unless manually cleaned up or
      // a more advanced backend function handles it.
      displayMessage(`Project "${projectName}" deleted from your list.`, 'success');
      console.log(`Project ${projectIdToDelete} deleted from user's list.`);
      setProjectToDelete(null); // Clear the project to delete
    } catch (e) {
      console.error("Error deleting project:", e);
      setError("Failed to delete project. Please try again.");
      displayMessage("Failed to delete project.", 'error');
    } finally {
      setLoading(false);
    }
  };


  // Render loading, authentication, and error states
  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center p-8 text-white text-xl font-medium animate-pulse">
          Authenticating...
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center p-8 text-white text-xl font-medium">
          Loading projects...
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center p-8 text-red-300 text-xl font-medium border border-red-700 bg-red-900 rounded-lg shadow-md">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-inter">
      <div className="max-w-6xl w-full space-y-8 bg-gray-900 p-10 rounded-xl shadow-2xl border border-gray-700"> {/* Changed max-w-4xl to max-w-6xl */}
        <h2 className="text-center text-4xl font-extrabold text-white mb-8 tracking-tight"> {/* Changed text-5xl to text-4xl */}
          My Projects
        </h2>

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-lg text-center font-semibold text-lg ${ /* Changed text-xl to text-lg */
            message.type === 'error' ? 'bg-red-900/50 text-red-300 border border-red-700' :
            message.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-700' :
            'bg-blue-900/50 text-blue-300 border border-blue-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Create New Project Section */}
        <div className="p-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg shadow-lg border border-gray-700">
          <h3 className="text-2xl font-bold text-blue-300 mb-6 text-center">Create New Project</h3> {/* Changed text-3xl to text-2xl */}
          <div className="flex flex-col sm:flex-row gap-5">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Enter new project name"
              className="flex-grow p-3 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-600 focus:border-blue-400 text-base transition-all duration-200 bg-gray-800 text-white placeholder-gray-500" /* Changed p-4 to p-3, text-lg to text-base */
            />
            <button
              onClick={handleCreateProject}
              className="w-full sm:w-auto bg-zinc-800 text-white font-bold py-2.5 px-8 rounded-lg shadow-lg hover:bg-zinc-700 transform hover:scale-105 transition-all duration-300 ease-in-out
                         focus:outline-none focus:ring-4 focus:ring-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700" /* Changed py-4 to py-2.5 */
              disabled={loading}
            >
              Create Project
            </button>
          </div>
        </div>

        {/* Join Existing Project Section */}
        <div className="p-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg shadow-lg border border-gray-700">
          <h3 className="text-2xl font-bold text-purple-300 mb-6 text-center">Join Project by ID</h3> {/* Changed text-3xl to text-2xl */}
          <div className="flex flex-col sm:flex-row gap-5">
            <input
              type="text"
              value={projectIdToJoin}
              onChange={(e) => setProjectIdToJoin(e.target.value)}
              placeholder="Enter Project ID to join"
              className="flex-grow p-3 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-4 focus:ring-purple-600 focus:border-purple-400 text-base transition-all duration-200 bg-gray-800 text-white placeholder-gray-500" /* Changed p-4 to p-3, text-lg to text-base */
            />
            <button
              onClick={handleJoinProject}
              className="w-full sm:w-auto bg-zinc-800 text-white font-bold py-2.5 px-8 rounded-lg shadow-lg hover:bg-zinc-700 transform hover:scale-105 transition-all duration-300 ease-in-out
                         focus:outline-none focus:ring-4 focus:ring-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700" /* Changed py-4 to py-2.5 */
              disabled={loading}
            >
              Join Project
            </button>
          </div>
        </div>

        {/* Your Projects List Section */}
        <h3 className="text-2xl font-bold text-white mb-6 text-center pt-6">Your Projects ({projects.length})</h3> {/* Changed text-3xl to text-2xl */}
        {projects.length === 0 ? (
          <p className="text-gray-300 text-center text-base p-6 bg-gray-800 rounded-lg border border-gray-700 shadow-inner"> {/* Changed text-xl to text-base */}
            No projects found. Create one or join an existing one!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map(project => (
              <div key={project.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                <div>
                  <h4 className="text-xl font-extrabold text-white mb-2 truncate" title={project.name}>{project.name}</h4> {/* Changed text-2xl to text-xl */}
                  <p className="text-sm text-gray-400 mb-1">
                    <span className="font-semibold">ID:</span> {project.projectId.substring(0, 8)}...
                  </p>
                  <p className="text-sm text-gray-400">
                    <span className="font-semibold">Created:</span> {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                  {project.ownerId === userId && ( // Display "Owned by Me" if current user is owner
                    <p className="text-xs text-blue-400 mt-1">Owned by Me</p>
                  )}
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => handleOpenProject(project.projectId)}
                    className="flex-grow bg-zinc-800 text-white font-bold py-2.5 px-8 rounded-lg shadow-md hover:bg-zinc-700 transform hover:scale-105 transition-all duration-300 ease-in-out
                               focus:outline-none focus:ring-4 focus:ring-zinc-600 border border-zinc-700" /* Changed py-3 to py-2.5, px-6 to px-8 */
                  >
                    Open Project
                  </button>
                  <button
                    onClick={() => confirmDeleteProject(project.projectId, project.name)}
                    className="bg-zinc-800 text-red-400 font-bold py-2.5 px-8 rounded-lg shadow-md hover:bg-zinc-700 transform hover:scale-105 transition-all duration-300 ease-in-out
                               focus:outline-none focus:ring-4 focus:ring-zinc-600 border border-zinc-700" /* Changed py-3 to py-2.5, px-6 to px-8 */
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
              <h3 className="text-xl font-bold text-white mb-4">Confirm Deletion</h3> {/* Changed text-2xl to text-xl */}
              <p className="text-gray-300 mb-6 text-base"> {/* Added text-base */}
                Are you sure you want to delete project "<span className="font-semibold text-white">{projectToDelete?.name}</span>" from YOUR list? This will not delete it for other collaborators.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="bg-gray-700 text-white font-semibold py-2.5 px-6 rounded-lg shadow-md hover:bg-gray-600 transition-colors duration-200" /* Changed py-3 to py-2.5 */
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProject}
                  className="bg-red-700 text-white font-semibold py-2.5 px-6 rounded-lg shadow-md hover:bg-red-800 transition-colors duration-200" /* Changed py-3 to py-2.5 */
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;
