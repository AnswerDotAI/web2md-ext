## SpecStory

## Modifying Chrome Extension to Use Jina Reader (1/24/2025, 10:04:16 PM)

_**User**_

@Codebase I want to edit this extension and instead use jina reader, not web2md per these instructions https://jina.ai/reader/

---

_**Assistant**_

I'll help modify the extension to use Jina Reader instead. Here are the key changes needed:

1. Update manifest.json to change permissions:
```json:manifest.json
{
  "manifest_version": 3,
  "name": "URL to Markdown via Jina",
  "version": "1.0",
  "description": "Gets contents of current URL as markdown using Jina Reader",
  "icons": {
    "16": "icon.png",
    "32": "icon.png",
    "48": "icon.png",
    "128": "icon.png"
  },
  "permissions": [
    "activeTab",
    "clipboardWrite",
    "scripting"
  ],
  "optional_host_permissions": [
    "https://api.jina.ai/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["http://*/*", "https://*/*"],
      "run_at": "document_end",
      "js": ["content.js"]
    }
  ],
  "commands": {
    "post-url": {
      "suggested_key": {
        "default": "Ctrl+Shift+O",
        "mac": "Command+Shift+O"
      },
      "description": "Convert current page to markdown"
    }
  }
}
```

2. Modify background.js to use Jina's API:
```javascript:background.js
let pendingRequest = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'USER_GRANTED_PERMISSION') {
    handlePermissionRequest();
  }
  return false;
});

async function handlePermissionRequest() {
  try {
    const granted = await chrome.permissions.request({
      origins: ['https://api.jina.ai/*']
    });
    
    if (granted && pendingRequest) {
      pendingRequest();
      pendingRequest = null;
    }
  } catch (error) {
    console.error('Permission request failed:', error);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        text: `Error: ${error.message}`,
        isError: true
      });
    }
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "post-url") {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('No active tab found');
      }

      const origin = 'https://api.jina.ai/';
      const hasPermission = await chrome.permissions.contains({
        origins: [origin]
      });

      if (!hasPermission) {
        chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_PERMISSION' });
        pendingRequest = async () => {
          await processPage(tab);
        };
        return;
      }

      await processPage(tab);

    } catch (error) {
      console.error('Error:', error.message);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          text: `Error: ${error.message}`,
          isError: true
        });
      }
    }
  }
});

async function processPage(tab) {
  const url = tab.url;
  
  const response = await fetch('https://api.jina.ai/reader/v1/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      url: url,
      output_format: 'markdown'
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const markdown = data.markdown || data.content; // adjust based on actual API response

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: copyToClipboard,
    args: [markdown]
  });

  if (!results || results.length === 0) {
    throw new Error('Failed to execute clipboard script');
  }

  chrome.tabs.sendMessage(tab.id, {
    text: 'Markdown copied to clipboard!',
    isError: false
  });
}

function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}
```

3. Update content.js dialog text:
```javascript:content.js
// Find this line in showPermissionDialog():
message.textContent = 'This extension needs permission to access api.jina.ai to convert pages to markdown. Would you like to grant this permission?';
```

Note: You'll need to:
1. Sign up for a Jina AI account
2. Get an API key
3. Add the API key to the headers in the fetch request
4. Test with the actual API response format from Jina

The exact API endpoint and response format might need adjustment based on Jina's documentation.

---

_**User**_

Actually before you do that read @https://jina.ai/reader/ 

---

_**Assistant**_

I see you want me to review the Jina Reader documentation first. Based on the docs, here are the key points for implementing Jina Reader in the extension:

1. The basic usage is much simpler - we just need to prepend `r.jina.ai/` to any URL
2. No API key is required for basic usage (20 RPM limit)
3. The response is already in markdown format

Here's the simplified implementation:

