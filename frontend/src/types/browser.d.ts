
interface MessageSender {
  tab?: any;
  frameId?: number;
  id?: string;
  url?: string;
}

interface BrowserRuntime {
  sendMessage(message: any, responseCallback?: (response: any) => void): void;
  getURL(path: string): string;
  onMessage: {
    addListener(
      callback: (
        message: any,
        sender: MessageSender,
        sendResponse: (response?: any) => void
      ) => boolean | void
    ): void;
    removeListener(callback: any): void;
  };
  MessageSender: MessageSender;
}

interface BrowserTabs {
  query(queryInfo: any): Promise<any[]>;
  sendMessage(tabId: number, message: any): Promise<any>;
  create(createProperties: { url: string; [key: string]: any }): Promise<any>;
  onUpdated: {
    addListener(
      callback: (tabId: number, changeInfo: any, tab: any) => void
    ): void;
  };
}

interface BrowserStorage {
  local: {
    get(keys?: string | string[] | { [key: string]: any } | null): Promise<{ [key: string]: any }>;
    set(items: { [key: string]: any }): Promise<void>;
    remove(keys: string | string[]): Promise<void>;
  };
}

interface Browser {
  runtime: BrowserRuntime;
  tabs: BrowserTabs;
  storage: BrowserStorage;
}

declare const browser: Browser;

