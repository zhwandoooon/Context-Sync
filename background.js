// Background Service Worker
// Handles storage, messaging, and conversation management

const STORAGE_KEY = "context_sync_conversations";
const MAX_CONVERSATIONS = 500;

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    if (!result[STORAGE_KEY]) {
      chrome.storage.local.set({ [STORAGE_KEY]: [] });
    }
  });
});

// Message listener for communication between popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handlers = {
    "saveConversation": () => saveConversation(message.conversation, sendResponse),
    "getConversations": () => getConversations(sendResponse),
    "deleteConversation": () => deleteConversation(message.id, sendResponse),
    "deleteAllConversations": () => deleteAllConversations(sendResponse),
    "getConversation": () => getConversation(message.id, sendResponse),
    "updateConversation": () => updateConversation(message.conversation, sendResponse),
    "scrapeActiveTab": () => scrapeActiveTab(sender.tab?.id, sendResponse)
  };

  const handler = handlers[message.action];
  if (handler) {
    handler();
    return true; // Required for async sendResponse
  }
});

// Save a conversation
function saveConversation(conversation, sendResponse) {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    let conversations = result[STORAGE_KEY] || [];
    
    // Check if conversation already exists (same provider + url + account)
    const existingIndex = conversations.findIndex(c => 
      c.id === conversation.id || 
      (c.url === conversation.url && c.provider === conversation.provider && c.account === conversation.account)
    );
    
    if (existingIndex >= 0) {
      // Update existing conversation
      conversations[existingIndex] = conversation;
    } else {
      // Add new conversation
      conversations.push(conversation);
    }
    
    // Limit to MAX_CONVERSATIONS
    conversations = conversations.slice(-MAX_CONVERSATIONS);
    
    chrome.storage.local.set({ [STORAGE_KEY]: conversations }, () => {
      sendResponse({ ok: true, total: conversations.length });
    });
  });
}

// Get all conversations
function getConversations(sendResponse) {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const conversations = result[STORAGE_KEY] || [];
    sendResponse({ ok: true, conversations });
  });
}

// Get a specific conversation by ID
function getConversation(id, sendResponse) {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const conversations = result[STORAGE_KEY] || [];
    const conversation = conversations.find(c => c.id === id);
    sendResponse({ ok: true, conversation });
  });
}

// Update a conversation
function updateConversation(conversation, sendResponse) {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    let conversations = result[STORAGE_KEY] || [];
    const index = conversations.findIndex(c => c.id === conversation.id);
    
    if (index >= 0) {
      conversations[index] = conversation;
      chrome.storage.local.set({ [STORAGE_KEY]: conversations }, () => {
        sendResponse({ ok: true });
      });
    } else {
      sendResponse({ ok: false, error: "Conversation not found" });
    }
  });
}

// Delete a conversation
function deleteConversation(id, sendResponse) {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    let conversations = result[STORAGE_KEY] || [];
    conversations = conversations.filter(c => c.id !== id);
    
    chrome.storage.local.set({ [STORAGE_KEY]: conversations }, () => {
      sendResponse({ ok: true });
    });
  });
}

// Delete all conversations
function deleteAllConversations(sendResponse) {
  chrome.storage.local.set({ [STORAGE_KEY]: [] }, () => {
    sendResponse({ ok: true });
  });
}

// Trigger scrape on active tab
function scrapeActiveTab(tabId, sendResponse) {
  if (!tabId) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        tabId = tabs[0].id;
      }
    });
  }
  
  chrome.tabs.sendMessage(tabId, { action: "scrapeNow" }, (response) => {
    if (chrome.runtime.lastError) {
      sendResponse({ ok: false, error: "No active AI tab or content script not loaded" });
    } else {
      sendResponse(response || { ok: true });
    }
  });
  return true;
}
