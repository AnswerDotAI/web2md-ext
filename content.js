function showBanner(message, isError = false) {
    // Remove existing banner if any
    const existingBanner = document.getElementById('url2md-banner');
    if (existingBanner) {
        existingBanner.remove();
    }

    // Create new banner
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

    // Remove banner after 3 seconds
    setTimeout(() => {
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 500);
    }, 3000);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
    showBanner(message.text, message.isError);
    return true;
});
