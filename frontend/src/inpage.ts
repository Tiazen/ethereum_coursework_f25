(function() {
  const INPAGE_ID = 'eth-oauth-inpage-' + Math.random().toString(36).substr(2, 9);
  const pendingRequests = new Map<string, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  
  window.addEventListener('message', function(event) {
    if (event.source !== window || !event.data || event.data.source !== 'eth-oauth-content') {
      return;
    }
    
    if (event.data.responseId) {
      const handler = pendingRequests.get(event.data.responseId);
      if (handler) {
        if (event.data.target && 
            event.data.target !== INPAGE_ID && 
            event.data.target !== 'eth-oauth-inpage') {
          return;
        }
        
        pendingRequests.delete(event.data.responseId);
        if (event.data.error) {
          handler.reject(new Error(event.data.error));
        } else {
          handler.resolve(event.data.result);
        }
      }
    }
  });
  
  function sendToContentScript(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const responseId = Math.random().toString(36).substr(2, 9);
      pendingRequests.set(responseId, { resolve, reject });
      
      window.postMessage({
        source: 'eth-oauth-inpage',
        target: 'eth-oauth-content',
        responseId,
        ...message
      }, '*');
      
      setTimeout(() => {
        if (pendingRequests.has(responseId)) {
          pendingRequests.delete(responseId);
          reject(new Error('Request timeout - please confirm login in the extension popup'));
        }
      }, 120000);
    });
  }
  
  const getAuthToken = async (callbackUrl?: string): Promise<string | { token: string; serverResponse?: any; redirectUrl?: string }> => {
    if (callbackUrl) {
      const result = await sendToContentScript({
        type: 'REQUEST_LOGIN',
        website: window.location.hostname,
        callbackUrl: callbackUrl,
        currentUrl: window.location.href
      });
      if (result.token) {
        if (result.serverResponse !== undefined) {
          return {
            token: result.token,
            serverResponse: result.serverResponse,
            redirectUrl: result.redirectUrl
          };
        }
        return result.token;
      }
      throw new Error(result.error || 'Failed to get token');
    } else {
      const result = await sendToContentScript({
        type: 'REQUEST_JWT_TOKEN',
        website: window.location.hostname
      });
      return result.token;
    }
  };
  
  const login = async (callbackUrl: string): Promise<string | { token: string; serverResponse?: any; redirectUrl?: string }> => {
    return getAuthToken(callbackUrl);
  };
  
  (window as any).EthOAuth = {
    getAuthToken,
    getToken: getAuthToken,
    login,
    async isUnlocked(): Promise<boolean> {
      const result = await sendToContentScript({
        type: 'CHECK_VAULT_STATUS'
      });
      return result.isUnlocked || false;
    },
    version: "1.0.0",
  };
  
  console.log('[EthOAuth] Inpage script loaded, window.EthOAuth is available');
})();
