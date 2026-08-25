// Content Script - Runs on all supported AI provider pages
// Handles DOM scraping, message capture, and real-time updates

const STORAGE_KEY = "context_sync_conversations";

// Provider detection and configuration
const PROVIDER_CONFIG = {
  claude: {
    name: "Claude",
    host: "claude.ai",
    selectors: {
      user: ['[data-testid="user-message"]', '[class*="user-message"]', '[class*="user"][role="article"]'],
      assistant: ['.font-claude-response', '[class*="assistant-message"]', '[data-testid="assistant-message"]', '[class*="assistant"][role="article"]'],
      container: ['[data-testid="conversation-container"]', '.conversation-container', 'main', '#root']
    },
    accountSelectors: ['[data-testid="account"]', '[class*="AccountButton"]', '[class*="user-avatar"]'],
    urlPatterns: ["claude.ai"]
  },
  chatgpt: {
    name: "ChatGPT",
    host: "chatgpt.com",
    selectors: {
      user: ['[data-message-author-role="user"]', '[class*="user-message"]', '[class*="user"][role="article"]'],
      assistant: ['[data-message-author-role="assistant"]', '[class*="assistant-message"]', '[class*="assistant"][role="article"]'],
      container: ['main', '[class*="conversation"]', '[class*="chat-container"]']
    },
    accountSelectors: ['[data-testid*="user"]', '[class*="user-menu"]', '[class*="avatar"]'],
    urlPatterns: ["chatgpt.com"]
  },
  gemini: {
    name: "Gemini",
    host: "gemini.google.com",
    selectors: {
      user: ['[data-testid*="user-message"]', '[class*="user-query"]', '[class*="user"][role="article"]'],
      assistant: ['[data-testid*="model-response"]', '[class*="model-response"]', '[class*="assistant"][role="article"]'],
      container: ['main', '[class*="conversation"]', '[class*="chat-container"]']
    },
    accountSelectors: ['[data-tooltip*="account"]', 'button[aria-label*="account"]', '[class*="avatar"]'],
    urlPatterns: ["gemini.google.com"]
  },
  deepseek: {
    name: "DeepSeek",
    host: "deepseek.com",
    selectors: {
      user: ['[class*="user-message"]', '[data-role="user"]', '[class*="user"][role="article"]'],
      assistant: ['[class*="assistant-message"]', '[data-role="assistant"]', '[class*="assistant"][role="article"]'],
      container: ['main', '[class*="chat-container"]', '[class*="messages"]']
    },
    accountSelectors: ['[class*="user"]', '[class*="account"]', '[class*="avatar"]'],
    urlPatterns: ["deepseek.com"]
  },
  perplexity: {
    name: "Perplexity",
    host: "perplexity.ai",
    selectors: {
      user: ['[class*="user-message"]', '[data-testid="user-message"]', '[class*="user"][role="article"]'],
      assistant: ['[class*="assistant-message"]', '[data-testid="assistant-message"]', '[class*="assistant"][role="article"]'],
      container: ['main', '[class*="chat"]', '[class*="conversation"]']
    },
    accountSelectors: ['[class*="user"]', '[class*="account"]'],
    urlPatterns: ["perplexity.ai"]
  },
  mistral: {
    name: "Mistral",
    host: "mistral.ai",
    selectors: {
      user: ['[class*="user-message"]', '[data-role="user"]', '[class*="user"][role="article"]'],
      assistant: ['[class*="assistant-message"]', '[data-role="assistant"]', '[class*="assistant"][role="article"]'],
      container: ['main', '[class*="conversation"]', '[class*="chat-container"]']
    },
    accountSelectors: ['[class*="user"]', '[class*="account"]'],
    urlPatterns: ["mistral.ai"]
  },
  bing: {
    name: "Bing",
    host: "bing.com",
    selectors: {
      user: ['[class*="user-message"]', '[class*="user"][role="article"]'],
      assistant: ['[class*="assistant-message"]', '[class*="bot"]', '[class*="assistant"][role="article"]'],
      container: ['[class*="chat-container"]', 'main', '[class*="conversation"]']
    },
    accountSelectors: ['[class*="user"]', '[class*="account"]'],
    urlPatterns: ["bing.com"]
  },
  grok: {
    name: "Grok",
    host: "grok.com",
    selectors: {
      user: ['[class*="user-message"]', '[data-testid="user"]', '[class*="user"][role="article"]'],
      assistant: ['[class*="assistant-message"]', '[data-testid="assistant"]', '[class*="assistant"][role="article"]'],
      container: ['main', '[class*="chat"]', '[class*="conversation"]']
    },
    accountSelectors: ['[class*="user"]', '[class*="account"]'],
    urlPatterns: ["grok.com"]
  },
  google_ai: {
    name: "Google AI Mode",
    host: "google.com",
    selectors: {
      user: ['[data-subtree="aimc"] [role="user"]', '[data-subtree="aimc"] [aria-label*="user"]', '[data-subtree="aimc"] [class*="user"]', 'div[data-subtree="aimc"] div[role="article"]:nth-child(even)'],
      assistant: ['[data-subtree="aimc"] [role="assistant"]', '[data-subtree="aimc"] [aria-label*="assistant"]', '[data-subtree="aimc"] [class*="assistant"]', 'div[data-subtree="aimc"] div[role="article"]:nth-child(odd)'],
      container: ['div[data-subtree="aimc"]', '[data-subtree="aimc"]', 'main', '#search']
    },
    accountSelectors: ['[aria-label*="account"]', '[class*="avatar"]', '[class*="user"]'],
    urlPatterns: ["google.com/ai", "google.com/search", "www.google.com/ai", "www.google.com/search"]
  }
};

