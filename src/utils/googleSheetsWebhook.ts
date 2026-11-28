import type { Order } from '../types';
import { sanitizeMultilineText, sanitizeText } from './sanitize';

const RAW_WEBHOOK_URL = (import.meta.env?.VITE_GOOGLE_SCRIPT_WEBHOOK_URL || '').trim();

function getValidatedWebhookUrl(): string | null {
  if (!RAW_WEBHOOK_URL) return null;
  try {
    const parsed = new URL(RAW_WEBHOOK_URL);
    const allowedHosts = ['script.google.com', 'script.googleusercontent.com'];
    const hostOk = allowedHosts.some(
      (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
    if (parsed.protocol !== 'https:' || !hostOk) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

async function sendToGoogleSheet(payload: Record<string, unknown>): Promise<boolean> {
  const webhookUrl = getValidatedWebhookUrl();
  if (!webhookUrl) return false;
  try {
    await fetch(webhookUrl, {
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
        `${sanitizeText(item.productName, 140)}${item.variantLabel ? ` (${sanitizeText(item.variantLabel, 80)})` : ''} x${item.quantity} [INR ${item.price}]`
    )
    .join(' | ');

  return sendToGoogleSheet({
    type: 'order',
    timestamp: order.createdAt,
    orderNumber: sanitizeText(order.orderNumber, 40),
    customerName: sanitizeText(order.customerName, 140),
    email: sanitizeText(order.email, 180),
    phone: sanitizeText(order.phone, 25),
    address: sanitizeMultilineText(order.address, 400),
    city: sanitizeText(order.city, 120),
    state: sanitizeText(order.state, 120),
    pinCode: sanitizeText(order.pinCode, 10),
    itemsSummary,
    subtotal: order.subtotal,
    customisationRequested: order.customisationRequested ? 'Yes' : 'No',
    customisationFee: order.customisationFee,
    deliveryCharges: order.deliveryCharges,
    total: order.total,
    paymentMode: order.paymentMode === 'upi' ? 'UPI' : 'Cash on Delivery',
    paymentStatus: order.paymentStatus,
    upiTransactionRef: sanitizeText(order.upiTransactionRef || '', 80),
  });
}

export async function syncSubscriberToGoogleSheet(email: string): Promise<boolean> {
  return sendToGoogleSheet({
    type: 'subscriber',
    timestamp: new Date().toISOString(),
    email: sanitizeText(email, 180).toLowerCase(),
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
    fullName: sanitizeText(payload.fullName, 140),
    email: sanitizeText(payload.email, 180).toLowerCase(),
    phone: sanitizeText(payload.phone, 25),
    productInterest: sanitizeText(payload.productInterest, 240),
    customisationRequirements: sanitizeMultilineText(payload.customisationRequirements, 1000),
    message: sanitizeMultilineText(payload.message, 2000),
  });
}
