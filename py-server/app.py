# ----------------------------------------------------------------------------------------
# ========================================================================================
#                                   my code [Start]
# ========================================================================================
# ----------------------------------------------------------------------------------------

# ┌─────────────────────────────────────────────────────────────┐
# │                   Notebook Utility Functions                │
# └─────────────────────────────────────────────────────────────┘

import nbformat
from typing import Dict, Any
import inspect
import ast

def load_notebook_functions(
    nb_path: str,
    target_globals: Dict[str, Any] = None,
    debug: bool = False
) -> None:
    """
    Loads all code from a Jupyter notebook into a specified global namespace.

    Args:
        nb_path (str): Path to the .ipynb notebook file.
        target_globals (Dict[str, Any], optional): The global namespace
            dictionary to load functions into. Defaults to current globals.
        debug (bool, optional): If True, enables detailed debug prints.
            Defaults to False.
    """
    if target_globals is None:
        target_globals = globals()

    try:
        if debug:
            print(f"🔍 Debug: Loading notebook from: {nb_path}")

        with open(nb_path, 'r', encoding='utf-8') as f:
            nb = nbformat.read(f, as_version=4)

        # Extract and join all code cells
        code_cells = [cell['source'] for cell in nb.cells if cell.cell_type == 'code']
        if not code_cells:
            print(f"⚠️ Warning: No code cells found in {nb_path}")
            return

        full_code = '\n\n'.join(code_cells)

        if debug:
            print("📦 Debug: Executing collected code...")
            print(f"\n--- Notebook Code ---\n{full_code}\n---------------------")

        # Execute code in the target global namespace
        exec(full_code, target_globals)
        print(f"✅ Success: Functions loaded from {nb_path}")

    except FileNotFoundError:
        print(f"❌ Error: Notebook not found at {nb_path}")
        raise
    # except nbformat.reader.NotJupyterNotebookError: # Corrected exception name
    #     print(f"❌ Error: {nb_path} is not a valid Jupyter notebook or is corrupted.")
    #     raise
    except SyntaxError as e: # Catch SyntaxError specifically
        print(f"❌ Syntax Error in notebook {nb_path}: {e}")
        print("💡 Hint: This often means your notebook contains non-Python commands (like magic commands % or ! commands) in its code cells.")
        if debug:
            print(f"🐛 Debug: Please check the output of 'full_code' above for the problematic line.")
        raise
    except Exception as e:
        print(f"❌ An unexpected error occurred while loading {nb_path}: {e}")
        if debug:
            print(f"🐛 Debug: Detailed error: {e}")
        raise

# ┌─────────────────────────────────────────────────────────────┐
# │           Function Inspection Utility                       │
# └─────────────────────────────────────────────────────────────┘

def list_loaded_functions(
    source_globals: Dict[str, Any] = None,
    debug: bool = False
) -> None:
    """
    Prints details (arguments and annotations) of user-defined functions
    found in the specified global namespace, typically those loaded
    from notebooks or defined in the current script.

    Args:
        source_globals (Dict[str, Any], optional): The global namespace
            dictionary to inspect. Defaults to the current globals().
        debug (bool, optional): If True, enables detailed debug prints.
            Defaults to False.
    """
    if source_globals is None:
        source_globals = globals()

    print("\n📝 Listing functions with arguments and annotations:")
    found_functions = False

    for name, obj in source_globals.items():
        # Check if it's a callable function defined in the '__main__' module.
        # Functions loaded via `exec` into `globals()` typically appear here.
        if inspect.isfunction(obj) and obj.__module__ == '__main__':
            found_functions = True
            try:
                sig = inspect.signature(obj)
                params_str = []
                for param_name, param in sig.parameters.items():
                    param_info = param_name
                    # Add annotation if present
                    if param.annotation is not inspect.Parameter.empty:
                        param_info += f": {str(param.annotation).replace('typing.', '')}"
                    # Add default value if present
                    if param.default is not inspect.Parameter.empty:
                        param_info += f" = {repr(param.default)}"
                    params_str.append(param_info)

                return_annotation = ""
                if sig.return_annotation is not inspect.Signature.empty:
                    return_annotation = f" -> {str(sig.return_annotation).replace('typing.', '')}"

                print(f"  - 📏 Function: {name}({', '.join(params_str)}){return_annotation}")
                if debug:
                    print(f"    🔍 Debug: Original module path: {obj.__module__}")

            except ValueError as e:
                # This can happen for built-in functions or special objects
                if debug:
                    print(f"    🐛 Debug: Could not get signature for {name}: {e}")
                else:
                    print(f"  - 📏 Function: {name} (Signature not fully inspectable)")
            except Exception as e:
                if debug:
                    print(f"    🐛 Debug: Unexpected error inspecting {name}: {e}")
                pass # Continue to next item

    if not found_functions:
        print("  - No user-defined functions found in the specified namespace.")
    print("✨ Function listing complete.")
    
    
load_notebook_functions("RAG.ipynb", debug=False)

# ----------------------------------------------------------------------------------------
# ========================================================================================
#                                   my code [End]
# ========================================================================================
# ----------------------------------------------------------------------------------------



from flask import Flask, request, jsonify, Response
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
