/* Global state to track pending requests */
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
      origins: ['https://web2md.answer.ai/*']
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