const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  multipleStatements: true
};

const appDbConfig = {
  ...dbConfig,
  database: process.env.DB_NAME || "warungpos"
};

const users = [
  ["Manager Demo", "manager@warungpos.test", "admin123", "manager"],
  ["Operator Demo", "operator@warungpos.test", "admin123", "operator"],
  ["Kasir Demo", "kasir@warungpos.test", "admin123", "kasir"],
  ["Konsumen Demo", "konsumen@warungpos.test", "admin123", "konsumen"]
];

const products = [
  ["Kopi Susu Aren", 18000, 35, "Minuman", "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80"],
  ["Teh Lemon Dingin", 12000, 42, "Minuman", "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80"],
  ["Nasi Ayam Geprek", 22000, 24, "Makanan", "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80"],
  ["Mie Goreng Spesial", 19000, 28, "Makanan", "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=800&q=80"],
  ["Roti Bakar Cokelat", 15000, 20, "Snack", "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80"],
  ["Keripik Kentang", 10000, 50, "Snack", "https://images.unsplash.com/photo-1621447504864-d8686e12698c?auto=format&fit=crop&w=800&q=80"]
];

const upsertUsers = async (connection) => {
  for (const [name, email, plainPassword, role] of users) {
    const password = await bcrypt.hash(plainPassword, 10);
    await connection.execute(
      `
        INSERT INTO users (name, nama, email, password, role)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          nama = VALUES(nama),
          password = VALUES(password),
          role = VALUES(role)
      `,
      [name, name, email, password, role]
    );
  }
};

const seedProducts = async (connection) => {
  for (const product of products) {
    await connection.execute(
      `
        INSERT INTO products (nama_produk, harga, stock, kategori, gambar)
        SELECT ?, ?, ?, ?, ?
        WHERE NOT EXISTS (
          SELECT 1 FROM products WHERE nama_produk = ? LIMIT 1
        )
      `,
      [...product, product[0]]
    );
  }
};

const seedTransactions = async (connection) => {
  const [[kasir]] = await connection.execute("SELECT id FROM users WHERE email = ? LIMIT 1", ["kasir@warungpos.test"]);
  const [[konsumen]] = await connection.execute("SELECT id FROM users WHERE email = ? LIMIT 1", ["konsumen@warungpos.test"]);
  const [productRows] = await connection.execute(
    "SELECT id, harga FROM products WHERE nama_produk IN (?, ?) ORDER BY id ASC LIMIT 2",
    ["Kopi Susu Aren", "Roti Bakar Cokelat"]
  );

  if (!kasir || !konsumen || productRows.length < 2) {
    return;
  }

  const [[existing]] = await connection.execute(
    "SELECT id FROM transactions WHERE invoice = ? LIMIT 1",
    ["DEMO-PAID-001"]
  );

  if (existing) {
    return;
  }

  const items = [
    { product_id: productRows[0].id, qty: 2, price: Number(productRows[0].harga) },
    { product_id: productRows[1].id, qty: 1, price: Number(productRows[1].harga) }
  ].map((item) => ({
    ...item,
    subtotal: item.qty * item.price
  }));
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const fee = Math.round(subtotal * 0.01);

  await connection.beginTransaction();
  try {
    const [result] = await connection.execute(
      `
        INSERT INTO transactions
          (invoice, user_id, cashier_id, subtotal, fee, grand_total, status, payment_method, stock_deducted, created_at)
        VALUES
          (?, ?, ?, ?, ?, ?, 'paid', 'cash', 1, NOW())
      `,
      ["DEMO-PAID-001", konsumen.id, kasir.id, subtotal, fee, subtotal + fee]
    );

    for (const item of items) {
      await connection.execute(
        `
          INSERT INTO transaction_items (transaction_id, product_id, qty, price, subtotal)
          VALUES (?, ?, ?, ?, ?)
        `,
        [result.insertId, item.product_id, item.qty, item.price, item.subtotal]
      );
      await connection.execute(
        "UPDATE products SET stock = GREATEST(stock - ?, 0) WHERE id = ?",
        [item.qty, item.product_id]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
};

const seedApiIntegrations = async (connection) => {
  await connection.execute(
    `
      INSERT INTO api_integrations
        (provider, name, method, base_url, path, headers_json, query_json, body_json, expected_status, description, status, is_active)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'untested', 0
      WHERE NOT EXISTS (
        SELECT 1 FROM api_integrations WHERE provider = ? AND name = ? LIMIT 1
      )
    `,
    [
      "smartbank",
      "SmartBank Create Payment Request",
      "POST",
      process.env.SMARTBANK_BASE_URL || "http://localhost:4000",
      "/api/bank/payment-requests",
      JSON.stringify({
        Authorization: "Bearer {{token}}",
        "Idempotency-Key": "{{idempotency_key}}"
      }),
      JSON.stringify({}),
      JSON.stringify({
        source_app: "POS",
        payer_wallet_id: "{{payer_wallet_id}}",
        payee_wallet_id: "{{payee_wallet_id}}",
        gross_amount: "{{grand_total}}",
        description: "Pembayaran POS {{invoice}}",
        metadata: {
          invoice: "{{invoice}}",
          transaction_id: "{{transaction_id}}"
        },
        expires_at: "{{expires_at}}"
      }),
      201,
      "Membuat payment request SmartBank dari transaksi POS. Isi SMARTBANK_TOKEN, SMARTBANK_PAYER_WALLET_ID, dan SMARTBANK_PAYEE_WALLET_ID di .env sebelum test.",
      "smartbank",
      "SmartBank Create Payment Request"
    ]
  );

  await connection.execute(
    `
      INSERT INTO api_integrations
        (provider, name, method, base_url, path, headers_json, query_json, body_json, expected_status, description, status, is_active)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'untested', 0
      WHERE NOT EXISTS (
        SELECT 1 FROM api_integrations WHERE provider = ? AND name = ? LIMIT 1
      )
    `,
    [
      "smartbank",
      "SmartBank Health Check",
      "GET",
      process.env.SMARTBANK_BASE_URL || "http://localhost:4000",
      "/health",
      JSON.stringify({}),
      JSON.stringify({}),
      JSON.stringify({}),
      200,
      "Mengecek apakah SmartBank API Gateway sedang aktif.",
      "smartbank",
      "SmartBank Health Check"
    ]
  );
};

const main = async () => {
  const schemaPath = path.join(__dirname, "migrate_to_current_schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");

  const rootConnection = await mysql.createConnection(dbConfig);
  await rootConnection.query(schema);
  await rootConnection.end();

  const connection = await mysql.createConnection(appDbConfig);
  await upsertUsers(connection);
  await seedProducts(connection);
  await seedTransactions(connection);
  await seedApiIntegrations(connection);
  await connection.end();

  console.log("Database warungpos siap.");
  console.log("Akun demo: manager/operator/kasir/konsumen@warungpos.test");
  console.log("Password semua akun demo: admin123");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
