// WebSocket client for real-time data streaming

import { WebSocketMessage, TrackingEvent } from '@/types/tracking';

export class WebSocketClient {
  private websocket: WebSocket | null = null;
  private url: string;
  private sessionId: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // Start with 1 second
  private heartbeatInterval: number | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private listeners: Map<string, Function[]> = new Map();
  private debug: boolean;

  constructor(url: string, sessionId: string, debug: boolean = false) {
    this.url = url;
    this.sessionId = sessionId;
    this.debug = debug;
    this.setupEventListeners();
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.url}?sessionId=${this.sessionId}`;
        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = () => {
          if (this.debug) {
            console.log('WebSocket connected');
          }
          
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.startHeartbeat();
          this.processMessageQueue();
          this.emit('connected');
          resolve();
        };

        this.websocket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.websocket.onclose = (event) => {
          if (this.debug) {
            console.log('WebSocket disconnected:', event.code, event.reason);
          }
          
          this.stopHeartbeat();
          this.emit('disconnected', { code: event.code, reason: event.reason });
          
          // Attempt to reconnect unless it was a clean close
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.websocket.onerror = (error) => {
          if (this.debug) {
            console.error('WebSocket error:', error);
          }
          
          this.emit('error', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    if (this.websocket) {
      this.stopHeartbeat();
      this.websocket.close(1000, 'Client disconnect');
      this.websocket = null;
    }
  }

  /**
   * Send a single tracking event
   */
  public sendEvent(event: TrackingEvent): void {
    const message: WebSocketMessage = {
      type: 'event',
      data: event,
      timestamp: new Date()
    };

    this.sendMessage(message);
  }

  /**
   * Send a batch of tracking events
   */
  public sendEventBatch(events: TrackingEvent[], batchId?: string): void {
    const message: WebSocketMessage = {
      type: 'batch',
      data: events,
      timestamp: new Date()
    };

    if (batchId) {
      (message as any).batchId = batchId;
    }

    this.sendMessage(message);
  }

  /**
   * Send heartbeat to keep connection alive
   */
  private sendHeartbeat(): void {
    const message: WebSocketMessage = {
      type: 'heartbeat',
      data: 'ping',
      timestamp: new Date()
    };

    this.sendMessage(message);
  }

  /**
   * Send message to WebSocket server
   */
  private sendMessage(message: WebSocketMessage): void {
    if (this.isConnected()) {
      try {
        this.websocket!.send(JSON.stringify(message));
        
        if (this.debug && message.type !== 'heartbeat') {
          console.log('Sent WebSocket message:', message.type);
        }
      } catch (error) {
        if (this.debug) {
          console.error('Failed to send WebSocket message:', error);
        }
        this.queueMessage(message);
      }
    } else {
      this.queueMessage(message);
    }
  }

  /**
   * Queue message for later sending
   */
  private queueMessage(message: WebSocketMessage): void {
    // Only queue non-heartbeat messages
    if (message.type !== 'heartbeat') {
      this.messageQueue.push(message);
      
      // Limit queue size to prevent memory issues
      if (this.messageQueue.length > 1000) {
        this.messageQueue.shift(); // Remove oldest message
      }
    }
  }

  /**
   * Process queued messages after reconnection
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    if (this.debug) {
      console.log(`Processing ${this.messageQueue.length} queued messages`);
    }

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach(message => {
      this.sendMessage(message);
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      if (this.debug && message.type !== 'heartbeat_ack') {
        console.log('Received WebSocket message:', message.type);
      }

      this.emit(message.type, message);
      this.emit('message', message);

    } catch (error) {
      if (this.debug) {
        console.error('Failed to parse WebSocket message:', error);
      }
    }
  }

  /**
   * Check if WebSocket is connected
   */
  public isConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  public getState(): number {
    return this.websocket?.readyState ?? WebSocket.CLOSED;
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.debug) {
        console.log('Max reconnection attempts reached');
      }
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

    if (this.debug) {
      console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    }

    setTimeout(() => {
      if (this.websocket?.readyState !== WebSocket.OPEN) {
        this.emit('reconnecting', { attempt: this.reconnectAttempts });
        this.connect().catch(() => {
          // Reconnection failed, will try again
        });
      }
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = window.setInterval(() => {
      if (this.isConnected()) {
        this.sendHeartbeat();
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Set up event listeners for window events
   */
  private setupEventListeners(): void {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, consider pausing or reducing activity
        this.emit('pageHidden');
      } else {
        // Page is visible, resume full activity
        this.emit('pageVisible');
        
        // Reconnect if disconnected while hidden
        if (!this.isConnected()) {
          this.connect().catch(() => {
            // Reconnection failed
          });
        }
      }
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.disconnect();
    });
  }

  /**
   * Add event listener
   */
  public on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Remove event listener
   */
  public off(event: string, callback?: Function): void {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          if (this.debug) {
            console.error(`Error in ${event} listener:`, error);
          }
        }
      });
    }
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    connected: boolean;
    reconnectAttempts: number;
    queuedMessages: number;
    sessionId: string;
  } {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      sessionId: this.sessionId
    };
  }
}