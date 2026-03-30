// ─────────────────────────────────────────────────
// WebSocket Event Types shared across client & server
// ─────────────────────────────────────────────────

// ── Client → Server ──
export const WS_EVENTS = {
  // Auth
  AUTHENTICATE: 'authenticate',

  // Tracking: rider emits location updates
  RIDER_LOCATION_UPDATE: 'rider:location:update',

  // Tracking: customer subscribes to a delivery
  TRACKING_SUBSCRIBE: 'tracking:subscribe',
  TRACKING_UNSUBSCRIBE: 'tracking:unsubscribe',

  // Chat
  CHAT_JOIN: 'chat:join',
  CHAT_LEAVE: 'chat:leave',
  CHAT_SEND_MESSAGE: 'chat:send_message',
  CHAT_TYPING: 'chat:typing',
  CHAT_READ: 'chat:read',

  // Admin live dispatch
  ADMIN_SUBSCRIBE_LIVE: 'admin:subscribe_live',
  ADMIN_UNSUBSCRIBE_LIVE: 'admin:unsubscribe_live',
} as const;

// ── Server → Client ──
export const WS_SERVER_EVENTS = {
  // Auth
  AUTHENTICATED: 'authenticated',
  AUTH_ERROR: 'auth_error',

  // Tracking
  RIDER_LOCATION: 'rider:location',
  DELIVERY_STATUS_UPDATE: 'delivery:status_update',
  DELIVERY_ETA_UPDATE: 'delivery:eta_update',

  // Chat
  CHAT_NEW_MESSAGE: 'chat:new_message',
  CHAT_USER_TYPING: 'chat:user_typing',
  CHAT_MESSAGES_READ: 'chat:messages_read',
  CHAT_HISTORY: 'chat:history',

  // Rider-specific
  NEW_DELIVERY_REQUEST: 'delivery:new_request',

  // Matching progress updates (customer watching searching phase)
  MATCHING_UPDATE: 'delivery:matching_update',

  // Admin live dispatch
  ADMIN_ACTIVE_DELIVERIES: 'admin:active_deliveries',
  ADMIN_DELIVERY_UPDATE: 'admin:delivery_update',
  ADMIN_RIDER_LOCATION: 'admin:rider_location',

  // Errors
  ERROR: 'error',
} as const;

// ── Room naming conventions ──
export const getRoomName = {
  delivery: (deliveryId: string) => `delivery:${deliveryId}`,
  chat: (deliveryId: string) => `chat:${deliveryId}`,
  adminLive: () => 'admin:live',
};
