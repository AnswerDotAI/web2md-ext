function showBanner(message, isError = false) {
    /* Remove existing banner if any */
    const existingBanner = document.getElementById('url2md-banner');
    if (existingBanner) {
        existingBanner.remove();
    }

    /* Create new banner */
    const banner = document.createElement('div');
    banner.id = 'url2md-banner';
    banner.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        background-color: ${isError ? '#ff4444' : '#44bb44'};
        color: white;
        z-index: 10000;
        font-family: Arial, sans-serif;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: opacity 0.5s ease-in-out;
    `;
    banner.textContent = message;
    document.body.appendChild(banner);

    /* Remove banner after 3 seconds */
    setTimeout(() => {
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 500);
    }, 3000);
}

function showPermissionDialog() {
    /* Remove any existing dialog */
    const existingDialog = document.getElementById('url2md-dialog');
    if (existingDialog) {
        existingDialog.remove();
    }

    /* Create dialog */
    const dialog = document.createElement('div');
    dialog.id = 'url2md-dialog';
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10001;
        font-family: Arial, sans-serif;
        max-width: 400px;
        text-align: center;
    `;

    const message = document.createElement('p');
    message.textContent = 'This extension needs permission to access web2md.answer.ai to convert pages to markdown. Would you like to grant this permission?';
    message.style.marginBottom = '20px';

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'center';
    buttonContainer.style.gap = '10px';

    const allowButton = document.createElement('button');
    allowButton.textContent = 'Allow';
    allowButton.style.cssText = `
        padding: 8px 16px;
        background: #44bb44;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;
    allowButton.onclick = () => {
        chrome.runtime.sendMessage({ type: 'USER_GRANTED_PERMISSION' });
        dialog.remove();
    };

    const denyButton = document.createElement('button');
    denyButton.textContent = 'Deny';
    denyButton.style.cssText = `
        padding: 8px 16px;
        background: #ff4444;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;
    denyButton.onclick = () => {
        showBanner('Permission denied', true);
        dialog.remove();
    };

    buttonContainer.appendChild(allowButton);
    buttonContainer.appendChild(denyButton);
    dialog.appendChild(message);
    dialog.appendChild(buttonContainer);
    document.body.appendChild(dialog);
}

/* Listen for messages from background script */
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'REQUEST_PERMISSION') {
        showPermissionDialog();
    } else {
        showBanner(message.text, message.isError);
    }
    return false;
});
