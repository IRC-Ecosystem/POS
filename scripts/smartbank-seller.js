const crypto = require('crypto');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mode = process.argv[2];
const args = process.argv.slice(3);
const baseUrl = (process.env.SMARTBANK_CONNECTOR_URL || 'http://localhost:5000').replace(/\/$/, '');
const apiKey = process.env.SMARTBANK_CONNECTOR_API_KEY;

if (!apiKey) {
  console.error('SMARTBANK_CONNECTOR_API_KEY wajib di-set di .env POS.');
  process.exit(1);
}

async function call(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.error?.message || `HTTP ${response.status}`);
  return payload.data ?? payload;
}

async function main() {
  if (mode === 'request') {
    const [phone, externalId = process.env.SMARTBANK_POS_SELLER_EXTERNAL_ID] = args;
    if (!phone || !externalId) throw new Error('Usage: npm run smartbank:seller:request -- <phone> <external-id>');
    const result = await call('/v1/connect/users/otp/request', { phone, purpose: 'WALLET_LINK' });
    console.log(`OTP request id: ${result.request_id}`);
    console.log(`Buka Inbox SmartBank pemilik ${phone}, lalu jalankan: npm run smartbank:seller:link -- ${result.request_id} <OTP> ${externalId}`);
    return;
  }

  if (mode === 'link') {
    const [requestId, code, externalId = process.env.SMARTBANK_POS_SELLER_EXTERNAL_ID] = args;
    if (!requestId || !/^\d{6}$/.test(code || '') || !externalId) throw new Error('Usage: npm run smartbank:seller:link -- <request-id> <6-digit-otp> <external-id>');
    const verified = await call('/v1/connect/users/otp/verify', { request_id: requestId, code });
    const linkage = await call('/v1/connect/users/link', { external_user_id: externalId, verification_token: verified.verification_token });
    console.log(`Seller ${externalId} terhubung ke wallet ${linkage.smartbank_wallet_id}.`);
    return;
  }

  throw new Error('Mode wajib request atau link.');
}

main().catch((error) => { console.error(error.message); process.exit(1); });
