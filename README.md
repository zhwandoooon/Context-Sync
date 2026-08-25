# Context Sync

**Capture, export, and sync AI conversations across all major platforms.**

![Chrome Extension](https://img.shields.io/badge/Platform-Chrome%20Extension-blue)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Version](https://img.shields.io/badge/Version-2.0.0-purple)

---

## Features

### Real-time Capture
- **Automatic scraping** - Captures conversations as you chat
- **No page refresh required** - Works with Single Page Applications (SPAs)
- **Real-time updates** - Uses MutationObserver to detect new messages
- **Multi-account support** - Detects and separates conversations by account

### Supported Platforms
- **Claude** (claude.ai)
- **ChatGPT** (chatgpt.com)
- **Google Gemini** (gemini.google.com)
- **DeepSeek** (chat.deepseek.com)
- **Perplexity** (perplexity.ai)
- **Mistral** (mistral.ai)
- **Bing Chat** (bing.com/chat)
- **Grok** (grok.com)

### Export & Management
- **Copy to clipboard** - One-click copy of any conversation
- **Export as JSON** - Download conversations as JSON files
- **Export all** - Download all conversations in one file
- **Search** - Search across all conversations by title, content, or provider
- **Delete** - Remove individual or all conversations
- **Auto-save** - Conversations are saved automatically

### Privacy & Security
- **100% local storage** - All data stored in your browser
- **No cloud sync** - No data leaves your device
- **No telemetry** - No tracking or analytics
- **No API calls** - Works completely offline
- **No authentication required** - Works as guest or logged in

---

## Installation

### From Chrome Web Store (Coming Soon)

1. Go to Chrome Web Store
2. Search for "Context Sync"
3. Click "Add to Chrome"

### Manual Installation (Developer Mode)

1. **Download the extension files**
   ```bash
   git clone https://github.com/zhwandoooon/Context-Sync.git
   cd Context-Sync
   ```

2. **Open Chrome Extensions**
   - Go to `chrome://extensions/` in your browser

3. **Enable Developer Mode**
   - Toggle "Developer Mode" on (top right corner)

4. **Load the extension**
   - Click "Load unpacked"
   - Select the `Context-Sync` folder

5. **Verify installation**
   - You should see the Context Sync icon in your Chrome toolbar
   - If it's hidden, click the puzzle piece icon and pin it

---

## Usage

### Basic Usage

1. **Navigate to any supported AI platform**
   - Open [claude.ai](https://claude.ai), [chatgpt.com](https://chatgpt.com), [gemini.google.com](https://gemini.google.com), etc.

2. **Start chatting**
   - The extension automatically detects the platform and starts capturing messages
   - No manual action required

3. **View conversations**
   - Click the Context Sync icon in your toolbar
   - All captured conversations are displayed in the popup

4. **Search conversations**
   - Use the search bar to find specific conversations
   - Search by title, content, provider, or account

5. **Copy or export**
   - Click "Copy" to copy a conversation to your clipboard
   - Click "Export" to download as a JSON file
   - Click "Export All" to download all conversations

6. **Delete conversations**
   - Click "Delete" to remove a specific conversation
   - Click "Clear All" to remove all conversations

### Advanced Features

- **Real-time updates** - The extension watches for new messages and captures them automatically
- **Multi-account support** - Conversations from different accounts are kept separate
- **Cross-platform** - View conversations from all supported platforms in one place
- **Persistent storage** - Conversations are saved even if you close the browser

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Chrome Extension (MV3)                     │
├─────────────────┬─────────────────┬─────────────────┬────────┤
│  Content Scripts │ Background       │ Popup UI         │ Icons  │
│                 │ Service Worker   │                  │        │
│  content.js     │                 │  popup.html      │        │
│  - DOM scraping │ - Storage       │  popup.js        │        │
│  - Message      │ - Message router │  popup.css       │        │
│    capture      │ - Conversation   │                  │        │
│  - Mutation     │   management     │                  │        │
│    Observer     │                 │                  │        │
└────────┬────────┴────────┬────────┴────────┬────────┘
         │                 │               │               │
         ▼                 ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    chrome.storage.local                         │
│  - Stores up to 500 conversations                                   │
│  - Persistent across browser sessions                            │
│  - No data leaves your device                                    │
└─────────────────────────────────────────────────────────────┘
```

### Content Script (content.js)

The content script runs on every supported AI platform page:

1. **Detects the provider** - Identifies which AI platform you're on (Claude, ChatGPT, etc.)
2. **Detects the account** - Identifies which account you're logged in as (or "guest")
3. **Sets up MutationObserver** - Watches the DOM for changes
4. **Captures messages** - Extracts user and assistant messages from the DOM
5. **Saves conversations** - Sends captured conversations to the background service worker

### Background Service Worker (background.js)

The service worker handles:

1. **Storage management** - Saves, retrieves, and deletes conversations
2. **Message routing** - Communicates between popup and content scripts
3. **Conversation deduplication** - Prevents duplicate conversations
4. **Storage limits** - Enforces the 500 conversation limit

### Popup UI (popup/)

The popup provides a user interface for:

1. **Viewing conversations** - Displays all captured conversations
2. **Searching** - Filter conversations by various criteria
3. **Exporting** - Copy or download conversations
4. **Deleting** - Remove conversations

---

## Provider Configuration

Each supported platform has specific DOM selectors for:

- **User messages** - How to identify user messages in the DOM
- **Assistant messages** - How to identify AI responses in the DOM
- **Container elements** - Where to look for messages
- **Account detection** - How to identify the logged-in user

The extension uses these selectors to scrape messages from each platform's unique DOM structure.

---

## Privacy

### What We Store
- Conversation title (derived from first user message)
- Message content (user and assistant)
- Provider name (claude, chatgpt, gemini, etc.)
- Account identifier (email or username, or "guest")
- URL of the conversation
- Timestamp of when the conversation was saved

### What We DON'T Do
- ❌ No data is sent to any server
- ❌ No cloud sync
- ❌ No telemetry or tracking
- ❌ No API calls to external services
- ❌ No authentication required
- ❌ No data sharing with third parties

### Storage Limits
- **Maximum conversations**: 500 (oldest are automatically deleted)
- **Storage location**: `chrome.storage.local` (Chrome's built-in storage)
- **Storage limit**: ~5MB (Chrome's default limit for extensions)

---

## Troubleshooting

### The extension doesn't capture messages

1. **Check if the extension is enabled**
   - Go to `chrome://extensions/`
   - Make sure Context Sync is enabled

2. **Check if you're on a supported platform**
   - The extension only works on the supported platforms listed above

3. **Refresh the page**
   - Sometimes the content script needs to be re-injected

4. **Check the console**
   - Open DevTools (F12) and check for errors in the Console tab

5. **Try a different conversation**
   - Some platforms have different DOM structures for different types of conversations

### Messages are incomplete

1. **Wait for the AI to finish typing**
   - The extension captures messages as they appear, but may miss partial messages

2. **Scroll to load more messages**
   - Some platforms only render visible messages

3. **Refresh the page**
   - This will trigger a new scrape of all visible messages

### The popup is empty

1. **Make sure you've chatted**
   - The extension only shows conversations that have been captured

2. **Click "Refresh"**
   - This will re-scrape the active tab

3. **Check if the extension has permission**
   - Go to `chrome://extensions/` > Context Sync > "Site access"
   - Make sure it's set to "On all sites" or includes the AI platform you're using

### Export doesn't work

1. **Check if you have conversations**
   - You need to have captured conversations to export

2. **Try a different browser**
   - Some browsers may block the download

3. **Check your download folder**
   - The file may have been downloaded but not shown

---

## Development

### Project Structure

```
Context-Sync/
├── manifest.json           # Extension manifest (MV3)
├── background.js           # Service worker
├── content.js             # Content script (runs on AI pages)
├── popup/
│   ├── popup.html         # Popup HTML
│   ├── popup.js           # Popup JavaScript
│   └── popup.css          # Popup styles
├── icons/
│   ├── icon16.png         # Extension icon (16x16)
│   ├── icon32.png         # Extension icon (32x32)
│   ├── icon48.png         # Extension icon (48x48)
│   └── icon128.png        # Extension icon (128x128)
├── LICENSE                # MIT License
└── README.md              # This file
```

### Building

1. **Make changes** to the source files
2. **Reload the extension**
   - Go to `chrome://extensions/`
   - Click the refresh icon on Context Sync
3. **Test** the changes on supported AI platforms

### Adding a New Provider

To add support for a new AI platform:

1. **Add to manifest.json**
   - Add the platform's URL to `host_permissions`
   - Add the platform's URL to `content_scripts.matches`

2. **Add to content.js**
   - Add a new entry to `PROVIDER_CONFIG` with:
     - `name`: Display name
     - `host`: Domain to match
     - `selectors.user`: CSS selectors for user messages
     - `selectors.assistant`: CSS selectors for assistant messages
     - `selectors.container`: CSS selectors for the message container
     - `accountSelectors`: CSS selectors for the account info

3. **Test** the new provider
   - Navigate to the platform and verify that messages are captured

### Testing

1. **Manual testing**
   - Install the extension in developer mode
   - Navigate to each supported platform
   - Start a conversation and verify it's captured
   - Test copy, export, and delete functionality

2. **Console logging**
   - Open DevTools (F12) and check the Console for debug messages
   - The extension logs errors and warnings to the console

---

## Contributing

Pull requests are welcome! Here's how to contribute:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```
3. **Make your changes**
4. **Test your changes**
5. **Commit your changes**
   ```bash
   git commit -m 'Add: my feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/my-feature
   ```
7. **Open a Pull Request**

### Areas for Contribution

- **New platform support** - Add support for additional AI platforms
- **Improved selectors** - Update DOM selectors when platforms change their UI
- **New features** - Suggest and implement new features
- **Bug fixes** - Report and fix bugs
- **Documentation** - Improve documentation and examples

---

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

---

## Support

For issues, feature requests, or questions:

1. **Open an issue** on GitHub
2. **Check the troubleshooting section** above
3. **Review the documentation** in this README

---

## Changelog

### v2.0.0 (Current)
- Complete rewrite with improved architecture
- Better provider detection and DOM scraping
- Enhanced UI with conversation previews
- Improved error handling and reliability
- Support for 8 major AI platforms

### v1.0.0 (Previous)
- Initial release
- Basic conversation capture
- Simple export functionality
- Limited platform support

---

<div align="center">

**Built with ❤️ and frustration by developers who kept losing AI conversations**

*Stop losing context. Start syncing it.*

</div>
