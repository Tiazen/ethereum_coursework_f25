console.log("Background script running");

interface SessionStore {
  isUnlocked: boolean;
  lastActivity: number;
  autoLockTimeout: number;
}

const session: SessionStore = {
  isUnlocked: false,
  lastActivity: Date.now(),
  autoLockTimeout: 60 * 60 * 1000,
};

interface PendingLoginRequest {
  requestId: string;
  callbackUrl: string;
  tabId: number | undefined;
  website: string;
  currentUrl: string;
  timestamp: number;
}

const pendingLoginRequests = new Map<string, PendingLoginRequest>();

function cleanupOldRequests() {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000;
  
  for (const [requestId, request] of pendingLoginRequests.entries()) {
    if (now - request.timestamp > maxAge) {
      pendingLoginRequests.delete(requestId);
    }
  }
}

function validateCallbackUrl(url: string, currentUrl: string): boolean {
  try {
    const callbackUrlObj = new URL(url);
    const currentUrlObj = new URL(currentUrl);
    
    if (callbackUrlObj.origin === currentUrlObj.origin) {
      return true;
    }
    
    const isLocalhost = (hostname: string) => 
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    
    if (isLocalhost(callbackUrlObj.hostname) && isLocalhost(currentUrlObj.hostname)) {
      return callbackUrlObj.port === currentUrlObj.port;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

let autoLockTimer: NodeJS.Timeout | null = null;

function resetAutoLockTimer() {
  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
  }

  if (session.isUnlocked) {
    autoLockTimer = setTimeout(async () => {
      session.isUnlocked = false;
      try {
        const tabs = await browser.tabs.query({});
        tabs.forEach((tab: any) => {
          if (tab.id) {
            browser.tabs.sendMessage(tab.id, {
              type: 'VAULT_LOCKED',
            }).catch(() => {});
          }
        });
      } catch (error) {
        console.error('Failed to notify tabs:', error);
      }
    }, session.autoLockTimeout);
  }
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  session.lastActivity = Date.now();
  resetAutoLockTimer();
  cleanupOldRequests();

  switch (message.type) {
    case 'REQUEST_LOGIN':
      if (!message.callbackUrl || !message.currentUrl) {
        sendResponse({ error: 'Missing callback URL or current URL' });
        return true;
      }
      
      const isValid = validateCallbackUrl(message.callbackUrl, message.currentUrl);
      if (!isValid) {
        sendResponse({ error: 'Invalid callback URL. Must be same origin as current page.' });
        return true;
      }
      
      const requestId = 'login-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
      const tabId = sender.tab?.id;
      
      const pendingRequest: PendingLoginRequest = {
        requestId,
        callbackUrl: message.callbackUrl,
        tabId,
        website: message.website,
        currentUrl: message.currentUrl,
        timestamp: Date.now()
      };
      pendingLoginRequests.set(requestId, pendingRequest);
      
      sendResponse({ requestId, needsConfirmation: true, vaultUnlocked: session.isUnlocked });
      return true;

    case 'CONFIRM_LOGIN':
      const request = pendingLoginRequests.get(message.requestId);
      if (!request) {
        sendResponse({ error: 'Login request not found or expired' });
        return true;
      }
      
      if (!message.token) {
        sendResponse({ error: 'Token not provided' });
        return true;
      }
      
      fetch(request.callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: message.token,
          redirect: request.currentUrl
        })
      })
      .then(async (response) => {
        let serverResponseData: any = null;
        let redirectUrl = request.currentUrl;
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            serverResponseData = await response.json();
            if (serverResponseData.redirect) {
              redirectUrl = serverResponseData.redirect;
            }
          } else {
            const text = await response.text();
            try {
              serverResponseData = JSON.parse(text);
            } catch (e) {
              serverResponseData = { text: text };
            }
          }
        } catch (e) {
          console.log('[Background] Could not parse server response:', e);
        }
        
        let tabIdToUse = request.tabId;
        
        if (!tabIdToUse) {
          try {
            const tabs = await browser.tabs.query({ url: request.currentUrl });
            if (tabs.length > 0 && tabs[0].id) {
              tabIdToUse = tabs[0].id;
            }
          } catch (error) {
            console.error('[Background] Failed to find tab by URL:', error);
          }
        }
        
        if (tabIdToUse) {
          try {
            await browser.tabs.sendMessage(tabIdToUse, {
              type: 'LOGIN_COMPLETE',
              requestId: request.requestId,
              token: message.token,
              redirectUrl: redirectUrl,
              serverResponse: serverResponseData
            });
          } catch (error) {
            try {
              const allTabs = await browser.tabs.query({});
              for (const tab of allTabs) {
                if (tab.id) {
                  try {
                    await browser.tabs.sendMessage(tab.id, {
                      type: 'LOGIN_COMPLETE',
                      requestId: request.requestId,
                      token: message.token,
                      redirectUrl: redirectUrl,
                      serverResponse: serverResponseData
                    });
                    break;
                  } catch (e) {}
                }
              }
            } catch (fallbackError) {
              console.error('[Background] Fallback failed:', fallbackError);
            }
          }
        }
        
        pendingLoginRequests.delete(request.requestId);
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('[Background] Failed to POST to callback URL:', error);
        
        if (request.tabId) {
          browser.tabs.sendMessage(request.tabId, {
            type: 'LOGIN_ERROR',
            requestId: request.requestId,
            error: error.message || 'Failed to send token to callback URL'
          }).catch(() => {});
        }
        
        pendingLoginRequests.delete(message.requestId);
        sendResponse({ error: error.message || 'Failed to send token to callback URL' });
      });
      
      return true;

    case 'CANCEL_LOGIN':
      const cancelledRequest = pendingLoginRequests.get(message.requestId);
      if (cancelledRequest) {
        if (cancelledRequest.tabId) {
          browser.tabs.sendMessage(cancelledRequest.tabId, {
            type: 'LOGIN_ERROR',
            requestId: message.requestId,
            error: 'Login cancelled by user'
          }).catch(() => {});
        }
        pendingLoginRequests.delete(message.requestId);
      }
      sendResponse({ success: true });
      break;

    case 'GET_PENDING_LOGIN_REQUESTS':
      cleanupOldRequests();
      const requests = Array.from(pendingLoginRequests.values());
      sendResponse({ requests });
      return true;

    case 'CHECK_VAULT_STATUS':
      sendResponse({ isUnlocked: session.isUnlocked });
      break;

    case 'VAULT_UNLOCKED':
      session.isUnlocked = true;
      resetAutoLockTimer();
      sendResponse({ success: true });
      break;

    case 'VAULT_LOCKED':
      session.isUnlocked = false;
      if (autoLockTimer) {
        clearTimeout(autoLockTimer);
        autoLockTimer = null;
      }
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return true;
});

console.log("Background script initialized");
