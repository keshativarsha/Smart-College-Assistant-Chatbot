# Smart College Assistant Chatbot

A beginner-friendly B.Tech major-project prototype with a web frontend, Flask backend, SQLite database, document upload, source-labelled document retrieval, and a student deadline tracker.

## What is included?

- **Frontend:** HTML, CSS, JavaScript, responsive dashboard and chat interface.
- **Backend:** Python + Flask REST API.
- **Database:** SQLite (created automatically when the app starts).
- **Document upload:** PDF, TXT, and Markdown files.
- **Chat answers:** Searches uploaded document text and shows the source filename.
- **Safe fallback:** If the system cannot find a likely match, it says it could not find a reliable answer.
- **Deadline tracker:** Add, list, and delete exam/assignment/placement tasks.

## Important limitation

This is a working **baseline prototype**, not a full generative-AI/RAG implementation. It uses simple keyword-overlap retrieval and returns relevant text passages. It does not train a machine-learning model or use an LLM. That makes it free to run and easier to understand. For a research-grade version, you can later add semantic embeddings, a vector database, an LLM, multilingual support, login roles, and scheduled notifications.

Only upload documents you are allowed to use. This starter app is intended for local college-project demonstrations, not public deployment with private student information.

## Requirements

- Python 3.10 or newer
- Internet connection only to install packages
- A browser such as Chrome or Edge
- VS Code (recommended, optional)

## Setup on Windows

1. Extract `smart_college_assistant.zip`.
2. Open the extracted folder in VS Code.
3. Open Terminal → New Terminal.
4. Create a virtual environment:

   ```powershell
   py -m venv .venv
   ```

5. Activate it:

   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

   If PowerShell blocks activation, use Command Prompt and run:

   ```bat
   .venv\Scripts\activate.bat
   ```

6. Install the packages:

   ```bash
   python -m pip install -r requirements.txt
   ```

7. Start the app:

   ```bash
   python app.py
   ```

8. Open this address in your browser:

   `http://127.0.0.1:5000`

The database is created automatically in the project folder.

## First test

1. Upload a text-based college PDF or `.txt` file that contains sample information, such as exam rules or placement requirements.
2. Ask a question using words that appear in the document.
3. Check that the response includes a source filename.
4. Ask something unrelated and confirm that the chatbot gives its fallback message.
5. Add a deadline in the Deadline Tracker, refresh the page, and verify that it remains saved.

### Sample text document

Create a file called `sample_college_notice.txt` with content such as:

```text
Placement Registration Notice
Eligible final-year students must register by 30 October 2026.
Students should keep an updated resume, college ID, and academic details ready.
The placement cell will share the interview schedule through the official student portal.
```

Upload it and ask: `What should students keep ready for placement registration?`

## How the pieces connect

```text
Browser (HTML/CSS/JavaScript)
          |
          | HTTP requests: fetch()
          v
Flask backend (app.py)
          |
          +---- Document extraction and keyword retrieval
          |
          +---- SQLite database
                    |
                    +---- Uploaded document text
                    +---- Student deadlines
```

## Main API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/` | Display frontend |
| POST | `/api/chat` | Ask a question |
| POST | `/api/documents` | Upload a document |
| GET | `/api/documents` | List uploaded documents |
| DELETE | `/api/documents/<id>` | Remove a document from the knowledge base |
| GET | `/api/tasks` | List deadlines |
| POST | `/api/tasks` | Add a deadline |
| DELETE | `/api/tasks/<id>` | Delete a deadline |
| GET | `/api/health` | Check backend status |

## Project modules for your report

1. User interface and chat module
2. Document upload and text extraction module
3. Document retrieval and answer module
4. Source display and fallback module
5. Deadline management module
6. Database module
7. Testing and evaluation module

## Suggested future enhancements

- Replace keyword retrieval with Sentence Transformers embeddings and FAISS/Chroma.
- Add RAG generation using a model/API approved by your guide.
- Add login and role-based admin access before using real college data.
- Add Telugu/English support and evaluate it separately.
- Add reminder delivery through email or notifications.
- Evaluate answer correctness, source correctness, fallback behaviour, response time, and task completion against a baseline.

## Troubleshooting

- **`python` is not recognized:** Install Python 3.10+ and select “Add Python to PATH”, then reopen Terminal.
- **`ModuleNotFoundError`:** Activate `.venv` and run `python -m pip install -r requirements.txt`.
- **PDF uploads but no text is found:** It may be a scanned/image-only PDF. Use an OCR tool to convert it to searchable text, then upload again.
- **Page does not open:** Confirm the terminal says Flask is running, then visit `http://127.0.0.1:5000`.
- **Changes do not show:** Refresh the browser. Keep the terminal open while the app runs.

## Academic honesty note

Describe only the features that you have actually implemented and tested. In your literature survey, compare this prototype with real papers and existing systems; do not claim the project is unique without evidence.
