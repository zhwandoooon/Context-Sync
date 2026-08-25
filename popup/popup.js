// Popup Controller
// Handles UI interactions, conversation display, and export functionality

let allConversations = [];
let filteredConversations = [];

// DOM Elements
const elements = {
  refreshBtn: document.getElementById("refreshBtn"),
  exportAllBtn: document.getElementById("exportAllBtn"),
  clearAllBtn: document.getElementById("clearAllBtn"),
  searchInput: document.getElementById("searchInput"),
  conversationsContainer: document.getElementById("conversationsContainer"),
  statsText: document.getElementById("statsText"),
  helpLink: document.getElementById("helpLink")
};

// Provider colors for badges
const providerColors = {
  claude: "claude",
  chatgpt: "chatgpt",
  gemini: "gemini",
  deepseek: "deepseek",
  perplexity: "perplexity",
  mistral: "mistral",
  bing: "bing",
  grok: "grok"
};

// Initialize popup
document.addEventListener("DOMContentLoaded", () => {
  loadConversations();
  setupEventListeners();
});

// Load conversations from storage
function loadConversations() {
  chrome.runtime.sendMessage({ action: "getConversations" }, (response) => {
    if (response && response.ok) {
      allConversations = response.conversations || [];
      filteredConversations = [...allConversations].sort((a, b) => 
        new Date(b.savedAt) - new Date(a.savedAt)
      );
      renderConversations();
      updateStats();
    }
  });
}

// Refresh conversations (scrape active tab)
function refreshConversations() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "scrapeNow" }, () => {
        setTimeout(loadConversations, 500);
      });
    } else {
      loadConversations();
    }
  });
}

// Render conversations in the UI
function renderConversations() {
  if (filteredConversations.length === 0) {
    elements.conversationsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128172;</div>
        <p>No conversations found</p>
        <p class="empty-subtitle">Start chatting on any supported AI platform</p>
      </div>
    `;
    return;
  }

  elements.conversationsContainer.innerHTML = filteredConversations
    .map((conv, index) => createConversationElement(conv, index))
    .join("");
}

// Create HTML for a single conversation
function createConversationElement(conv, index) {
  const providerClass = providerColors[conv.provider] || "claude";
  const preview = createPreview(conv);
  
  return `
    <div class="conversation-item" data-id="${conv.id}" data-index="${index}">
      <div class="conversation-header">
        <div class="conversation-title">
          ${escapeHtml(conv.title || "Untitled")}
          <span class="provider-badge ${providerClass}">${conv.provider || "unknown"}</span>
        </div>
      </div>
      <div class="conversation-meta">
        <span class="message-count">${conv.messages.length} messages</span>
        ${conv.account && conv.account !== "guest" ? `<span class="account-info">${escapeHtml(conv.account)}</span>` : ""}
        <span class="time-info">${formatDate(conv.savedAt)}</span>
      </div>
      ${preview}
      <div class="conversation-actions">
        <button class="btn-copy" onclick="copyConversation('${conv.id}')">Copy</button>
        <button class="btn-export" onclick="exportConversation('${conv.id}')">Export</button>
        <button class="btn-delete" onclick="deleteConversation('${conv.id}')">Delete</button>
      </div>
    </div>
  `;
}

// Create preview HTML for conversation
function createPreview(conv) {
  if (conv.messages.length === 0) return "";
  
  const previewMessages = conv.messages.slice(0, 2);
  const previewHtml = previewMessages
    .map(msg => `
      <div class="preview-message">
        <div class="message-type">${msg.type}</div>
        <div class="message-content">${escapeHtml(msg.content.slice(0, 100))}${msg.content.length > 100 ? "..." : ""}</div>
      </div>
    `)
    .join("");
  
  return `<div class="conversation-preview">${previewHtml}</div>`;
}

// Update statistics display
function updateStats() {
  const count = allConversations.length;
  elements.statsText.textContent = `${count} conversation${count !== 1 ? "s" : ""}`;
}

// Setup event listeners
function setupEventListeners() {
  // Refresh button
  elements.refreshBtn.addEventListener("click", () => {
    refreshConversations();
  });
  
  // Export all button
  elements.exportAllBtn.addEventListener("click", () => {
    exportAllConversations();
  });
  
  // Clear all button
  elements.clearAllBtn.addEventListener("click", () => {
    if (confirm("Delete ALL conversations? This cannot be undone.")) {
      clearAllConversations();
    }
  });
  
  // Search input
  elements.searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    filterConversations(query);
  });
  
  // Help link
  elements.helpLink.addEventListener("click", (e) => {
    e.preventDefault();
    showHelp();
  });
}

// Filter conversations based on search query
function filterConversations(query) {
  if (!query) {
    filteredConversations = [...allConversations].sort((a, b) => 
      new Date(b.savedAt) - new Date(a.savedAt)
    );
  } else {
    filteredConversations = allConversations
      .filter(conv => 
        (conv.title && conv.title.toLowerCase().includes(query)) ||
        (conv.provider && conv.provider.toLowerCase().includes(query)) ||
        (conv.account && conv.account.toLowerCase().includes(query)) ||
        conv.messages.some(msg => msg.content.toLowerCase().includes(query))
      )
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  }
  
  renderConversations();
  updateStats();
}

// Copy conversation to clipboard
function copyConversation(id) {
  const conv = allConversations.find(c => c.id === id);
  if (!conv) return;
  
  const text = formatConversationForClipboard(conv);
  
  navigator.clipboard.writeText(text).then(() => {
    showNotification("Copied to clipboard!");
  }).catch(() => {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    showNotification("Copied to clipboard!");
  });
}

// Export single conversation
function exportConversation(id) {
  const conv = allConversations.find(c => c.id === id);
  if (!conv) return;
  
  const json = JSON.stringify(conv, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(conv.title || "conversation")}_${conv.provider}_${formatDateForFilename(conv.savedAt)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Export all conversations
function exportAllConversations() {
  if (allConversations.length === 0) {
    showNotification("No conversations to export");
    return;
  }
  
  const json = JSON.stringify(allConversations, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `context-sync-export_${formatDateForFilename(new Date().toISOString())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification(`Exported ${allConversations.length} conversations`);
}

// Delete a conversation
function deleteConversation(id) {
  if (confirm("Delete this conversation? This cannot be undone.")) {
    chrome.runtime.sendMessage({ 
      action: "deleteConversation", 
      id 
    }, () => {
      loadConversations();
      showNotification("Conversation deleted");
    });
  }
}

// Clear all conversations
function clearAllConversations() {
  chrome.runtime.sendMessage({ action: "deleteAllConversations" }, () => {
    loadConversations();
    showNotification("All conversations cleared");
  });
}

// Show help dialog
function showHelp() {
  const helpHtml = `
    <div class="help-overlay" onclick="closeHelp(event)">
      <div class="help-dialog" onclick="event.stopPropagation()">
        <h2>Context Sync Help</h2>
        <p><strong>How to use:</strong></p>
        <ol>
          <li>Navigate to any supported AI platform (Claude, ChatGPT, Gemini, etc.)</li>
          <li>Start chatting - conversations are captured automatically</li>
          <li>Click the extension icon to view all conversations</li>
          <li>Use the search bar to find specific conversations</li>
          <li>Click Copy to copy a conversation to clipboard</li>
          <li>Click Export to download as JSON</li>
        </ol>
        <p><strong>Supported Platforms:</strong> Claude, ChatGPT, Gemini, DeepSeek, Perplexity, Mistral, Bing, Grok</p>
        <p><strong>Storage:</strong> All data is stored locally in your browser. No data is sent to any server.</p>
        <button class="btn btn-primary" onclick="closeHelp()">Close</button>
      </div>
    </div>
  `;
  
  // Add help dialog to body
  const helpDiv = document.createElement("div");
  helpDiv.innerHTML = helpHtml;
  document.body.appendChild(helpDiv);
}

// Close help dialog
function closeHelp(event) {
  const overlay = document.querySelector(".help-overlay");
  if (overlay) {
    overlay.remove();
  }
}

// Show notification
function showNotification(message) {
  // Remove existing notifications
  const existing = document.querySelector(".notification");
  if (existing) existing.remove();
  
  const notification = document.createElement("div");
  notification.className = "notification";
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #1f2937;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 13px;
    z-index: 1000;
    animation: slideIn 0.2s ease-out;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = "slideOut 0.2s ease-out";
    setTimeout(() => notification.remove(), 200);
  }, 2000);
}

