class RealTimeSync {
  constructor(url) {
    this.url = url;
    this.listeners = {};
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 20;
    this.reconnectInterval = 3000;
    this.pingInterval = null;
    this.restaurantId = null;
    this.connect();
  }

  connect() {
    console.log(`Connecting to WebSocket: ${this.url}`);
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('WebSocket connection established.');
      this.reconnectAttempts = 0;
      this.trigger('connect', null);
      
      // If we already have a restaurantId, re-register it
      if (this.restaurantId) {
        this.registerRestaurant(this.restaurantId, this.role);
      }

      // Setup regular ping to keep connection alive
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.pingInterval = setInterval(() => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: 'PING' }));
        }
      }, 15000);
    };

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'PONG') return;
        this.trigger(payload.type, payload);
      } catch (err) {
        console.warn('Error parsing socket message:', err);
      }
    };

    this.socket.onclose = () => {
      console.warn('WebSocket connection closed. Attempting reconnect...');
      this.trigger('disconnect', null);
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.attemptReconnect();
    };

    this.socket.onerror = (err) => {
      console.error('WebSocket error:', err);
      this.socket.close();
    };
  }

  registerRestaurant(restaurantId, role = 'customer') {
    this.restaurantId = restaurantId;
    this.role = role;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'REGISTER', restaurantId, role }));
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max WebSocket reconnect attempts reached.');
      return;
    }
    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return callback; // Return ref for cleanup
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  trigger(event, data) {
    const list = this.listeners[event] || [];
    list.forEach(cb => cb(data));
  }

  onOrderUpdate(callback) {
    const cbCreated = (data) => callback(data.order || data);
    const cbUpdated = (data) => callback(data.order || data);
    this.on('ORDER_CREATED', cbCreated);
    this.on('ORDER_UPDATED', cbUpdated);
    return () => {
      this.off('ORDER_CREATED', cbCreated);
      this.off('ORDER_UPDATED', cbUpdated);
    };
  }
}

import { WS_URL } from './config';

export const realTimeSync = new RealTimeSync(WS_URL);
