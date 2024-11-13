from flask import Flask, request, jsonify, Response
from RAG import call_RAG
from langchain_groq import ChatGroq
import os

app = Flask(__name__)

UPLOAD_FOLDER = 'Data'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Allowed file types
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'pdf', 'txt'}

# Max file size (in bytes)
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16 MB

# Function to check the file extension
def allowed_file(filename) -> bool:
    """Check if the file has an allowed extension.

    Parameters:
        filename (str): The filename to check.

    Returns:
        bool: True if the file has an allowed extension, False otherwise.
    """
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/rag', methods=['POST'])
def call_rag() -> list:
    """
    Endpoint to process a query and past messages, retrieve relevant documents, and generate an answer.

    Expects a JSON payload with 'message', 'past_messages', and 'chatName' fields. Calls the call_RAG 
    function with these parameters to process the request.

    Returns:
        A list containing a status code and response content. If 'chatName' is 1, it also includes a 
        generated name for the chat.
    """
    data = request.get_json()
    message = data.get('message', "")
    past_messages = data.get('past_messages', [])
    chatName = data.get('chatName', 0)
    if (chatName == 1):
        result = call_RAG(message, past_messages, True)
    else:
        result = call_RAG(message, past_messages, False)

    return result


@app.route('/upload', methods=['POST'])
def upload_file():
    """
    Handles file uploads by checking for valid files and saving them to the server.

    This endpoint expects a multipart/form-data request with a 'file' part.
    The uploaded file is saved in the 'Data' directory with a timestamped filename.

    Returns:
        A JSON response indicating success or failure:
        - On success, returns a message and the file path with a 200 status code.
        - On failure, returns an error message with an appropriate status code.
    """
    # Generate an answer based on given user query and retrieved context information
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']

    # Check if the file has a valid filename
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    # Generate a timestamp for the file
    new_filename = f"{file.filename}"  # Add timestamp to filename

    # Save the file to the 'Data' directory
    try:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], new_filename)
        file.save(filepath)
        return jsonify({"message": "File uploaded successfully", "path": filepath}), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred while saving the file: {str(e)}"}), 500

@app.route('/delete', methods=['POST'])
def delete_file():
    """
    Handles file deletion by accepting a POST request with a JSON body containing
    the filename to be deleted.

    Returns:
        A JSON response indicating success or failure:
        - On success, returns a message with a 200 status code.
        - On failure, returns an error message with an appropriate status code.
    """
    data = request.get_json()
    filename = data.get('filename', '')

    if not filename:
        return jsonify({"error": "No filename provided"}), 400

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    try:
        os.remove(filepath)
        return jsonify({"message": "File deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred while deleting the file: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
