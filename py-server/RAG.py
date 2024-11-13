# Needed Packages :
# %pip install --upgrade langchain langchain-community langchain-chroma
# %pip install -qU langchain-groq
# %pip install langchain_openai
# %pip install --upgrade langchain_huggingface
# %pip install --upgrade unstructured openpyxl
# %pip install nltk
# %pip install --upgrade --quiet langchain sentence_transformers
# %pip install xlrd
# %pip install xformers
# %pip install pdf2image

### NOTE ###
# The embedding model (Jina Embeddings V3) and the LLM (Llama 3.2 90b) are used through API services offered by Jina AI and Groq respictively.
# However, both are open-source and can be downloaded and used locally.

# Imports:
from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain_text_splitters import RecursiveCharacterTextSplitter
import nltk
from langchain_community.document_loaders import UnstructuredExcelLoader
from langchain_community.document_loaders import TextLoader
from langchain_community.embeddings import JinaEmbeddings
from langchain.prompts import ChatPromptTemplate
from langchain_community.cache import SQLiteCache
from langchain_core.globals import set_llm_cache
from pdf2image import convert_from_path
import os
import glob
from langchain.embeddings import CacheBackedEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.storage import LocalFileStore
from langchain_core.messages import trim_messages, AIMessage, HumanMessage

## Imports for the PDF to text conversion using surya-ocr
from PIL import Image
from surya.ocr import run_ocr
from surya.model.detection.model import load_model as load_det_model, load_processor as load_det_processor
from surya.model.recognition.model import load_model as load_rec_model
from surya.model.recognition.processor import load_processor as load_rec_processor

# Path to the SQLite database for LLM caching
set_llm_cache(SQLiteCache(database_path=".langchain.db"))

# API keys
GROQ_API_KEY = os.environ['GROQ_API_KEY']
JINA_API_KEY = os.environ['JINA_API_KEY']

# Needed downloads for nltk (Only needs to be done once)
# nltk.download('punkt')
# nltk.download('wordnet')
# nltk.download('omw-1.4')


# Data Indexing:
# 1- Data Loading

# For Excel 
def load_excel_files(file_paths:list) -> list:
    """
    Load Excel files and return a list of Langchain Documents.

    Parameters:
        file_paths (list): List of file paths to Excel files

    Returns:
        list: A list of Langchain Documents
    """
    loader = UnstructuredExcelLoader(file_paths, mode='elements')
    doc = loader.load()
    return doc

# For txt
def load_text_files(file_path:str):
    """
    Loads a text file and returns a Langchain Document.

    Parameters:
        file_path (str): Path to the text file

    Returns:
        Document: A Langchain Document
    """
    loader = TextLoader(file_path=file_path)
    return loader.load()

# 2-Data Splitting

# split the doc into smaller chunks i.e. chunk_size=512
def split_documents(docs: list, chunk_size=512, chunk_overlap=128) -> list:
    """
    Splits the provided documents into smaller chunks with specified size and overlap.

    Parameters:
        docs (list): List of documents to be split.
        chunk_size (int, optional): The number of characters in each chunk (default is 512).
        chunk_overlap (int, optional): The number of overlapping characters between chunks (default is 128).

    Returns:
        list: A list of split document chunks with corrected metadata.
    """
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    chunks = text_splitter.split_documents(docs)
    
    # Fixing the metadata if something is wrong with it
    for chunk in chunks:
        for key, value in chunk.metadata.items():
            if isinstance(value, list):
                chunk.metadata[key] = ','.join(value)  # Convert list to a comma-separated string
    return chunks  


# 3-Data Embedding and data storing

def store_embeddings(chunks: list, CHROMA_PATH="vec_db"):
    """
    Store the given chunks as embeddings in a Chroma database.

    Parameters:
        chunks (list of Document): list of documents to be embedded
        CHROMA_PATH (str, optional): path where the Chroma database is stored (default is "vec_db")

    Returns:
        Chroma: the created Chroma database
    """
    store = LocalFileStore("./emb_cache/")
    embeddings = JinaEmbeddings(jina_api_key=JINA_API_KEY, model_name='jina-embeddings-v3')
    cached_embedder = CacheBackedEmbeddings.from_bytes_store(embeddings, store)
    
    # embed the chunks as vectors and load them into the database
    db_chroma = Chroma.from_documents(chunks, cached_embedder, persist_directory=CHROMA_PATH)
    return db_chroma


# Data Retrieval and Generation

# 1-Retrieval
def retrieve_documents(db_chroma, query: str, k=50) -> list[tuple]:
    """
    Retrieve context - top k most relevant (closest) chunks to the query vector
    
    Parameters:
        db_chroma (Chroma): database of embeddings
        query (str or np.ndarray): user query as a string or a vector
        k (int, optional): number of documents to retrieve (default is 50)
        
    Returns:
        list of tuple: list of retrieved documents and their scores
    """
    docs_chroma = db_chroma.similarity_search_with_score(query, k=k)
    return docs_chroma

#2-Generation
def generate_answer(docs_chroma: list, query: str, past_messages:str) -> str:
    """
    Generate an answer based on given user query and retrieved context information
    Parameters:
        docs_chroma (list of Document): retrieved context information
        query (str): user query
        past_messages (str): past questions and answers
    Returns:
        str: answer to the user query
    """

    context_text = "\n\n".join([doc.page_content + "\nFile: " + doc.metadata['filename'] for doc, _score in docs_chroma])
    
    if past_messages != "":
        context_text = "Past questions and answers:\n\n" + past_messages + "\n\nNew Context for question:\n\n" + context_text
    
    # Prompt template
    PROMPT_TEMPLATE = """
    Answer the question based only on the following context:
    {context}
    Answer the question based on the above context: {question}.
    Provide a detailed answer.
    Don't give information not mentioned in the CONTEXT INFORMATION.
    Return the names of the files that you found the answers in if they are available.
    Return in Markdown format.
    """

    # load retrieved context and user query in the prompt template
    prompt_template = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
    prompt = prompt_template.format(context=context_text, question=query)
    # call LLM model to generate the answer based on the given context and query
    model = ChatGroq(model="llama-3.2-90b-text-preview", api_key=GROQ_API_KEY)
    response_text = model.invoke(prompt)
    return response_text