```javascript:background.js
async function processPage(tab) {
  const url = tab.url;
  const jinaReaderUrl = `https://r.jina.ai/${url}`;

  const response = await fetch(jinaReaderUrl);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const markdown = await response.text();
  
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: copyToClipboard,
    args: [markdown]
  });

  if (!results || results.length === 0) {
    throw new Error('Failed to execute clipboard script');
  }

  chrome.tabs.sendMessage(tab.id, {
    text: 'Markdown copied to clipboard!',
    isError: false
  });
}
```

```json:manifest.json
{
  // ... existing code ...
  "permissions": [
    "activeTab",
    "clipboardWrite",
    "scripting"
  ],
  "host_permissions": [
    "https://r.jina.ai/*"
  ],
  // ... existing code ...
}
```

Key changes:
1. Simplified the fetch call to just prepend r.jina.ai
2. Removed web2md specific permissions and endpoints
3. Added host permission for r.jina.ai
4. Removed HTML content extraction since Jina handles that
5. Removed permission dialog since no API key is required for basic usage

Optional enhancements:
1. Could add API key support for higher rate limits (200 RPM)
2. Could add options for Jina's parameters like `remove_all_images`, `json_response`, etc.
3. Could implement caching since Jina caches responses for 5 minutes

---

_**User**_

how to fix this?

---

_**Assistant**_

This error typically occurs when there's an issue with the message passing between different parts of the Chrome extension. Let's fix the background.js by properly setting up the message listeners and error handling:

```javascript:background.js
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "post-url") {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('No active tab found');
      }

      const url = tab.url;
      const jinaReaderUrl = `https://r.jina.ai/${url}`;

      // Fetch the markdown
      const response = await fetch(jinaReaderUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const markdown = await response.text();

      // Copy to clipboard
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text) => {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          return true;
        },
        args: [markdown]
      });

      // Show success notification
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const notification = document.createElement('div');
          notification.textContent = 'Markdown copied to clipboard!';
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px;
            background: #4CAF50;
            color: white;
            border-radius: 4px;
            z-index: 10000;
            font-family: Arial, sans-serif;
          `;
          document.body.appendChild(notification);
          setTimeout(() => notification.remove(), 3000);
        }
      });

    } catch (error) {
      console.error('Error:', error);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        // Show error notification
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (errorMsg) => {
            const notification = document.createElement('div');
            notification.textContent = `Error: ${errorMsg}`;
            notification.style.cssText = `
              position: fixed;
              top: 20px;
              right: 20px;
              padding: 16px;
              background: #f44336;
              color: white;
              border-radius: 4px;
              z-index: 10000;
              font-family: Arial, sans-serif;
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
          },
          args: [error.message]
        });
      }
    }
  }
});
```

Key changes:
1. Removed message passing complexity
2. Integrated notification directly into the script
3. Added proper error handling
4. Simplified the flow to just fetch and copy
5. Added visual feedback for success/error states

The error you were seeing should now be resolved since we're not relying on message passing between different parts of the extension.

---

_**User**_

isn't the success and fail case reptitive?

---

_**Assistant**_

Yes, you're right. Let's refactor to remove the duplication by extracting the notification logic into a reusable function:

```javascript:background.js
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "post-url") {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('No active tab found');
      }

      const url = tab.url;
      const jinaReaderUrl = `https://r.jina.ai/${url}`;

      const response = await fetch(jinaReaderUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const markdown = await response.text();

      // Copy to clipboard
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text) => {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          return true;
        },
        args: [markdown]
      });

      // Show success notification
      showNotification(tab.id, 'Markdown copied to clipboard!', true);

    } catch (error) {
      console.error('Error:', error);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        showNotification(tab.id, `Error: ${error.message}`, false);
      }
    }
  }
});

function showNotification(tabId, message, isSuccess) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: (msg, success) => {
      const notification = document.createElement('div');
      notification.textContent = msg;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px;
        background: ${success ? '#4CAF50' : '#f44336'};
        color: white;
        border-radius: 4px;
        z-index: 10000;
        font-family: Arial, sans-serif;
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    },
    args: [message, isSuccess]
  });
}
```

Changes:
1. Extracted notification logic into `showNotification` function
2. Added `isSuccess` parameter to control notification color
3. Reduced code duplication
4. Made the code more maintainable

---

_**User**_

You need to still check if you have permission 

---

_**Assistant**_



You're right. Let's add back the permission check for r.jina.ai:

```javascript:background.js
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "post-url") {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('No active tab found');
      }

      // Check for permission
      const hasPermission = await chrome.permissions.contains({
        origins: ['https://r.jina.ai/*']
      });

      if (!hasPermission) {
        const granted = await chrome.permissions.request({
          origins: ['https://r.jina.ai/*']
        });
        if (!granted) {
          throw new Error('Permission to access r.jina.ai is required');
        }
      }

      const url = tab.url;
      const jinaReaderUrl = `https://r.jina.ai/${url}`;

      const response = await fetch(jinaReaderUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const markdown = await response.text();

      // Copy to clipboard
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text) => {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          return true;
        },
        args: [markdown]
      });

      showNotification(tab.id, 'Markdown copied to clipboard!', true);

    } catch (error) {
      console.error('Error:', error);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        showNotification(tab.id, `Error: ${error.message}`, false);
      }
    }
  }
});

function showNotification(tabId, message, isSuccess) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: (msg, success) => {
      const notification = document.createElement('div');
      notification.textContent = msg;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px;
        background: ${success ? '#4CAF50' : '#f44336'};
        color: white;
        border-radius: 4px;
        z-index: 10000;
        font-family: Arial, sans-serif;
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    },
    args: [message, isSuccess]
  });
}
```

Changes:
1. Added permission check using `chrome.permissions.contains`
2. Added permission request if not already granted
3. Throws error if permission is denied
4. Keeps the clean notification system

Remember to keep the `host_permissions` in manifest.json as previously specified:
```json:manifest.json
{
  // ... existing code ...
  "host_permissions": [
    "https://r.jina.ai/*"
  ]
  // ... existing code ...
}
```

---



---

