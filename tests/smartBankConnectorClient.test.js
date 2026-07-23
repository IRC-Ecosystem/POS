const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SMARTBANK_CONNECTOR_URL = 'http://connector.test:5000';
process.env.SMARTBANK_CONNECTOR_API_KEY = 'sbk_test_key_abcdefghijklmnopqrstuvwxyz';
process.env.SMARTBANK_POS_SELLER_EXTERNAL_ID = 'pos-user-merchant';

test('POS payment uses the Connector contract and stable invoice idempotency key', async () => {
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, json: async () => ({ success: true, data: { status: 'SETTLED', transaction_id: 'tx-1' } }) };
  };

  const connector = require('../services/smartBankConnectorClient');
  const result = await connector.pay({ buyerUserId: 42, amount: 25000, pin: '123456', invoice: 'INV-001' });

  assert.equal(result.status, 'SETTLED');
  assert.equal(request.url, 'http://connector.test:5000/v1/connect/payment-requests');
  assert.equal(request.options.headers.Authorization, `Bearer ${process.env.SMARTBANK_CONNECTOR_API_KEY}`);
  assert.equal(request.options.headers['Idempotency-Key'], 'warungpos-INV-001');
  assert.deepEqual(JSON.parse(request.options.body), {
    buyer_external_id: 'pos-user-42',
    seller_external_id: 'pos-user-merchant',
    gross_amount: '25000',
    pin: '123456',
    description: 'Pembayaran WarungPOS INV-001',
    external_ref_id: 'INV-001'
  });
});

test('merchant linkage lookup preserves its configured external ID', async () => {
  global.fetch = async (url) => {
    assert.equal(url, 'http://connector.test:5000/v1/connect/users/pos-merchant-main');
    return { ok: true, status: 200, json: async () => ({ success: true, data: { smartbank_wallet_id: 'wallet-merchant' } }) };
  };

  const connector = require('../services/smartBankConnectorClient');
  await assert.doesNotReject(() => connector.getLinkageByExternalId('pos-merchant-main'));
});

test('merchant linkage preserves its configured external ID', async () => {
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, json: async () => ({ success: true, data: {} }) };
  };

  const connector = require('../services/smartBankConnectorClient');
  await connector.linkExternalUser('pos-merchant-main', 'verification-token');

  assert.equal(request.url, 'http://connector.test:5000/v1/connect/users/link');
  assert.equal(JSON.parse(request.options.body).external_user_id, 'pos-merchant-main');
});