// Context Capture Class
class ContextCapture {
  constructor() {
    this.provider = this.detectProvider();
    this.config = PROVIDER_CONFIG[this.provider];
    this.account = this.detectAccount();
    this.conversationId = this.generateId();
    this.url = window.location.href;
    this.messages = [];
    this.observer = null;
    this.debounceTimer = null;
    this.isCapturing = false;
    this.lastMessageHashes = new Set();
    
    if (!this.config) {
      console.log("[Context Sync] Provider not supported:", window.location.hostname);
      return;
    }
    
    console.log("[Context Sync] Detected provider:", this.provider, "Account:", this.account);
    this.init();
  }

  detectProvider() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const search = window.location.search;
    
    // Check for Google AI Mode first (has specific URL patterns)
    if (hostname.includes("google.com") && (pathname.includes("/ai") || search.includes("udm=8") || search.includes("udm="))) {
      return "google_ai";
    }
    
    for (const [key, config] of Object.entries(PROVIDER_CONFIG)) {
      if (key === "google_ai") continue; // Already checked
      if (hostname.includes(config.host)) {
        return key;
      }
    }
    return null;
  }

  detectAccount() {
    if (!this.config || !this.config.accountSelectors) return this.generateSessionId();
    
    for (const selector of this.config.accountSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          const text = element.textContent.trim();
          const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          if (emailMatch) return emailMatch[0];
          if (text.length > 0 && text !== "guest" && text !== "Sign in") return text;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    return this.generateSessionId();
  }

  generateSessionId() {
    // Generate a session ID for guest users
    const sessionId = `guest_${Math.random().toString(36).slice(2, 15)}`;
    // Store in sessionStorage so it persists during the session
    try {
      sessionStorage.setItem("context_sync_session", sessionId);
    } catch (e) {
      // sessionStorage not available
    }
    return sessionId;
  }

  generateId() {
    return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  init() {
    // Initial scrape
    this.captureMessages();
    
    // Set up MutationObserver for real-time updates
    this.setupObserver();
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "scrapeNow") {
        this.captureMessages();
        sendResponse({ ok: true });
      }
    });
    
    // Save on page visibility change
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.save();
      }
    });
    
    // Save on beforeunload
    window.addEventListener("beforeunload", () => {
      this.save();
    });
    
    // For Google AI Mode, also watch for URL changes (SPA navigation)
    if (this.provider === "google_ai") {
      this.setupUrlWatcher();
    }
  }

  setupUrlWatcher() {
    let lastUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        this.captureMessages();
      }
    }, 1000);
  }

  setupObserver() {
    if (this.observer) return;
    
    const containerSelectors = this.config.selectors.container || ['body'];
    let targetNode = document.body;
    
    for (const selector of containerSelectors) {
      const node = document.querySelector(selector);
      if (node) {
        targetNode = node;
        break;
      }
    }
    
    this.observer = new MutationObserver((mutations) => {
      if (this.isCapturing) return;
      
      this.isCapturing = true;
      
      // Debounce rapid DOM changes
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.captureMessages();
        this.isCapturing = false;
      }, 500); // Faster debounce for real-time feel
    });
    
    this.observer.observe(targetNode, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: false
    });
  }

  captureMessages() {
    const newMessages = [];
    const now = new Date().toISOString();
    
    // For Google AI Mode, use specific selectors
    if (this.provider === "google_ai") {
      newMessages.push(...this.captureGoogleAI(now));
    } else {
      // Capture user messages
      const userSelectors = this.config.selectors.user || [];
      for (const selector of userSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const content = this.extractContent(el);
            if (content && !this.messageExists("user", content)) {
              newMessages.push({
                type: "user",
                content,
                timestamp: now,
                provider: this.provider
              });
            }
          });
        } catch (e) {
          console.log("[Context Sync] Error capturing user messages:", e);
        }
      }
      
      // Capture assistant messages
      const assistantSelectors = this.config.selectors.assistant || [];
      for (const selector of assistantSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const content = this.extractContent(el);
            if (content && !this.messageExists("assistant", content)) {
              newMessages.push({
                type: "assistant",
                content,
                timestamp: now,
                provider: this.provider
              });
            }
          });
        } catch (e) {
          console.log("[Context Sync] Error capturing assistant messages:", e);
        }
      }
    }
    
    // Generic fallback: look for any message-like elements
    if (newMessages.length === 0) {
      this.fallbackCapture(now, newMessages);
    }
    
    // Add new messages to our collection
    if (newMessages.length > 0) {
      this.messages.push(...newMessages);
      this.save();
    }
  }

  captureGoogleAI(now) {
    const messages = [];
    
    try {
      // Google AI Mode uses data-subtree="aimc" as the main container
      const aiContainer = document.querySelector('div[data-subtree="aimc"]');
      if (!aiContainer) {
        console.log("[Context Sync] Google AI Mode container not found");
        return messages;
      }
      
      // Find all message elements within the AI Mode container
      // Google AI Mode messages are typically in div[role="article"] elements
      const messageElements = aiContainer.querySelectorAll('div[role="article"]');
      
      messageElements.forEach((el, index) => {
        const content = this.extractContent(el);
        if (!content || content.length < 5) return;
        
        // In Google AI Mode, user and assistant messages alternate
        // We need to determine which is which
        let type = "assistant";
        
        // Check for user indicators
        if (el.querySelector('[aria-label*="user"]') ||
            el.querySelector('[class*="user"]') ||
            el.querySelector('[data-testid*="user"]')) {
          type = "user";
        }
        // Check for assistant indicators
        else if (el.querySelector('[aria-label*="assistant"]') ||
                 el.querySelector('[class*="assistant"]') ||
                 el.querySelector('[data-testid*="assistant"]')) {
          type = "assistant";
        }
        // Heuristic: first message is usually user, then alternates
        else if (index % 2 === 0) {
          type = "user";
        }
        
        if (!this.messageExists(type, content)) {
          messages.push({
            type,
            content,
            timestamp: now,
            provider: this.provider
          });
        }
      });
    } catch (e) {
      console.log("[Context Sync] Google AI Mode capture error:", e);
    }
    
    return messages;
  }

  fallbackCapture(now, messages) {
    // Look for common patterns in chat UIs
    const messageSelectors = [
      '[class*="message"]',
      '[role="article"]',
      '[data-testid*="message"]',
      '[data-role*="message"]',
      '.message',
      '.chat-message'
    ];
    
    for (const selector of messageSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const content = this.extractContent(el);
          if (!content || content.length < 10) return;
          
          // Try to determine if it's user or assistant
          let type = "assistant";
          if (el.className.includes("user") || 
              el.getAttribute("data-role") === "user" ||
              el.getAttribute("data-testid")?.includes("user") ||
              el.querySelector('[class*="user"]')) {
            type = "user";
          }
          
          if (!this.messageExists(type, content)) {
            messages.push({
              type,
              content,
              timestamp: now,
              provider: this.provider
            });
          }
        });
      } catch (e) {
        // Continue to next selector
      }
    }
  }

  extractContent(element) {
    // Get text content
    let content = element.textContent || element.innerText || "";
    
    // Clean up whitespace
    content = content.replace(/\s+/g, " ").trim();
    
    // Remove common non-message elements
    const removeSelectors = ['button', 'a', 'svg', 'img', 'iframe', 'script', 'style', 'code'];
    const clone = element.cloneNode(true);
    
    removeSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    // Get cleaned content
    let cleanContent = clone.textContent || clone.innerText || "";
    cleanContent = cleanContent.replace(/\s+/g, " ").trim();
    
    // If cleaned content is shorter, use it
    if (cleanContent.length > 0 && cleanContent.length < content.length) {
      content = cleanContent;
    }
    
    return content.length > 0 ? content : null;
  }

  messageExists(type, content) {
    // Check if a message with similar content already exists
    const hash = this.hashMessage(type, content);
    return this.messages.some(m => this.hashMessage(m.type, m.content) === hash);
  }

  hashMessage(type, content) {
    // Simple hash based on type and first 100 characters
    return `${type}:${content.slice(0, 100)}`;
  }

  save() {
    if (this.messages.length === 0) return;
    
    const title = this.inferTitle();
    const conversation = {
      id: this.conversationId,
      title,
      url: this.url,
      provider: this.provider,
      account: this.account,
      messages: this.messages,
      savedAt: new Date().toISOString(),
      version: 3
    };
    
    chrome.runtime.sendMessage({
      action: "saveConversation",
      conversation
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log("[Context Sync] Error saving conversation:", chrome.runtime.lastError);
      }
    });
  }

  inferTitle() {
    // Use first user message as title
    const firstUserMessage = this.messages.find(m => m.type === "user");
    if (firstUserMessage) {
      return firstUserMessage.content.slice(0, 80).trim();
    }
    
    // Fallback to URL
    try {
      const url = new URL(this.url);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length > 0) {
        return parts[parts.length - 1].slice(0, 80);
      }
    } catch (e) {
      // Ignore
    }
    
    return "Untitled Conversation";
  }
}

// Initialize the capture when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new ContextCapture();
  });
} else {
  new ContextCapture();
}
