import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

// Dummy Article Data (replace with real content or fetch from a CMS/Firestore)
const articlesData = [
  {
    id: 'intro-to-tensorflow',
    title: 'Introduction to TensorFlow: Building Your First Model',
    category: 'Frameworks',
    content: `
      <p class="mb-4">TensorFlow is an open-source machine learning framework developed by Google. It's widely used for various tasks, including neural networks, natural language processing, and computer vision. This guide will help you build your very first model.</p>
      <h4 class="text-xl font-semibold text-white mb-2">1. Installation</h4>
      <p class="mb-4">To get started, install TensorFlow using pip:</p>
      <pre class="bg-gray-700 p-3 rounded-md text-sm mb-4 overflow-x-auto"><code>pip install tensorflow</code></pre>
      <h4 class="text-xl font-semibold text-white mb-2">2. Basic Model Example</h4>
      <p class="mb-4">Let's create a simple linear regression model:</p>
      <pre class="bg-gray-700 p-3 rounded-md text-sm mb-4 overflow-x-auto"><code>
import tensorflow as tf
import numpy as np

# Prepare data
X = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0], dtype=float)
Y = np.array([2.0, 4.0, 6.0, 8.0, 10.0, 12.0], dtype=float)

# Define the model
model = tf.keras.Sequential([tf.keras.layers.Dense(units=1, input_shape=[1])])

# Compile the model
model.compile(optimizer='sgd', loss='mean_squared_error')

# Train the model
model.fit(X, Y, epochs=500)

# Predict
print(model.predict([10.0]))
      </code></pre>
      <p>This simple example demonstrates the core steps: data preparation, model definition, compilation, and training.</p>
    `,
    createdAt: new Date('2023-01-15T10:00:00Z'),
  },
  {
    id: 'pytorch-basics',
    title: 'PyTorch Basics: Tensors and Autograd',
    category: 'Frameworks',
    content: `
      <p class="mb-4">PyTorch is another popular open-source machine learning library primarily developed by Facebook's AI Research lab (FAIR). It's known for its flexibility and Pythonic interface, making it a favorite for research and rapid prototyping.</p>
      <h4 class="text-xl font-semibold text-white mb-2">1. Tensors</h4>
      <p class="mb-4">In PyTorch, data is represented as tensors, which are multi-dimensional arrays. Let's create some:</p>
      <pre class="bg-gray-700 p-3 rounded-md text-sm mb-4 overflow-x-auto"><code>
import torch

# Create a tensor from a list
x = torch.tensor([[1, 2], [3, 4]])
print(x)

# Create a tensor of zeros
zeros = torch.zeros(2, 3)
print(zeros)

# Create a tensor with random values
rand_tensor = torch.rand(2, 2)
print(rand_tensor)
      </code></pre>
      <h4 class="text-xl font-semibold text-white mb-2">2. Autograd: Automatic Differentiation</h4>
      <p class="mb-4">PyTorch's <code>autograd</code> system automatically computes gradients for all operations, which is crucial for training neural networks.</p>
      <pre class="bg-gray-700 p-3 rounded-md text-sm mb-4 overflow-x-auto"><code>
import torch

x = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)
y = x * 2
z = y.sum()

z.backward() # Computes gradients

print(x.grad) # Gradients of z with respect to x
      </code></pre>
      <p>This feature simplifies the implementation of backpropagation.</p>
    `,
    createdAt: new Date('2023-02-20T11:30:00Z'),
  },
  {
    id: 'understanding-llms',
    title: 'Understanding Large Language Models (LLMs)',
    category: 'Concepts',
    content: `
      <p class="mb-4">Large Language Models (LLMs) are a type of artificial intelligence program that can generate human-like text. They are trained on vast amounts of text data, allowing them to understand context, generate coherent paragraphs, and even perform tasks like translation or summarization.</p>
      <h4 class="text-xl font-semibold text-white mb-2">How LLMs Work</h4>
      <p class="mb-4">LLMs are typically based on transformer architectures. They learn patterns, grammar, facts, and reasoning abilities from the text they are trained on. When given a prompt, they predict the most probable next word, iteratively building a response.</p>
      <h4 class="text-xl font-semibold text-white mb-2">Applications of LLMs</h4>
      <ul class="list-disc list-inside mb-4 pl-4 text-gray-300">
        <li>Content generation (articles, stories, marketing copy)</li>
        <li>Chatbots and virtual assistants</li>
        <li>Code generation and completion</li>
        <li>Language translation</li>
        <li>Data analysis and summarization</li>
      </ul>
      <p>The field of LLMs is rapidly evolving, with new models and applications emerging constantly.</p>
    `,
    createdAt: new Date('2023-03-10T09:00:00Z'),
  },
  {
    id: 'ethical-ai-development',
    title: 'Ethical Considerations in AI Development',
    category: 'Ethics',
    content: `
      <p class="mb-4">As AI becomes more integrated into our daily lives, it's crucial to consider the ethical implications of its development and deployment. Ethical AI aims to ensure that AI systems are fair, transparent, accountable, and beneficial to society.</p>
      <h4 class="text-xl font-semibold text-white mb-2">Key Ethical Principles</h4>
      <ul class="list-disc list-inside mb-4 pl-4 text-gray-300">
        <li><strong>Fairness:</strong> Avoiding bias and discrimination in AI outputs.</li>
        <li><strong>Transparency:</strong> Understanding how AI decisions are made.</li>
        <li><strong>Accountability:</strong> Establishing responsibility for AI's impact.</li>
        <li><strong>Privacy:</strong> Protecting user data used by AI systems.</li>
        <li><strong>Safety and Reliability:</strong> Ensuring AI systems function as intended without harm.</li>
      </ul>
      <p>Developing AI ethically requires a multidisciplinary approach, involving technologists, ethicists, policymakers, and the public.</p>
    `,
    createdAt: new Date('2023-04-05T14:00:00Z'),
  },
];

