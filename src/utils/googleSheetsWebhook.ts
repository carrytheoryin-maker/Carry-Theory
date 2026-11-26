import type { Order } from '../types';

const WEBHOOK_URL = (import.meta.env.VITE_GOOGLE_SCRIPT_WEBHOOK_URL || '').trim();

async function sendToGoogleSheet(payload: Record<string, unknown>): Promise<boolean> {
  if (!WEBHOOK_URL) return false;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return true;
  } catch {
    return false;
  }
}

export async function syncOrderToGoogleSheet(order: Order): Promise<boolean> {
  const itemsSummary = order.items
    .map(
      (item) =>
        `${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ''} x${item.quantity} [INR ${item.price}]`
    )
    .join(' | ');

  return sendToGoogleSheet({
    type: 'order',
    timestamp: order.createdAt,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    address: order.address,
    city: order.city,
    state: order.state,
    pinCode: order.pinCode,
    itemsSummary,
    subtotal: order.subtotal,
    customisationRequested: order.customisationRequested ? 'Yes' : 'No',
    customisationFee: order.customisationFee,
    deliveryCharges: order.deliveryCharges,
    total: order.total,
    paymentMode: order.paymentMode === 'upi' ? 'UPI' : 'Cash on Delivery',
    paymentStatus: order.paymentStatus,
    upiTransactionRef: order.upiTransactionRef || '',
  });
}

export async function syncSubscriberToGoogleSheet(email: string): Promise<boolean> {
  return sendToGoogleSheet({
    type: 'subscriber',
    timestamp: new Date().toISOString(),
    email,
  });
}

export async function syncEnquiryToGoogleSheet(payload: {
  type: 'contact' | 'customisation';
  fullName: string;
  email: string;
  phone: string;
  productInterest: string;
  customisationRequirements: string;
  message: string;
}): Promise<boolean> {
  return sendToGoogleSheet({
    type: 'enquiry',
    enquiryType: payload.type,
    timestamp: new Date().toISOString(),
    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    productInterest: payload.productInterest,
    customisationRequirements: payload.customisationRequirements,
    message: payload.message,
  });
}
