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
      /* Get the active tab */
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('No active tab found');
      }

      /* Check if we already have permission */
      const origin = 'https://web2md.answer.ai/';
      const hasPermission = await chrome.permissions.contains({
        origins: [origin]
      });

      if (!hasPermission) {
        /* Request permission via content script */
        chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_PERMISSION' });
        
        /* Store the rest of the operation as a pending request */
        pendingRequest = async () => {
          await processPage(tab);
        };
        return;
      }

      await processPage(tab);

    } catch (error) {
      console.error('Error in URL Poster extension:', error.message);
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, {
            text: `Error: ${error.message}`,
            isError: true
          });
        }
      } catch (e) {
        console.error('Failed to send error message:', e);
      }
    }
  }
});

async function processPage(tab) {
  /* Get the page HTML content */
  const [{result: pageContent}] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.documentElement.outerHTML
  });

  /* Make the API request */
  const response = await fetch('https://web2md.answer.ai/api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/plain'
    },
    body: `cts=${encodeURIComponent(pageContent)}`
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const responseText = await response.text();
  if (!responseText) {
    throw new Error('Empty response received from server');
  }

  /* Copy to clipboard */
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: copyToClipboard,
    args: [responseText]
  });

  if (!results || results.length === 0) {
    throw new Error('Failed to execute clipboard script');
  }

  /* Show success message */
  chrome.tabs.sendMessage(tab.id, {
    text: 'Successfully copied contents to clipboard',
    isError: false
  });
}

/* Function to copy text to clipboard */
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