console.log("Content script loaded on page:", location.href);

function injectInpageScript() {
  try {
    const script = document.createElement("script");
    script.src = browser.runtime.getURL("inpage.js");
    script.onload = function () {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
    script.onerror = function () {
      console.error("[Content Script] Failed to inject inpage script");
    };
    (document.head || document.documentElement).appendChild(script);
  } catch (error) {
    console.error("[Content Script] Error injecting inpage script:", error);
  }
}

const pendingLoginRequests = new Map<
  string,
  {
    responseId: string;
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }
>();

window.addEventListener("message", function (event) {
  if (
    event.source !== window ||
    !event.data ||
    event.data.source !== "eth-oauth-inpage"
  ) {
    return;
  }

  const message = event.data;
  const responseId = message.responseId;

  if (message.type === "REQUEST_LOGIN") {
    browser.runtime.sendMessage(
      {
        type: "REQUEST_LOGIN",
        website: message.website,
        callbackUrl: message.callbackUrl,
        currentUrl: message.currentUrl,
      },
      (response: any) => {
        const lastError = (browser.runtime as any).lastError;
        if (lastError) {
          window.postMessage(
            {
              source: "eth-oauth-content",
              target: "eth-oauth-inpage",
              responseId: responseId,
              result: undefined,
              error: lastError.message,
            },
            "*"
          );
          return;
        }
        
        if (response?.requestId) {
          pendingLoginRequests.set(response.requestId, {
            responseId: responseId,
            resolve: (value: any) => {
              window.postMessage(
                {
                  source: "eth-oauth-content",
                  target: "eth-oauth-inpage",
                  responseId: responseId,
                  result: value,
                  error: undefined,
                },
                "*"
              );
            },
            reject: (error: Error) => {
              window.postMessage(
                {
                  source: "eth-oauth-content",
                  target: "eth-oauth-inpage",
                  responseId: responseId,
                  result: undefined,
                  error: error.message,
                },
                "*"
              );
            },
          });
        } else {
          window.postMessage(
            {
              source: "eth-oauth-content",
              target: "eth-oauth-inpage",
              responseId: responseId,
              result: undefined,
              error: response?.error || "Failed to initiate login",
            },
            "*"
          );
        }
      }
    );
  } else {
    browser.runtime.sendMessage(
      {
        type: message.type,
        website: message.website,
      },
      (response: any) => {
        window.postMessage(
          {
            source: "eth-oauth-content",
            target: "eth-oauth-inpage",
            responseId: responseId,
            result: response,
            error: response?.error,
          },
          "*"
        );
      }
    );
  }
});

if (document.head || document.documentElement) {
  injectInpageScript();
} else {
  const observer = new MutationObserver(() => {
    if (document.head || document.documentElement) {
      injectInpageScript();
      observer.disconnect();
    }
  });
  observer.observe(document.documentElement, { childList: true });
}

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "LOGIN_COMPLETE":
      if (message.requestId && pendingLoginRequests.has(message.requestId)) {
        const pending = pendingLoginRequests.get(message.requestId)!;
        pendingLoginRequests.delete(message.requestId);

        if (message.error) {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve({ 
            token: message.token, 
            success: true,
            serverResponse: message.serverResponse,
            redirectUrl: message.redirectUrl
          });
        }
      }
      sendResponse({ success: true });
      break;

    case "LOGIN_ERROR":
      if (message.requestId && pendingLoginRequests.has(message.requestId)) {
        const pending = pendingLoginRequests.get(message.requestId)!;
        pendingLoginRequests.delete(message.requestId);
        pending.reject(new Error(message.error || "Login failed"));
      }
      sendResponse({ success: true });
      break;

    case "VAULT_LOCKED":
    case "VAULT_UNLOCKED":
      break;

    case "PING":
      sendResponse({ pong: true });
      break;

    default:
      sendResponse({ error: "Unknown message type" });
  }

  return true;
});

console.log("Content script initialized");
