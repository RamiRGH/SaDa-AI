# Data-Z: Document Analysis Chat Application

This project is a web-based chat application that allows users to upload documents and ask questions about their content. The application uses a Retrieval-Augmented Generation (RAG) model to provide intelligent and robust answers based on the uploaded files.

## Features

- **File Upload:** Supports uploading various file formats, including `.xlsx`, `.xls`, `.pdf`, and `.txt`.
- **Intelligent Chat:** A conversational interface to query and analyze the content of the uploaded documents.
- **Rich Content Rendering:** AI responses are rendered as Markdown, with support for tables, mathematical formulas (LaTeX), and code blocks.
- **Chat History:** Conversations are saved and can be revisited later.
- **Dual-Server Architecture:** A robust architecture separating the frontend and application logic from the core AI/ML processing.

## Architecture

The application is built with a two-part architecture: a Node.js server that handles the frontend and user interactions, and a Python server that provides the AI-powered RAG functionality.

### 1. Node.js (Express.js) Server

This server acts as the primary backend for the user-facing application.

- **Responsibilities:**
  - Serving the frontend web application (HTML, CSS, client-side JavaScript).
  - Managing user sessions and file uploads.
  - Storing and retrieving chat history and file metadata from JSON-based "databases" (`files-db.json`, `chats-db.json`).
  - Acting as a proxy to communicate with the Python AI server, forwarding user queries and returning AI responses.
- **Key Technologies:**
  - **Express.js:** Web application framework.
  - **EJS (Embedded JavaScript templates):** Templating engine for rendering dynamic HTML.
  - **Multer:** Middleware for handling file uploads.
  - **Axios:** For making HTTP requests to the Python server.
  - **Marked, DOMPurify, KaTeX:** Client-side libraries for secure and rich rendering of Markdown, tables, and mathematical formulas.

### 2. Python (Flask) Server

This server contains the core machine learning model and logic.

- **Responsibilities:**
  - Providing an API for the Node.js server.
  - Processing and embedding uploaded documents into a vector store for efficient retrieval.
  - Handling user queries using a Retrieval-Augmented Generation (RAG) pipeline to find relevant information and generate answers.
- **Key Technologies:**
  - **Flask:** Micro web framework for creating the AI API.
  - **LangChain:** Framework for building the RAG pipeline.
  - **Vector Database (ChromaDB):** For storing and querying document embeddings.
  - **SQLlite DB**: For caching questions and their answers.

## Setup and Installation

To run this project locally, you need to set up and run both the Node.js and Python servers.

### Prerequisites

- [Node.js](https://nodejs.org/) and npm
- [Python](https://www.python.org/) and pip

### 1. Python AI Server

First, set up the Flask server which provides the AI capabilities.

```bash
# 1. Navigate to the Python server directory
cd py-server

# 2. (Recommended) Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows, use: .venv\Scripts\activate

# 3. Install the required Python packages
pip install -r requirements.txt

# 4. Run the Flask application
python app.py
```
The Python server will typically run on `http://127.0.0.1:5000`.

### 2. Node.js Frontend Server

Next, set up the Express.js server which serves the user interface.

```bash
# 1. Navigate to the Node.js server directory in a new terminal
cd nodejs

# 2. Install the required npm packages
npm i
npm i nodemon 

# 3. Run the Express application
npx nodemon app.js
```
The Node.js server will run on `http://localhost:3000`. You can now access the application by opening this URL in your web browser.

## File Structure

Here is an overview of the key files and directories in the project:

```
.
├── nodejs/
│   ├── app.js              # Main Express.js application logic
│   ├── chats-db.json       # Stores metadata for all chat sessions
│   ├── files-db.json       # Stores metadata for all uploaded files
│   ├── package.json        # Node.js dependencies and project info
│   ├── chats/              # Stores individual chat message histories
│   ├── public/             # Static assets (CSS, JS, images)
│   └── views/              # EJS templates for the frontend
│
└── py-server/
    ├── app.py              # Main Flask application with AI/RAG endpoints
    ├── requirements.txt    # Python dependencies
    ├── Data/               # Directory for storing data used by the RAG model
    └── RAG.ipynb           # Jupyter Notebook containing everything concerning the RAG and AI architecture 
```

## Usage

1.  **Open the Application:** Navigate to `http://localhost:3000` in your browser.
2.  **Upload a File:** On the dashboard, use the upload form to select and upload a document.
3.  **Start a Chat:** Click the "New Chat" button to start a new conversation.
4.  **Ask Questions:** Type your questions about the uploaded document in the chat input box. The AI will process your query and provide a detailed answer based on the document's content.