// Utility functions
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return "Unknown";
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Less than a minute
    if (diff < 60000) {
      return "Just now";
    }
    
    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }
    
    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
    
    // Less than a week
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}d ago`;
    }
    
    // Format as date
    return date.toLocaleDateString();
  } catch (e) {
    return "Unknown";
  }
}

function formatDateForFilename(dateString) {
  if (!dateString) return "unknown";
  try {
    const date = new Date(dateString);
    return date.toISOString().split("T")[0].replace(/-/g, "");
  } catch (e) {
    return "unknown";
  }
}

function sanitizeFilename(str) {
  if (!str) return "untitled";
  return str
    .replace(/[^a-zA-Z0-9_\-\. ]/g, "_")
    .slice(0, 50)
    .trim();
}

function formatConversationForClipboard(conv) {
  const lines = [
    `=== ${conv.title || "Untitled Conversation"} ===`,
    `Provider: ${conv.provider || "Unknown"}`,
    `Account: ${conv.account || "guest"}`,
    `URL: ${conv.url || "Unknown"}`,
    `Saved: ${new Date(conv.savedAt).toLocaleString()}`,
    `Messages: ${conv.messages.length}`,
    "",
    "---"
  ];
  
  conv.messages.forEach((msg, index) => {
    lines.push(`[${msg.type.toUpperCase()}]`);
    lines.push(msg.content);
    lines.push("");
    if (index < conv.messages.length - 1) {
      lines.push("---");
      lines.push("");
    }
  });
  
  return lines.join("\n");
}

// Make functions available globally for onclick handlers
window.copyConversation = copyConversation;
window.exportConversation = exportConversation;
window.deleteConversation = deleteConversation;
window.closeHelp = closeHelp;
