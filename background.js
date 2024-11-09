chrome.commands.onCommand.addListener(async (command) => {
    console.log('Command received:', command);
    if (command === "post-url") {
      console.log("post-url command received");
      try {
        // Get the active tab's URL and content
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
          throw new Error('No active tab found');
        }
  
        // Get the page HTML content
        const [{result: pageContent}] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => document.documentElement.outerHTML
        });
  
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
  
        // Get the response text
        const responseText = await response.text();
        if (!responseText) {
          throw new Error('Empty response received from server');
        }
  
        // Inject the clipboard script into the active tab
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: copyToClipboard,
          args: [responseText]
        });
  
        // Check if the clipboard operation was successful
        if (!results || results.length === 0) {
          throw new Error('Failed to execute clipboard script');
        }
  
        // Send success message
        chrome.tabs.sendMessage(tab.id, {
          text: 'Successfully copied contents to clipboard',
          isError: false
        });
  
      } catch (error) {
        console.error('Error in URL Poster extension:', error.message);
        
        // Send error message to content script
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
  
  // Function to copy text to clipboard
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