// Background service worker for the Patchbay Bridge extension.
// This script handles API requests proxied from the web client.

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    // We only process messages from our own web client, validated by manifest.json
    if (sender.origin !== "http://localhost:5173") {
        return; // Ignore messages from other origins
    }

    if (message.type === 'API_REQUEST') {
        const { url, options } = message.payload;

        console.log(`[Patchbay Bridge] Forwarding API request to: ${url}`);

        fetch(url, options)
            .then(response => {
                // Check if the response is JSON, otherwise return as text
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    return response.json().then(data => ({
                        ok: response.ok,
                        status: response.status,
                        statusText: response.statusText,
                        body: data
                    }));
                } else {
                    return response.text().then(text => ({
                        ok: response.ok,
                        status: response.status,
                        statusText: response.statusText,
                        body: text
                    }));
                }
            })
            .then(responseObject => {
                sendResponse({ success: true, data: responseObject });
            })
            .catch(error => {
                console.error('[Patchbay Bridge] Fetch error:', error);
                sendResponse({ success: false, error: { message: error.message } });
            });

        // Return true to indicate that sendResponse will be called asynchronously.
        return true;
    }
});

console.log("Patchbay Bridge background script loaded and listening for messages.");
