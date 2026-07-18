import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';

const graphBaseUrl = 'https://graph.facebook.com';

export function whatsappConfiguration() {
  const outboundReady = Boolean(
    env.whatsapp.accessToken && env.whatsapp.phoneNumberId && env.whatsapp.apiVersion
  );
  const webhookReady = Boolean(env.whatsapp.appSecret && env.whatsapp.verifyToken);
  return { outboundReady, webhookReady, ready: outboundReady && webhookReady };
}

export function normalizeWhatsappNumber(value: string) {
  return value.replace(/\D/g, '');
}

export function verifyWebhookSignature(rawBody: Buffer | undefined, signature: string | undefined) {
  if (!rawBody || !signature || !env.whatsapp.appSecret) return false;
  const received = signature.replace(/^sha256=/, '');
  const expected = createHmac('sha256', env.whatsapp.appSecret).update(rawBody).digest('hex');
  const receivedBuffer = Buffer.from(received, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export async function sendWhatsappText(to: string, body: string) {
  if (!whatsappConfiguration().outboundReady) {
    throw new Error('A integração oficial do WhatsApp não está configurada.');
  }
  const response = await fetch(
    `${graphBaseUrl}/${env.whatsapp.apiVersion}/${env.whatsapp.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.whatsapp.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } })
    }
  );
  const payload = (await response.json().catch(() => ({}))) as {
    messages?: { id: string }[];
    error?: { message?: string };
  };
  if (!response.ok)
    throw new Error(payload.error?.message || 'A Meta recusou o envio da mensagem.');
  return payload.messages?.[0]?.id;
}
