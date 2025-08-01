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

  if (isUser) {
    // Add user message (escape HTML for security)
    const questionDiv = document.createElement("div");
    questionDiv.className = "question";
    questionDiv.innerHTML = `
      <div class="text">
        <p>${escapeHtml(message)}</p>
      </div>
    `;
    content.appendChild(questionDiv);
  } else {
    // Add AI response (don't escape as it may contain markdown)
    const answerDiv = document.createElement("div");
    answerDiv.className = "answer";
    answerDiv.innerHTML = `
      <div class="avatar">
        <img src="/src/img/avatar.png" alt="avatar" />
      </div>
      <div class="text">
        <div><md-block>${message}</md-block></div>
      </div>
    `;
    content.appendChild(answerDiv);
  }

  scrollToBottom();
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

document.addEventListener("DOMContentLoaded", function () {
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
        addMessageToChat(data.aiResponse, false);

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
