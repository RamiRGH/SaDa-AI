function scrollToBottom() {
  setTimeout(() => {
    window.scrollTo(0, document.body.scrollHeight);
  }, 100);
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, function (m) {
    return map[m];
  });
}

function addMessageToChat(message, isUser = true) {
  const content = document.querySelector(".content");
  let messageElement;

  if (isUser) {
    // Add user message (escape HTML for security)
    messageElement = document.createElement("div");
    messageElement.className = "question";
    messageElement.innerHTML = `
      <div class="text">
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  } else {
    // Add AI response (don't escape as it may contain markdown)
    messageElement = document.createElement("div");
    messageElement.className = "answer";
    messageElement.innerHTML = `
      <div class="avatar">
        <img src="/src/img/avatar.png" alt="avatar" />
      </div>
      <div class="text">
        <div class="ai-message" data-markdown='${JSON.stringify(
          message
        )}'></div>
      </div>
    `;
  }

  content.appendChild(messageElement);
  scrollToBottom();
  return messageElement;
}

function addLoadingIndicator() {
  const content = document.querySelector(".content");
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "answer loading";
  loadingDiv.id = "loading-indicator";
  loadingDiv.innerHTML = `
    <div class="avatar">
      <img src="/src/img/avatar.png" alt="avatar" />
    </div>
    <div class="text">
      <div>Thinking...</div>
    </div>
  `;
  content.appendChild(loadingDiv);
  scrollToBottom();
}

function removeLoadingIndicator() {
  const loadingDiv = document.getElementById("loading-indicator");
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

function renderMessage(element) {
  const rawMarkdown = JSON.parse(element.dataset.markdown);
  const dirtyHtml = marked.parse(rawMarkdown);
  const cleanHtml = DOMPurify.sanitize(dirtyHtml);
  element.innerHTML = cleanHtml;
  renderMathInElement(element, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
      { left: "\\(", right: "\\)", display: false },
      { left: "\\[", right: "\\]", display: true }
    ],
  });
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".ai-message").forEach(renderMessage);
  scrollToBottom();
});

const textarea = document.querySelector("textarea");
const form = document.querySelector("form");

// Handle form submission with AJAX
form.addEventListener("submit", function (event) {
  event.preventDefault();

  const message = textarea.value.trim();
  if (!message) return;

  // Disable textarea and show user message immediately
  textarea.readOnly = true;
  addMessageToChat(message, true);
  addLoadingIndicator();

  // Clear textarea
  textarea.value = "";

  // Get the UUID from the current URL
  const uuid = window.location.pathname.split("/")[2];

  // Send AJAX request
  fetch(`/chat/${uuid}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `message=${encodeURIComponent(message)}`,
  })
    .then((response) => response.json())
    .then((data) => {
      removeLoadingIndicator();

      if (data.success) {
        // Add AI response to chat
        const newElement = addMessageToChat(data.aiResponse, false);
        renderMessage(newElement.querySelector('.ai-message'));

        // Update page title if it changed (for first message)
        if (data.title) {
          document.querySelector("h1").textContent = data.title;
          document.title = `data-z | ${data.title}`;
        }
      } else {
        // Handle error
        addMessageToChat(
          data.error || "Sorry, there was an error processing your request.",
          false
        );
      }

      // Re-enable textarea
      textarea.readOnly = false;
      textarea.focus();
    })
    .catch((error) => {
      console.error("Error:", error);
      removeLoadingIndicator();
      addMessageToChat(
        "Sorry, there was an error processing your request.",
        false
      );
      textarea.readOnly = false;
      textarea.focus();
    });
});

textarea.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    if (!textarea.readOnly) {
      form.dispatchEvent(new Event("submit"));
    }
  }
});
