const messages = document.getElementById("messages");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const clearChatBtn = document.getElementById("clear-chat-btn");

const noticeTimers = new Map();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function formatMessage(text) {
  let escaped = escapeHtml(text);
  // Convert markdown bold **text** to <strong>text</strong>
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Convert markdown italic *(text)* or *text* to <em>text</em>
  escaped = escaped.replace(/\*(.*?)\*/g, "<em>$1</em>");
  // Convert horizontal separator
  escaped = escaped.replace(/---/g, '<hr class="bubble-divider">');
  // Convert newlines to <br>
  return escaped.replace(/\n/g, "<br>");
}

function showNotice(element, text, isError = false) {
  if (noticeTimers.has(element)) {
    clearTimeout(noticeTimers.get(element));
  }
  element.hidden = false;
  element.textContent = text;
  element.className = `notice ${isError ? "error" : "success"}`;

  const timer = setTimeout(() => {
    element.hidden = true;
  }, 4500);
  noticeTimers.set(element, timer);
}

function addMessage(role, text, sources = []) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role}`;

  const formattedContent = role === "assistant" ? formatMessage(text) : escapeHtml(text);
  const sourceHtml = (sources && sources.length)
    ? `<div class="source-list"><strong>Sources:</strong><br>${sources.map(s => `<span class="source-pill">📄 ${escapeHtml(s)}</span>`).join("")}</div>`
    : "";

  if (role === "assistant") {
    wrapper.innerHTML = `
      <div class="avatar">SC</div>
      <div class="bubble">
        ${formattedContent}
        ${sourceHtml}
      </div>
    `;
  } else {
    wrapper.innerHTML = `<div class="bubble">${formattedContent}</div>`;
  }

  messages.appendChild(wrapper);
  messages.scrollTop = messages.scrollHeight;
}

async function sendQuestion(question) {
  const trimmed = question.trim();
  if (!trimmed) return;

  addMessage("user", trimmed);
  messageInput.value = "";
  sendButton.disabled = true;
  sendButton.textContent = "Thinking...";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmed })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Something went wrong.");
    }
    addMessage("assistant", data.answer, data.sources || []);
  } catch (error) {
    addMessage("assistant", `Sorry, I could not process that request. (${error.message})`);
  } finally {
    sendButton.disabled = false;
    sendButton.innerHTML = 'Send <span>➤</span>';
    messageInput.focus();
  }
}

chatForm.addEventListener("submit", event => {
  event.preventDefault();
  sendQuestion(messageInput.value);
});

document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => {
    sendQuestion(button.dataset.question);
  });
});

if (clearChatBtn) {
  clearChatBtn.addEventListener("click", () => {
    messages.innerHTML = `
      <div class="message assistant">
        <div class="avatar">SC</div>
        <div class="bubble">
          <strong>Chat cleared! 🧹</strong>
          <p>Ask a new question about college notices, exam rules, or placements below.</p>
        </div>
      </div>
    `;
  });
}

// Upload Handling & Drag-and-Drop
const uploadForm = document.getElementById("upload-form");
const fileInput = document.getElementById("document-file");
const selectedFile = document.getElementById("selected-file");
const uploadStatus = document.getElementById("upload-status");
const dropZone = document.getElementById("drop-zone");
const uploadBtn = document.getElementById("upload-btn");

function updateSelectedFileText(file) {
  if (file) {
    const sizeInKb = (file.size / 1024).toFixed(1);
    selectedFile.textContent = `Selected: ${file.name} (${sizeInKb} KB)`;
  } else {
    selectedFile.textContent = "No file selected";
  }
}

fileInput.addEventListener("change", () => {
  if (fileInput.files.length) {
    updateSelectedFileText(fileInput.files[0]);
  } else {
    updateSelectedFileText(null);
  }
});

// Drag and drop listeners
if (dropZone) {
  ["dragenter", "dragover"].forEach(eventName => {
    dropZone.addEventListener(eventName, e => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach(eventName => {
    dropZone.addEventListener(eventName, e => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("dragover");
    });
  });

  dropZone.addEventListener("drop", e => {
    if (e.dataTransfer && e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      updateSelectedFileText(fileInput.files[0]);
    }
  });
}

uploadForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!fileInput.files.length) {
    showNotice(uploadStatus, "Please select a file to upload first.", true);
    return;
  }

  const file = fileInput.files[0];
  const body = new FormData();
  body.append("file", file);

  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading & Indexing...";

  try {
    const response = await fetch("/api/documents", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Upload failed.");
    }
    showNotice(uploadStatus, data.message);
    uploadForm.reset();
    updateSelectedFileText(null);
    loadDocuments();
  } catch (error) {
    showNotice(uploadStatus, error.message, true);
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload and index";
  }
});

async function loadDocuments() {
  const list = document.getElementById("document-list");
  try {
    const response = await fetch("/api/documents");
    const docs = await response.json();
    list.innerHTML = "";
    if (!docs.length) {
      list.innerHTML = '<p class="muted small">No documents uploaded yet. Upload a notice above to test!</p>';
      return;
    }
    docs.forEach(doc => {
      const item = document.createElement("div");
      item.className = "document-item";
      item.innerHTML = `
        <div class="item-info">
          <div class="item-title">📄 ${escapeHtml(doc.filename)}</div>
          <div class="item-meta">${Number(doc.characters).toLocaleString()} characters indexed · ${escapeHtml(doc.uploaded_at || "")}</div>
        </div>
        <button type="button" class="delete-button" data-id="${doc.id}" title="Remove document">Remove</button>
      `;
      item.querySelector("button").addEventListener("click", () => removeDocument(doc.id, doc.filename));
      list.appendChild(item);
    });
  } catch {
    list.innerHTML = '<p class="muted small">Could not load documents.</p>';
  }
}

async function removeDocument(id, filename) {
  if (!confirm(`Remove '${filename}' from the chatbot knowledge base?`)) return;
  try {
    const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not remove document.");
    showNotice(uploadStatus, `Removed '${filename}' successfully.`);
    loadDocuments();
  } catch (err) {
    alert(err.message);
  }
}

// Deadline Tracker Handling
const taskForm = document.getElementById("task-form");
const taskStatus = document.getElementById("task-status");
const taskBtn = document.getElementById("task-btn");
const taskDateInput = document.getElementById("task-date");

// Suggest today or future date
if (taskDateInput) {
  const today = new Date().toISOString().split("T")[0];
  taskDateInput.setAttribute("min", today);
}

taskForm.addEventListener("submit", async event => {
  event.preventDefault();
  const title = document.getElementById("task-title").value.trim();
  const due_date = document.getElementById("task-date").value;
  const category = document.getElementById("task-category").value;

  if (!title || !due_date) {
    showNotice(taskStatus, "Please enter both task name and due date.", true);
    return;
  }

  taskBtn.disabled = true;
  taskBtn.textContent = "Saving...";

  try {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, due_date, category })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Could not save deadline.");
    }
    showNotice(taskStatus, "Deadline saved successfully!");
    taskForm.reset();
    loadTasks();
  } catch (error) {
    showNotice(taskStatus, error.message, true);
  } finally {
    taskBtn.disabled = false;
    taskBtn.textContent = "Add deadline";
  }
});

async function loadTasks() {
  const list = document.getElementById("task-list");
  try {
    const response = await fetch("/api/tasks");
    const tasks = await response.json();
    list.innerHTML = "";
    if (!tasks.length) {
      list.innerHTML = '<p class="muted small">No deadlines added yet. Add one above!</p>';
      return;
    }
    tasks.forEach(task => {
      const item = document.createElement("div");
      item.className = "task-item";
      item.innerHTML = `
        <div class="item-info">
          <div class="item-title">${escapeHtml(task.title)}</div>
          <div class="item-meta">📅 Due: <strong>${escapeHtml(task.due_date)}</strong></div>
          <span class="category category-${escapeHtml(task.category.toLowerCase())}">${escapeHtml(task.category)}</span>
        </div>
        <button type="button" class="delete-button" aria-label="Delete deadline" title="Delete deadline">Delete</button>
      `;
      item.querySelector("button").addEventListener("click", () => removeTask(task.id, task.title));
      list.appendChild(item);
    });
  } catch {
    list.innerHTML = '<p class="muted small">Could not load deadlines.</p>';
  }
}

async function removeTask(id, title) {
  if (!confirm(`Delete deadline '${title}'?`)) return;
  try {
    const response = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not delete deadline.");
    showNotice(taskStatus, "Deadline deleted.");
    loadTasks();
  } catch (err) {
    alert(err.message);
  }
}

// Initial fetch on page load
loadDocuments();
loadTasks();
