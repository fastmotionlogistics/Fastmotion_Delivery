export const NOTIFICATION_EVENTS = {
  SHOP_ORDER_PROCESSED: 'notification.shop_order_processed', // shop + bakeries
  BAKERY_ORDER_PROCESSED: 'notification.bakery_order_processed', // bakery + shop
  BAKERY_STATUS_UPDATED: 'notification.bakery_status_updated', // shop gets notified
};

export interface OrderProcessedPayload {
  userId: string;
  token: string;
  orderId: string;
  email?: string;
  bakeryId?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface BakeryStatusUpdatedPayload {
  bakeryOrderId: string;
  bakeryId: string;
  recipientType?: any;
  orderId: string;
  status: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}
