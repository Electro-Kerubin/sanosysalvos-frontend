

import io from 'socket.io-client';
import { API_BASE } from '../config';

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.userId = null;
    this.currentRoom = null;
    this.listeners = {};
  }

  connect(userId, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        this.userId = userId;

        this.socket = io(API_BASE, {
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          transports: ['websocket', 'polling'],
          auth: {
            userId,
          },
          ...options,
        });

        this.socket.on('connect', () => {
          console.info('[SocketManager] Conectado al servidor WebSocket');
          this.isConnected = true;
          this._emit('connected');
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.warn('[SocketManager] Desconectado:', reason);
          this.isConnected = false;
          this._emit('disconnected', { reason });
        });

        this.socket.on('connect_error', (error) => {
          console.error('[SocketManager] Error de conexión:', error);
          this._emit('error', { error });
          reject(error);
        });

        this.socket.on('message', (data) => this._emit('message', data));
        this.socket.on('user_joined', (data) => this._emit('user_joined', data));
        this.socket.on('user_left', (data) => this._emit('user_left', data));
        this.socket.on('location_update', (data) => this._emit('location_update', data));
      } catch (error) {
        console.error('[SocketManager] Error en connect:', error);
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      console.info('[SocketManager] Desconexión manual');
    }
  }

  joinRescueRoom(roomId, userData = {}) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.isConnected) {
          reject(new Error('No conectado al servidor'));
          return;
        }

        this.currentRoom = roomId;

        this.socket.emit('join_room', {
          roomId,
          userId: this.userId,
          userData,
        }, (acknowledgment) => {
          if (acknowledgment && acknowledgment.success) {
            console.info(`[SocketManager] Unido a sala: ${roomId}`);
            this._emit('room_joined', acknowledgment);
            resolve(acknowledgment);
          } else {
            reject(new Error(acknowledgment?.message || 'No se pudo unir a la sala'));
          }
        });
      } catch (error) {
        console.error('[SocketManager] Error en joinRescueRoom:', error);
        reject(error);
      }
    });
  }

  leaveRoom() {
    return new Promise((resolve) => {
      try {
        if (this.currentRoom && this.isConnected) {
          this.socket.emit('leave_room', {
            roomId: this.currentRoom,
            userId: this.userId,
          }, () => {
            console.info(`[SocketManager] Salida de sala: ${this.currentRoom}`);
            this.currentRoom = null;
            this._emit('room_left');
            resolve();
          });
        } else {
          resolve();
        }
      } catch (error) {
        console.error('[SocketManager] Error en leaveRoom:', error);
        resolve();
      }
    });
  }

  sendMessage(messageText, extras = {}) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.currentRoom || !this.isConnected) {
          reject(new Error('No hay sala activa o sin conexión'));
          return;
        }

        const message = {
          roomId: this.currentRoom,
          userId: this.userId,
          text: messageText,
          timestamp: new Date().toISOString(),
          ...extras,
        };

        this.socket.emit('send_message', message, (acknowledgment) => {
          if (acknowledgment && acknowledgment.success) {
            console.info('[SocketManager] Mensaje enviado');
            resolve(acknowledgment);
          } else {
            reject(new Error(acknowledgment?.message || 'No se pudo enviar el mensaje'));
          }
        });
      } catch (error) {
        console.error('[SocketManager] Error en sendMessage:', error);
        reject(error);
      }
    });
  }

  shareLocation(latitude, longitude, accuracy = null) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.currentRoom || !this.isConnected) {
          reject(new Error('No hay sala activa o sin conexión'));
          return;
        }

        this.socket.emit('share_location', {
          roomId: this.currentRoom,
          userId: this.userId,
          latitude,
          longitude,
          accuracy,
          timestamp: new Date().toISOString(),
        }, (acknowledgment) => {
          if (acknowledgment && acknowledgment.success) {
            console.info('[SocketManager] Ubicación compartida');
            resolve(acknowledgment);
          } else {
            reject(new Error('No se pudo compartir ubicación'));
          }
        });
      } catch (error) {
        console.error('[SocketManager] Error en shareLocation:', error);
        reject(error);
      }
    });
  }

  getMessageHistory(roomId, limit = 50) {
    return new Promise((resolve, reject) => {
      try {
        this.socket.emit('get_message_history', {
          roomId,
          limit,
        }, (response) => {
          if (response && response.success) {
            resolve(response.messages || []);
          } else {
            reject(new Error(response?.message || 'No se pudo obtener el historial'));
          }
        });
      } catch (error) {
        console.error('[SocketManager] Error en getMessageHistory:', error);
        reject(error);
      }
    });
  }

  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }

    this.listeners[eventName].push(callback);

    return () => {
      this.listeners[eventName] = this.listeners[eventName].filter(
        (cb) => cb !== callback
      );
    };
  }

  _emit(eventName, data) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[SocketManager] Error en listener ${eventName}:`, error);
        }
      });
    }
  }

  isReady() {
    return this.isConnected && this.socket?.connected;
  }

  getCurrentRoom() {
    return this.currentRoom;
  }

  getSocket() {
    return this.socket;
  }
}

const socketManager = new SocketManager();

export default socketManager;