// Documentation Page Component
const DocumentationPage = () => {
  const { db, userId, isAuthReady, appId, userName } = useContext(AppContext); // Get userName
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(true);
  const [commentError, setCommentError] = useState(null);
  const [postError, setPostError] = useState(null); // For errors specific to posting comments

  // State to manage the currently selected article
  const [selectedArticleId, setSelectedArticleId] = useState(articlesData[0]?.id || null);

  // Derive the currently selected article object
  const selectedArticle = articlesData.find(article => article.id === selectedArticleId);

  // Fetch comments for the selected article from Firestore
  useEffect(() => {
    if (!isAuthReady || !db || !userId || !selectedArticleId) {
      setCommentLoading(true);
      setComments([]); // Clear comments if no article selected or not ready
      return;
    }

    setCommentLoading(true);
    setCommentError(null);

    // Dynamic Firestore path for comments based on selected article ID
    const commentsCollectionRef = collection(db, `artifacts/${appId}/public/data/articles/${selectedArticleId}/comments`);
    // Order comments by creation time
    const q = query(commentsCollectionRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComments(commentsList);
      setCommentLoading(false);
    }, (err) => {
      console.error("Error fetching comments:", err);
      setCommentError("Failed to load comments. Please try again.");
      setCommentLoading(false);
    });

    return () => unsubscribe(); // Clean up listener
  }, [db, userId, isAuthReady, appId, selectedArticleId]); // Re-run when selectedArticleId changes

  // Handle posting a new comment
  const handlePostComment = async () => {
    if (!newCommentText.trim()) {
      setPostError("Comment cannot be empty.");
      return;
    }
    if (!db || !userId || !selectedArticleId) {
      setPostError("Authentication, database, or article not ready.");
      return;
    }

    setPostError(null); // Clear previous errors
    try {
      // Post comment to the specific article's comments collection
      const commentsCollectionRef = collection(db, `artifacts/${appId}/public/data/articles/${selectedArticleId}/comments`);
      await addDoc(commentsCollectionRef, {
        text: newCommentText,
        userId: userId, // Store the user ID of the commenter
        userName: userName, // Store the user's display name
        createdAt: serverTimestamp() // Use serverTimestamp for consistent time across clients
      });
      setNewCommentText(''); // Clear input field after posting
      console.log("Comment posted successfully!");
    } catch (e) {
      console.error("Error posting comment:", e);
      setPostError("Failed to post comment. Please try again.");
    }
  };

  if (!isAuthReady) {
    return <div className="flex items-center justify-center min-h-screen bg-black text-white text-lg">Authenticating...</div>;
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center py-12 px-4 font-inter">
      <div className="max-w-6xl w-full space-y-8 bg-gray-900 p-10 rounded-xl shadow-2xl border border-gray-700"> {/* Wider container */}
        <h2 className="text-center text-4xl font-extrabold text-white mb-6 tracking-tight">AIgnite Knowledge Base</h2>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Sidebar: Article List */}
          <div className="md:w-1/4 bg-gray-800 p-6 rounded-xl shadow-inner border border-gray-700 flex-shrink-0">
            <h3 className="text-xl font-bold text-white mb-4">Articles</h3>
            <ul className="space-y-2">
              {articlesData.map(article => (
                <li key={article.id}>
                  <button
                    onClick={() => setSelectedArticleId(article.id)}
                    className={`block w-full text-left py-2 px-3 rounded-md transition-colors duration-150 text-sm ${
                      selectedArticleId === article.id
                        ? 'bg-blue-700 text-white font-medium'
                        : 'hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    {article.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Main Content: Selected Article and Comments */}
          <div className="md:w-3/4 flex-grow space-y-8">
            {selectedArticle ? (
              <>
                {/* Article Content Section */}
                <div className="bg-gray-800 p-8 rounded-xl shadow-inner border border-gray-700">
                  <h3 className="text-3xl font-bold text-blue-300 mb-4">{selectedArticle.title}</h3>
                  <p className="text-sm text-gray-500 mb-6">Category: {selectedArticle.category} | Published: {new Date(selectedArticle.createdAt).toLocaleDateString()}</p>
                  <div className="text-md text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedArticle.content }}></div>
                </div>

                {/* Comments Section */}
                <div className="bg-gray-800 p-8 rounded-xl shadow-inner border border-gray-700">
                  <h3 className="text-2xl font-bold text-white mb-4 text-center">Comments</h3>

                  {commentError && (
                    <div className="p-4 rounded-lg text-center font-semibold bg-red-900/50 text-red-300 border border-red-700 mb-4">
                      {commentError}
                    </div>
                  )}

                  {commentLoading ? (
                    <p className="text-gray-400 text-center">Loading comments...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-gray-400 text-center">No comments yet. Be the first to comment!</p>
                  ) : (
                    <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                      {comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-700 p-4 rounded-lg border border-gray-600 shadow-sm">
                          <p className="text-sm text-gray-400 mb-1">
                            <span className="font-semibold text-blue-300">{comment.userName || comment.userId.substring(0, 8)}</span>{' '} {/* Display userName */}
                            <span className="text-xs text-gray-500">
                              {comment.createdAt ? new Date(comment.createdAt.toDate()).toLocaleString() : 'Loading date...'}
                            </span>
                          </p>
                          <p className="text-md text-gray-200">{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* New Comment Input */}
                  <div className="mt-6 border-t border-gray-700 pt-6">
                    <h4 className="text-xl font-semibold text-white mb-3">Post a Comment</h4>
                    {postError && (
                      <div className="p-3 rounded-lg text-center font-semibold bg-red-900/50 text-red-300 border border-red-700 mb-3 text-sm">
                        {postError}
                      </div>
                    )}
                    <textarea
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Write your comment here..."
                      rows="4"
                      className="w-full p-3 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-600 focus:border-blue-400 text-base transition-all duration-200 bg-gray-700 text-white placeholder-gray-400 resize-y"
                    ></textarea>
                    <button
                      onClick={handlePostComment}
                      className="mt-4 w-full bg-zinc-800 text-white font-bold py-2.5 px-8 rounded-lg shadow-lg hover:bg-zinc-700 transform hover:scale-105 transition-all duration-300 ease-in-out
                                 focus:outline-none focus:ring-4 focus:ring-zinc-600 border border-zinc-700"
                    >
                      Post Comment
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-gray-800 p-8 rounded-xl shadow-inner border border-gray-700 text-center text-gray-300">
                Please select an article from the sidebar to view its content.
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Custom Scrollbar Style */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #374151; /* gray-700 */
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #6b7280; /* gray-500 */
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af; /* gray-400 */
        }
      `}</style>
    </div>
  );
};

export default DocumentationPage;
