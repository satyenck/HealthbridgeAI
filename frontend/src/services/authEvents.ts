import {EventEmitter} from 'events';

// Simple event bus for auth-related events across the app
export const authEvents = new EventEmitter();
export const AUTH_EVENT_SESSION_EXPIRED = 'sessionExpired';
