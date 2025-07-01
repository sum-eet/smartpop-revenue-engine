
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private sessionId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: { [key: string]: Function[] } = {};
  private queuedMessages: string[] = [];
  private isConnected = false;

  constructor(url: string, sessionId: string, autoReconnect: boolean = true) {
    this.url = url;
    this.sessionId = sessionId;
  }

  async connect(): Promise<void> {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        this.flushQueue();
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit('disconnected');
      };

      this.ws.onerror = (error) => {
        this.emit('error', error);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type || 'message', data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    } catch (error) {
      this.emit('error', error);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  send(data: any): void {
    const message = JSON.stringify(data);
    
    if (this.isConnected && this.ws) {
      this.ws.send(message);
    } else {
      this.queuedMessages.push(message);
    }
  }

  on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  private emit(event: string, data?: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  private flushQueue(): void {
    while (this.queuedMessages.length > 0) {
      const message = this.queuedMessages.shift();
      if (message) {
        this.ws?.send(message);
      }
    }
  }

  getStats() {
    return {
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.queuedMessages.length,
      sessionId: this.sessionId,
      isConnected: this.isConnected
    };
  }
}
