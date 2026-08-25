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
  grok: "grok",
  google_ai: "google"
};

// Provider display names
const providerNames = {
  claude: "Claude",
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  deepseek: "DeepSeek",
  perplexity: "Perplexity",
  mistral: "Mistral",
  bing: "Bing",
  grok: "Grok",
  google_ai: "Google AI Mode"
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
  const providerName = providerNames[conv.provider] || conv.provider || "Unknown";
  const preview = createPreview(conv);
  const displayAccount = conv.account && conv.account !== "guest" ? conv.account : "Guest";
  
  return `
    <div class="conversation-item" data-id="${conv.id}" data-index="${index}">
      <div class="conversation-header">
        <div class="conversation-title">
          ${escapeHtml(conv.title || "Untitled")}
          <span class="provider-badge ${providerClass}">${providerName}</span>
        </div>
      </div>
      <div class="conversation-meta">
        <span class="message-count">${conv.messages.length} messages</span>
        <span class="account-info">${escapeHtml(displayAccount)}</span>
        <span class="time-info">${formatDate(conv.savedAt)}</span>
      </div>
      ${preview}
      <div class="conversation-actions">
        <button class="btn-copy" onclick="copyConversation('${conv.id}')">Copy</button>
        <button class="btn-export" onclick="showExportMenu('${conv.id}')">Export</button>
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

// Show export menu for individual conversation
function showExportMenu(id) {
  const conv = allConversations.find(c => c.id === id);
  if (!conv) return;
  
  const menuHtml = `
    <div class="export-menu-overlay" onclick="closeExportMenu(event)">
      <div class="export-menu" onclick="event.stopPropagation()">
        <h3>Export "${escapeHtml(conv.title || 'Untitled')}"</h3>
        <div class="export-options">
          <button class="export-option" onclick="exportConversation('${conv.id}', 'json')">JSON</button>
          <button class="export-option" onclick="exportConversation('${conv.id}', 'markdown')">Markdown</button>
          <button class="export-option" onclick="exportConversation('${conv.id}', 'html')">HTML</button>
          <button class="export-option" onclick="exportConversation('${conv.id}', 'text')">Plain Text</button>
        </div>
        <button class="btn" onclick="closeExportMenu()">Cancel</button>
      </div>
    </div>
  `;
  
  const menuDiv = document.createElement("div");
  menuDiv.innerHTML = menuHtml;
  document.body.appendChild(menuDiv);
}

// Close export menu
function closeExportMenu(event) {
  const overlay = document.querySelector(".export-menu-overlay");
  if (overlay) overlay.remove();
}

// Export conversation in specified format
function exportConversation(id, format = 'json') {
  const conv = allConversations.find(c => c.id === id);
  if (!conv) return;
  
  let content, filename, mimeType;
  
  switch (format) {
    case 'json':
      content = JSON.stringify(conv, null, 2);
      filename = `${sanitizeFilename(conv.title || "conversation")}_${conv.provider}_${formatDateForFilename(conv.savedAt)}.json`;
      mimeType = "application/json";
      break;
    case 'markdown':
      content = formatAsMarkdown(conv);
      filename = `${sanitizeFilename(conv.title || "conversation")}_${conv.provider}_${formatDateForFilename(conv.savedAt)}.md`;
      mimeType = "text/markdown";
      break;
    case 'html':
      content = formatAsHTML(conv);
      filename = `${sanitizeFilename(conv.title || "conversation")}_${conv.provider}_${formatDateForFilename(conv.savedAt)}.html`;
      mimeType = "text/html";
      break;
    case 'text':
    default:
      content = formatConversationForClipboard(conv);
      filename = `${sanitizeFilename(conv.title || "conversation")}_${conv.provider}_${formatDateForFilename(conv.savedAt)}.txt`;
      mimeType = "text/plain";
  }
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  
  closeExportMenu();
  showNotification(`Exported as ${format.toUpperCase()}`);
}

// Format as Markdown
function formatAsMarkdown(conv) {
  const lines = [
    `# ${conv.title || "Untitled Conversation"}`,
    "",
    `**Provider:** ${providerNames[conv.provider] || conv.provider || "Unknown"}`,
    `**Account:** ${conv.account || "Guest"}`,
    `**URL:** ${conv.url || "Unknown"}`,
    `**Saved:** ${new Date(conv.savedAt).toLocaleString()}`,
    `**Messages:** ${conv.messages.length}`,
    "",
    "---"
  ];
  
  conv.messages.forEach((msg, index) => {
    lines.push(`## ${msg.type.toUpperCase()}`);
    lines.push("");
    lines.push(msg.content);
    lines.push("");
    if (index < conv.messages.length - 1) {
      lines.push("---");
      lines.push("");
    }
  });
  
  return lines.join("\n");
}

