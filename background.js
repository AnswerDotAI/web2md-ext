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
      origins: ['https://r.jina.ai/*']
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
      /* Get the active tab */
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
        func: copyToClipboard,
        args: [markdown]
      });

      // Show success message
      chrome.tabs.sendMessage(tab.id, {
        text: 'Successfully copied contents to clipboard',
        isError: false
      });

    } catch (error) {
      console.error('Error:', error);
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

function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log('Text successfully copied to clipboard');
        resolve(true);
      })
      .catch(err => {
        console.error('Failed to copy text to clipboard:', err);
        reject(err);
      });
  });
}