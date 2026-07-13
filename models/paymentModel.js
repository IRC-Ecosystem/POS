const db = require("../config/db");

const query = (sql, values = []) => new Promise((resolve, reject) => {
  db.query(sql, values, (error, results) => {
    if (error) {
      return reject(error);
    }

    return resolve(results);
  });
});

const getSingle = async (sql, values = []) => {
  const results = await query(sql, values);
  return results[0] || null;
};

const normalizeStatus = (status) => {
  if (["pending", "success", "failed"].includes(status)) {
    return status;
  }

  return "pending";
};

exports.create = async ({
  transactionId,
  provider = "local",
  method,
  status,
  amount,
  paymentRequestId = null,
  providerReference = null,
  responseCode = null,
  responseBody = null,
  cashierId = null
}) => {
  const paymentStatus = normalizeStatus(status);
  const paidAt = paymentStatus === "success" ? new Date() : null;

  const result = await query(
    `
      INSERT INTO payments (
        transaction_id,
        provider,
        method,
        status,
        amount,
        payment_request_id,
        provider_reference,
        response_code,
        response_body,
        cashier_id,
        paid_at,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      transactionId,
      provider,
      method,
      paymentStatus,
      amount,
      paymentRequestId,
      providerReference,
      responseCode,
      responseBody,
      cashierId,
      paidAt
    ]
  );

  return {
    id: result.insertId,
    status: paymentStatus
  };
};

exports.getLatestSuccessfulByTransactionId = async (transactionId) => {
  return getSingle(
    `
      SELECT
        p.id,
        p.transaction_id,
        p.provider,
        p.method,
        p.status,
        p.amount,
        p.payment_request_id,
        p.provider_reference,
        p.response_code,
        p.response_body,
        p.cashier_id,
        p.paid_at,
        p.created_at,
        u.nama AS cashier_name,
        u.email AS cashier_email
      FROM payments p
      LEFT JOIN users u ON u.id = p.cashier_id
      WHERE p.transaction_id = ?
        AND p.status = 'success'
      ORDER BY p.paid_at DESC, p.id DESC
      LIMIT 1
    `,
    [transactionId]
  );
};

exports.getRecent = async ({ limit = 8, offset = 0 } = {}) => {
  return query(
    `
      SELECT
        p.id,
        p.transaction_id,
        p.provider,
        p.method,
        p.status,
        p.amount,
        p.payment_request_id,
        p.provider_reference,
        p.response_code,
        p.cashier_id,
        p.paid_at,
        p.created_at,
        t.invoice,
        t.status AS transaction_status,
        u.nama AS cashier_name,
        u.email AS cashier_email
      FROM payments p
      LEFT JOIN transactions t ON t.id = p.transaction_id
      LEFT JOIN users u ON u.id = p.cashier_id
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ?
      OFFSET ?
    `,
    [limit, offset]
  );
};