// Format as HTML
function formatAsHTML(conv) {
  const html = [
    `<!DOCTYPE html>`,
    `<html>`,
    `<head>`,
    `<meta charset="UTF-8">`,
    `<title>${escapeHtml(conv.title || "Untitled Conversation")}</title>`,
    `<style>`,
    `body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }`,
    `.message { margin-bottom: 20px; padding: 15px; border-radius: 8px; }`,
    `.user { background: #e3f2fd; border-left: 4px solid #2196f3; }`,
    `.assistant { background: #f5f5f5; border-left: 4px solid #9e9e9e; }`,
    `.meta { color: #666; font-size: 14px; margin-bottom: 20px; }`,
    `h1 { color: #333; }`,
    `</style>`,
    `</head>`,
    `<body>`,
    `<h1>${escapeHtml(conv.title || "Untitled Conversation")}</h1>`,
    `<div class="meta">`,
    `<strong>Provider:</strong> ${providerNames[conv.provider] || conv.provider || "Unknown"} | `,
    `<strong>Account:</strong> ${conv.account || "Guest"} | `,
    `<strong>Saved:</strong> ${new Date(conv.savedAt).toLocaleString()} | `,
    `<strong>Messages:</strong> ${conv.messages.length}`,
    `</div>`
  ];
  
  conv.messages.forEach((msg) => {
    const className = msg.type === "user" ? "user" : "assistant";
    html.push(`<div class="message ${className}"><strong>${msg.type.toUpperCase()}:</strong><br>${escapeHtml(msg.content).replace(/\n/g, "<br>")}</div>`);
  });
  
  html.push(`</body></html>`);
  return html.join("\n");
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
    showExportAllMenu();
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

// Show export all menu
function showExportAllMenu() {
  if (allConversations.length === 0) {
    showNotification("No conversations to export");
    return;
  }
  
  const menuHtml = `
    <div class="export-menu-overlay" onclick="closeExportAllMenu(event)">
      <div class="export-menu" onclick="event.stopPropagation()">
        <h3>Export All Conversations</h3>
        <div class="export-options">
          <button class="export-option" onclick="exportAllConversations('json')">JSON</button>
          <button class="export-option" onclick="exportAllConversations('markdown')">Markdown</button>
          <button class="export-option" onclick="exportAllConversations('html')">HTML</button>
          <button class="export-option" onclick="exportAllConversations('text')">Plain Text</button>
        </div>
        <button class="btn" onclick="closeExportAllMenu()">Cancel</button>
      </div>
    </div>
  `;
  
  const menuDiv = document.createElement("div");
  menuDiv.innerHTML = menuHtml;
  document.body.appendChild(menuDiv);
}

// Close export all menu
function closeExportAllMenu(event) {
  const overlay = document.querySelector(".export-menu-overlay");
  if (overlay) overlay.remove();
}

// Export all conversations in specified format
function exportAllConversations(format = 'json') {
  if (allConversations.length === 0) {
    showNotification("No conversations to export");
    return;
  }
  
  let content, filename, mimeType;
  
  switch (format) {
    case 'json':
      content = JSON.stringify(allConversations, null, 2);
      filename = `context-sync-all_${formatDateForFilename(new Date().toISOString())}.json`;
      mimeType = "application/json";
      break;
    case 'markdown':
      content = allConversations.map(formatAsMarkdown).join("\n\n---\n\n");
      filename = `context-sync-all_${formatDateForFilename(new Date().toISOString())}.md`;
      mimeType = "text/markdown";
      break;
    case 'html':
      content = allConversations.map(formatAsHTML).join("\n");
      filename = `context-sync-all_${formatDateForFilename(new Date().toISOString())}.html`;
      mimeType = "text/html";
      break;
    case 'text':
    default:
      content = allConversations.map(formatConversationForClipboard).join("\n\n" + "=".repeat(80) + "\n\n");
      filename = `context-sync-all_${formatDateForFilename(new Date().toISOString())}.txt`;
      mimeType = "text/plain";
  }
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  
  closeExportAllMenu();
  showNotification(`Exported ${allConversations.length} conversations as ${format.toUpperCase()}`);
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
          <li>Navigate to any supported AI platform</li>
          <li>Start chatting - conversations are captured automatically</li>
          <li>Click the extension icon to view all conversations</li>
          <li>Use the search bar to find specific conversations</li>
          <li>Click Copy to copy a conversation to clipboard</li>
          <li>Click Export to choose format (JSON, Markdown, HTML, Text)</li>
        </ol>
        <p><strong>Supported Platforms:</strong> Claude, ChatGPT, Gemini, Google AI Mode, DeepSeek, Perplexity, Mistral, Bing, Grok</p>
        <p><strong>Storage:</strong> All data is stored locally. No data leaves your device.</p>
        <button class="btn btn-primary" onclick="closeHelp()">Close</button>
      </div>
    </div>
  `;
  
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
    
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
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
    `Provider: ${providerNames[conv.provider] || conv.provider || "Unknown"}`,
    `Account: ${conv.account || "Guest"}`,
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
window.showExportMenu = showExportMenu;
window.closeExportMenu = closeExportMenu;
window.closeExportAllMenu = closeExportAllMenu;
window.exportAllConversations = exportAllConversations;
window.showExportAllMenu = showExportAllMenu;
window.closeHelp = closeHelp;