def extract_text_from_pdf(pdf_path: str, langs=["en"]) -> str:
    """
    Extracts text from a PDF using Surya OCR and returns it as a single string.

    Parameters:
        pdf_path (str): Path to the PDF file.
        langs (list): List of language codes for OCR (e.g., ["en"] for English).

    Returns:
        str: Extracted text from the PDF.
    """
    # Load Surya models and processors
    det_processor, det_model = load_det_processor(), load_det_model()
    rec_model, rec_processor = load_rec_model(), load_rec_processor()

    # Convert PDF pages to images
    images = convert_from_path(pdf_path)

    # Run OCR on each page and collect text
    extracted_text = ""
    for image in images:
        # Perform OCR
        predictions = run_ocr([image], [langs], det_model, det_processor, rec_model, rec_processor)
        
        # Extract text lines from predictions
        for page in predictions:
            for line in page.text_lines:
                extracted_text += line.text + "\n"

    return extracted_text

# Function to process PDFs using glob
def save_extracted_text_from_pdfs(pdf_path:str, output_dir="temp_results", langs=["en"]) -> str:
    """
    Processes the PDF file at the given path and saves the extracted text to a text file.
    If the text file already exists, it skips processing that PDF.

    Parameters:
        pdf_path (str): Path to the PDF file.
        output_dir (str): Directory to save the extracted text files.
        langs (list): List of language codes for OCR (e.g., ["en"] for English
        
    Returns:
        str: Path to the saved text file
    """
    # Define the output text file path
    text_file_path = os.path.join(output_dir, "/".join(os.path.splitext(pdf_path)[0].split('/')[1:]) + ".txt")
    print(text_file_path)

    # check if the file path provided as an argument exists
    if os.path.exists(text_file_path):
        print(f"Skipping {pdf_path} as output file already exists.")
        return text_file_path
    
    print(f"Processing: {pdf_path}")

    # Extract text from PDF
    extracted_text = extract_text_from_pdf(pdf_path, langs=langs)

    # Create output directory if it does not exist
    os.makedirs(os.path.dirname(text_file_path), exist_ok=True)

    # Save the extracted text
    with open(text_file_path, 'w', encoding='utf-8') as f:
        f.write(extracted_text)

    print(f"Saved extracted text to: {text_file_path}")
    return text_file_path


def call_RAG(query:str, past_messages=[], chat_name=False) -> list:
    """
    Processes a query and past messages, retrieves relevant documents, and generates an answer.

    Parameters:
        query (str): The user query to process and answer.
        past_messages (list): A list of past conversation messages, each being a dictionary with 
            keys "human" and "ai".
        chat_name (bool): Flag indicating whether to generate a chat name based on the query.

    Returns:
        list: A list containing a status code and response content. If chat_name is True, 
        it also includes a generated name for the chat.

    The function processes different types of files (Excel, text, PDF) stored in the 'Data' directory
    by extracting text and metadata. It trims past messages based on a token limit, retrieves relevant 
    documents, and generates an answer using a language model. If chat_name is True, it generates a 
    chat name based on the first query.
    """
    Files = ["Data/" + file for file in os.listdir('Data/')]
    trimmed_messages = ""
    
    if len(past_messages) > 0:
        messages = []
        for message in past_messages:
            for k, v in message.items():
                if k == "human":
                    messages.append(HumanMessage(v))
                elif k == 'ai':
                    messages.append(AIMessage(v))
                    
        trimmed_messages = trim_messages(
        messages,
        strategy="last",
        token_counter=ChatGroq(model="llama-3.2-90b-text-preview", api_key=GROQ_API_KEY),
        max_tokens=250,
        start_on="human",
        end_on=("human", "tool"),
        include_system=True,
        allow_partial=True,
        )    

        trimmed_messages = "\n".join([t.content for t in trimmed_messages])
        
    # Load files 
    docs = []
    for file in Files:
        if file.lower().endswith(("xlsx","xls")):
            docs.extend(load_excel_files(file))
            
        elif file.lower().endswith("txt"):
            docs.extend(load_text_files(file))
            
        elif file.lower().endswith("pdf"):
            text_path = save_extracted_text_from_pdfs(file)
            text = load_text_files(text_path)
            for doc in text:
                doc.metadata['filename'] = doc.metadata.pop('source').split('/')[-1]
            docs.extend(text)   
        else:
            return [1, "Unsupported file"]

    # Split and store documents
    chunks = split_documents(docs)
    db_chroma = store_embeddings(chunks)

    docs_chroma = retrieve_documents(db_chroma, query)
    response = generate_answer(docs_chroma, query, trimmed_messages)
    
    if chat_name:
        llm = ChatGroq(model="llama-3.2-90b-text-preview", api_key=GROQ_API_KEY)
        answer = llm.invoke("Give me a sentence as a name for this chat if the first question is " + query + ". Return only the name and nothing else. Limit the name to 15 characters max. Make it readable and understandable.")
        return [0, response.content, answer.content]

    return [0, response.content]

