
 
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
    except nbformat.reader.NotJupyterNotebookError: # Corrected exception name
        print(f"❌ Error: {nb_path} is not a valid Jupyter notebook or is corrupted.")
        raise
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


message = """What is revenue of ELM in Q2 2024?"""
past_messages = []
result = call_RAG(message)
print(result[1])