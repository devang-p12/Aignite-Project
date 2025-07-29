import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { collection, doc, setDoc, onSnapshot, query, orderBy, deleteDoc, getDoc } from 'firebase/firestore'; // Added getDoc
import { generateUUID } from '../utils/uuid';

// Projects Page Component
const ProjectsPage = () => {
  const { db, userId, isAuthReady, appId, setCurrentPage, setActiveProjectId, setActiveFileName } = useContext(AppContext);
  const [projects, setProjects] = useState([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectIdToJoin, setProjectIdToJoin] = useState(''); // New state for joining project
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthReady || !db || !userId) {
      setLoading(true);
      return;
    }

    setLoading(true);
    setError(null);

    // Firestore path for user's private projects
    const projectsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/projects`);
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

    return () => unsubscribe(); // Clean up listener
  }, [db, userId, isAuthReady, appId]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !db || !userId) {
      alert("Project name cannot be empty.");
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
      console.log("Project created with ID:", newProjectId);
      handleOpenProject(newProjectId, 'main.py'); // Open the new project
    } catch (e) {
      console.error("Error creating project:", e);
      setError("Failed to create project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProject = (projectId, fileName = 'main.py') => {
    setActiveProjectId(projectId);
    setActiveFileName(fileName);
    setCurrentPage('editor');
  };

  const handleJoinProject = async () => {
    if (!projectIdToJoin.trim() || !db || !userId) {
      alert("Project ID cannot be empty.");
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
        console.log(`User ${userId} joined project ${projectIdToJoin}.`);
      } else {
        console.log(`User ${userId} already has project ${projectIdToJoin} in their list.`);
      }

      setProjectIdToJoin('');
      handleOpenProject(projectIdToJoin, 'main.py'); // Open the joined project
    } catch (e) {
      console.error("Error joining project:", e);
      setError("Failed to join project. Please check the ID and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectIdToDelete, projectName) => {
    if (!db || !userId) return;

    const confirmed = window.confirm(`Are you sure you want to delete project "${projectName}" from YOUR list? This will not delete it for other collaborators.`);
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      // Delete project document from user's private list
      const projectDocRef = doc(db, `artifacts/${appId}/users/${userId}/projects`, projectIdToDelete);
      await deleteDoc(projectDocRef);

      console.log(`Project ${projectIdToDelete} deleted from user's list.`);

    } catch (e) {
      console.error("Error deleting project:", e);
      setError("Failed to delete project. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  if (!isAuthReady) {
    return <div className="text-center p-8 text-gray-600">Authenticating...</div>;
  }
  if (loading) {
    return <div className="text-center p-8 text-gray-600">Loading projects...</div>;
  }
  if (error) {
    return <div className="text-center p-8 text-red-600">{error}</div>;
  }

  return (
    <div className="container mx-auto p-8 my-8 bg-white shadow-lg rounded-lg">
      <h2 className="text-4xl font-bold text-gray-800 mb-6 text-center">My Projects</h2>

      {/* Create New Project Section */}
      <div className="mb-8 p-6 bg-blue-50 rounded-lg shadow-inner">
        <h3 className="text-2xl font-semibold text-blue-800 mb-4">Create New Project</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Enter new project name"
            className="flex-grow p-3 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCreateProject}
            className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-md shadow-md hover:bg-blue-700 transition-colors duration-200"
            disabled={loading}
          >
            Create Project
          </button>
        </div>
      </div>

      {/* Join Existing Project Section */}
      <div className="mb-8 p-6 bg-purple-50 rounded-lg shadow-inner">
        <h3 className="text-2xl font-semibold text-purple-800 mb-4">Join Project by ID</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={projectIdToJoin}
            onChange={(e) => setProjectIdToJoin(e.target.value)}
            placeholder="Enter Project ID to join"
            className="flex-grow p-3 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleJoinProject}
            className="bg-purple-600 text-white font-semibold py-3 px-6 rounded-md shadow-md hover:bg-purple-700 transition-colors duration-200"
            disabled={loading}
          >
            Join Project
          </button>
        </div>
      </div>

      {/* Your Projects List Section */}
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">Your Projects ({projects.length})</h3>
      {projects.length === 0 ? (
        <p className="text-gray-600 text-center">No projects found. Create one or join an existing one!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <div key={project.id} className="bg-gray-50 border border-gray-200 rounded-lg p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-xl font-bold text-gray-800 mb-2">{project.name}</h4>
                <p className="text-sm text-gray-500 mb-3">ID: {project.projectId}</p>
                <p className="text-sm text-gray-500">Created: {new Date(project.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => handleOpenProject(project.projectId)}
                  className="flex-grow bg-green-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-700 transition-colors duration-200"
                >
                  Open Project
                </button>
                <button
                  onClick={() => handleDeleteProject(project.projectId, project.name)}
                  className="bg-red-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-red-600 transition-colors duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
