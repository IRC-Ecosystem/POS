const TransactionModel = require("../models/transactionModel");
const ApiIntegrationModel = require("../models/apiIntegrationModel");
const PaymentModel = require("../models/paymentModel");
const SmartBankConnector = require("../services/smartBankConnectorClient");
const { callExternalIntegration } = require("../services/apiIntegrationClient");
const { createObjectCsvStringifier } = require("csv-writer");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const ALLOWED_FILTERS = ["today", "week", "month", "all"];
const RECENT_TRANSACTIONS_PER_PAGE = 6;
const API_ENDPOINTS = [
  { method: "GET", path: "/", purpose: "Landing page atau redirect dashboard sesuai role jika sudah login.", direction: "authRoutes -> static index.html / role redirect", access: "Publik", response: "HTML" },
  { method: "GET", path: "/login", purpose: "Menampilkan halaman login.", direction: "authController.showLogin", access: "Publik", response: "HTML" },
  { method: "POST", path: "/login", purpose: "Memvalidasi email/password dan membuat session user.", direction: "authController.login", access: "Publik", response: "Redirect / HTML error" },
  { method: "GET", path: "/register", purpose: "Menampilkan form registrasi akun konsumen.", direction: "authController.showRegister", access: "Publik", response: "HTML" },
  { method: "POST", path: "/register", purpose: "Membuat akun baru dengan role konsumen.", direction: "authController.register", access: "Publik", response: "Redirect / HTML error" },
  { method: "POST", path: "/logout", purpose: "Menghapus session login.", direction: "authController.logout", access: "Login", response: "Redirect" },
  { method: "GET", path: "/manager", purpose: "Dashboard KPI, grafik penjualan, transaksi terbaru, dan monitor kasir.", direction: "managerController.index", access: "Manager", response: "HTML" },
  { method: "GET", path: "/manager/payments", purpose: "Menampilkan riwayat payment terpisah dari transaksi untuk audit pembayaran.", direction: "managerController.payments", access: "Manager", response: "HTML" },
  { method: "GET", path: "/manager/api-integrator", purpose: "Menampilkan halaman dokumentasi endpoint ala Swagger.", direction: "managerController.apiIntegrator", access: "Manager", response: "HTML" },
  { method: "GET", path: "/manager/api-integrator/local", purpose: "Menampilkan dokumentasi endpoint lokal POS.", direction: "managerController.localApiIntegrator", access: "Manager", response: "HTML" },
  { method: "GET", path: "/manager/api-integrator/:provider", purpose: "Menampilkan halaman pengelolaan endpoint API eksternal sesuai provider.", direction: "managerController.providerApiIntegrator", access: "Manager", response: "HTML" },
  { method: "GET", path: "/manager/api-spec.json", purpose: "Mengambil dokumentasi endpoint dalam format JSON mirip OpenAPI.", direction: "managerController.exportApiSpec", access: "Manager", response: "JSON" },
  { method: "GET", path: "/manager/api-health.json", purpose: "Mengecek status route API: GET dites aman, POST divalidasi terdaftar tanpa dieksekusi.", direction: "managerController.checkApiHealth", access: "Manager", response: "JSON" },
  { method: "GET", path: "/manager/export/csv", purpose: "Mengunduh laporan transaksi sesuai filter periode dalam format CSV.", direction: "managerController.exportCsv", access: "Manager", response: "CSV download" },
  { method: "GET", path: "/manager/export/pdf", purpose: "Mengunduh laporan transaksi sesuai filter periode dalam format PDF.", direction: "managerController.exportPdf", access: "Manager", response: "PDF download" },
  { method: "GET", path: "/operator", purpose: "Dashboard manajemen produk dan inventory.", direction: "operatorController.index", access: "Operator", response: "HTML" },
  { method: "POST", path: "/operator/products", purpose: "Menambah produk baru.", direction: "operatorController.createProduct", access: "Operator", response: "Redirect" },
  { method: "POST", path: "/operator/products/:id/update", purpose: "Mengubah data produk berdasarkan ID.", direction: "operatorController.updateProduct", access: "Operator", response: "Redirect" },
  { method: "POST", path: "/operator/products/:id/stock", purpose: "Mengubah stok produk berdasarkan ID.", direction: "operatorController.updateStock", access: "Operator", response: "Redirect" },
  { method: "POST", path: "/operator/products/:id/delete", purpose: "Menghapus produk berdasarkan ID.", direction: "operatorController.deleteProduct", access: "Operator", response: "Redirect" },
  { method: "GET", path: "/kasir", purpose: "Dashboard kasir untuk direct sale, approval pesanan, pembayaran, dan ringkasan transaksi.", direction: "kasirController.index", access: "Kasir", response: "HTML" },
  { method: "GET", path: "/kasir/receipt/:id", purpose: "Menampilkan struk transaksi kasir berdasarkan ID transaksi.", direction: "kasirController.receipt", access: "Kasir", response: "HTML" },
  { method: "POST", path: "/kasir/direct-sale", purpose: "Membuat invoice transaksi langsung oleh kasir dengan status pending payment.", direction: "kasirController.createDirectSale", access: "Kasir", response: "Redirect" },
  { method: "POST", path: "/kasir/approve/:id", purpose: "Menyetujui transaksi konsumen berstatus pending.", direction: "kasirController.approveTransaction", access: "Kasir", response: "Redirect" },
  { method: "POST", path: "/kasir/reject/:id", purpose: "Menolak transaksi konsumen berstatus pending.", direction: "kasirController.rejectTransaction", access: "Kasir", response: "Redirect" },
  { method: "POST", path: "/kasir/pay/:id", purpose: "Memproses pembayaran transaksi approved dan mengubah status menjadi paid.", direction: "kasirController.payTransaction", access: "Kasir", response: "Redirect" },
  { method: "POST", path: "/pos/pembayaran", purpose: "API simulasi pembayaran SmartBank untuk transaksi approved.", direction: "kasirController.smartBankPayment", access: "Kasir", response: "JSON" },
  { method: "GET", path: "/konsumen", purpose: "Katalog produk, filter produk, dan cart konsumen.", direction: "konsumenController.index", access: "Konsumen", response: "HTML" },
  { method: "GET", path: "/konsumen/profile", purpose: "Menampilkan profil konsumen.", direction: "konsumenController.profile", access: "Konsumen", response: "HTML" },
  { method: "POST", path: "/konsumen/profile", purpose: "Mengubah nama, email, dan nomor telepon konsumen.", direction: "konsumenController.updateProfile", access: "Konsumen", response: "Redirect / HTML error" },
  { method: "POST", path: "/konsumen/profile/password", purpose: "Mengubah password konsumen.", direction: "konsumenController.updatePassword", access: "Konsumen", response: "Redirect / HTML error" },
  { method: "GET", path: "/konsumen/history", purpose: "Menampilkan riwayat transaksi konsumen.", direction: "konsumenController.history", access: "Konsumen", response: "HTML" },
  { method: "GET", path: "/konsumen/waiting/:invoice", purpose: "Menampilkan status approval/pembayaran transaksi berdasarkan invoice.", direction: "konsumenController.waitingApproval", access: "Konsumen", response: "HTML" },
  { method: "GET", path: "/konsumen/receipt/:invoice", purpose: "Menampilkan struk transaksi paid berdasarkan invoice.", direction: "konsumenController.receipt", access: "Konsumen", response: "HTML" },
  { method: "GET", path: "/konsumen/receipt/:invoice/download", purpose: "Mengunduh struk transaksi paid dalam format PDF.", direction: "konsumenController.downloadReceipt", access: "Konsumen", response: "PDF download" },
  { method: "POST", path: "/konsumen/cart/:id/add", purpose: "Menambahkan produk ke cart session konsumen.", direction: "konsumenController.addToCart", access: "Konsumen", response: "Redirect" },
  { method: "POST", path: "/konsumen/cart/:id/qty", purpose: "Menambah atau mengurangi jumlah item di cart.", direction: "konsumenController.updateCartQuantity", access: "Konsumen", response: "Redirect" },
  { method: "POST", path: "/konsumen/cart/:id/remove", purpose: "Menghapus item dari cart.", direction: "konsumenController.removeFromCart", access: "Konsumen", response: "Redirect" },
  { method: "POST", path: "/konsumen/checkout", purpose: "Membuat transaksi pending dari isi cart konsumen.", direction: "konsumenController.checkout", access: "Konsumen", response: "Redirect" }
];

const ROUTES_DIR = path.join(__dirname, "..", "routes");
const metadataByEndpoint = new Map(API_ENDPOINTS.map((endpoint) => [`${endpoint.method}:${endpoint.path}`, endpoint]));
const EXTERNAL_API_PROVIDERS = {
  smartbank: {
    key: "smartbank",
    name: "SmartBank",
    description: "Kelola endpoint pembayaran, status pembayaran, refund, dan callback bank.",
    tone: "from-blue-600 to-sky-500",
    sampleEndpoints: [
      { name: "Create Payment", method: "POST", path: "/v2/payments/create", status: "Belum dicek" },
      { name: "Check Payment Status", method: "GET", path: "/v2/payments/{invoice}", status: "Belum dicek" }
    ]
  },
  "api-gateway": {
    key: "api-gateway",
    name: "API Gateway",
    description: "Kelola endpoint penghubung antar sistem, routing, autentikasi, dan relay data.",
    tone: "from-slate-800 to-slate-600",
    sampleEndpoints: [
      { name: "Forward Transaction", method: "POST", path: "/gateway/transactions", status: "Belum dicek" }
    ]
  },
  "umkm-insight": {
    key: "umkm-insight",
    name: "UMKM Insight",
    description: "Kelola endpoint analitik, laporan performa usaha, insight produk, dan sinkronisasi data.",
    tone: "from-emerald-600 to-teal-500",
    sampleEndpoints: [
      { name: "Sync Sales Insight", method: "POST", path: "/insight/sales/sync", status: "Belum dicek" },
      { name: "Product Recommendation", method: "GET", path: "/insight/products/recommendation", status: "Belum dicek" }
    ]
  }
};

const parseOptionalJsonInput = (value, fieldLabel) => {
  if (!value || !String(value).trim()) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    const validationError = new Error(`${fieldLabel} harus berupa JSON valid.`);
    validationError.isValidationError = true;
    throw validationError;
  }
};

const normalizeExternalApiInput = (providerKey, body) => {
  const name = body.name ? body.name.trim() : "";
  const method = body.method ? body.method.trim().toUpperCase() : "";
  const baseUrl = body.base_url ? body.base_url.trim().replace(/\/+$/, "") : "";
  const apiPath = body.path ? body.path.trim() : "";
  const expectedStatus = Number(body.expected_status || 200);

  if (!name) {
    throw Object.assign(new Error("Nama endpoint wajib diisi."), { isValidationError: true });
  }

  if (!["GET", "POST", "PUT", "DELETE"].includes(method)) {
    throw Object.assign(new Error("Method endpoint tidak valid."), { isValidationError: true });
  }

  if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
    throw Object.assign(new Error("Base URL wajib diawali http:// atau https://."), { isValidationError: true });
  }

  if (!apiPath || !apiPath.startsWith("/")) {
    throw Object.assign(new Error("Path wajib diawali dengan /."), { isValidationError: true });
  }

  if (!Number.isInteger(expectedStatus) || expectedStatus < 100 || expectedStatus > 599) {
    throw Object.assign(new Error("Expected status harus angka HTTP 100-599."), { isValidationError: true });
  }

  return {
    provider: providerKey,
    name,
    method,
    base_url: baseUrl,
    path: apiPath,
    headers_json: parseOptionalJsonInput(body.headers_json, "Headers JSON"),
    query_json: parseOptionalJsonInput(body.query_json, "Query JSON"),
    body_json: parseOptionalJsonInput(body.body_json, "Request Body JSON"),
    expected_status: expectedStatus,
    description: body.description ? body.description.trim() : ""
  };
};

const redirectProvider = (providerKey) => `/manager/api-integrator/${providerKey}`;

const setFlash = (req, payload) => {
  req.session.flash = payload;
};

const getMerchantExternalId = () => String(process.env.SMARTBANK_POS_SELLER_EXTERNAL_ID || "").trim();

exports.smartBankWallet = async (req, res) => {
  const externalId = getMerchantExternalId();
  const linkSession = req.session.smartBankMerchantLink || {};
  let merchantWallet = {
    externalId,
    linked: false,
    requestId: linkSession.requestId || null,
    otpVerified: Boolean(linkSession.verificationToken),
  };

  if (!externalId) {
    merchantWallet.error = "SMARTBANK_POS_SELLER_EXTERNAL_ID belum dikonfigurasi.";
  } else {
    try {
      const linkage = await SmartBankConnector.getLinkageByExternalId(externalId);
      merchantWallet = { externalId, linked: true, walletId: linkage.smartbank_wallet_id };
      delete req.session.smartBankMerchantLink;
    } catch (error) {
      if (error.code !== "USER_NOT_LINKED" && error.code !== "CONNECTOR_NOT_CONFIGURED") {
        merchantWallet.error = error.message;
      }
    }
  }

  return res.render("manager/smartbank-wallet", {
    pageTitle: "Wallet Toko SmartBank",
    merchantWallet,
  });
};

exports.requestSmartBankMerchantOtp = async (req, res) => {
  const externalId = getMerchantExternalId();
  const phone = String(req.body.phone || "").trim();
  if (!externalId || !phone) {
    setFlash(req, { type: "error", message: "ID merchant atau nomor SmartBank belum diisi." });
    return res.redirect("/manager/smartbank-wallet");
  }

  try {
    const result = await SmartBankConnector.requestLinkOtp(phone, `merchant-${req.session.user.id}`);
    req.session.smartBankMerchantLink = { requestId: result.request_id, phone };
    setFlash(req, { type: "success", message: "OTP dikirim ke Inbox SmartBank pemilik toko." });
  } catch (error) {
    setFlash(req, { type: "error", message: error.message || "Gagal meminta OTP SmartBank." });
  }
  return req.session.save(() => res.redirect("/manager/smartbank-wallet"));
};

exports.verifySmartBankMerchantOtp = async (req, res) => {
  const requestId = req.session.smartBankMerchantLink?.requestId;
  const code = String(req.body.code || "").trim();
  if (!requestId || !/^\d{6}$/.test(code)) {
    setFlash(req, { type: "error", message: "Request OTP tidak tersedia atau kode OTP tidak valid." });
    return res.redirect("/manager/smartbank-wallet");
  }

  try {
    const result = await SmartBankConnector.verifyLinkOtp(requestId, code, `merchant-${req.session.user.id}`);
    req.session.smartBankMerchantLink.verificationToken = result.verification_token;
    setFlash(req, { type: "success", message: "OTP valid. Konfirmasi untuk menetapkan wallet penerima toko." });
  } catch (error) {
    setFlash(req, { type: "error", message: error.message || "Verifikasi OTP gagal." });
  }
  return req.session.save(() => res.redirect("/manager/smartbank-wallet"));
};

exports.linkSmartBankMerchantWallet = async (req, res) => {
  const externalId = getMerchantExternalId();
  const verificationToken = req.session.smartBankMerchantLink?.verificationToken;
  if (!externalId || !verificationToken) {
    setFlash(req, { type: "error", message: "Verifikasi OTP terlebih dahulu." });
    return res.redirect("/manager/smartbank-wallet");
  }

  try {
    await SmartBankConnector.linkExternalUser(externalId, verificationToken);
    delete req.session.smartBankMerchantLink;
    setFlash(req, { type: "success", message: "Wallet SmartBank pemilik toko berhasil ditautkan sebagai penerima pembayaran POS." });
  } catch (error) {
    setFlash(req, { type: "error", message: error.message || "Gagal menautkan wallet toko." });
  }
  return req.session.save(() => res.redirect("/manager/smartbank-wallet"));
};

const parseStoredJson = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const buildExternalApiUrl = (integration) => {
  const url = new URL(`${integration.base_url}${integration.path}`);
  const query = parseStoredJson(integration.query_json, {});

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

const testExternalIntegration = async (integration) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const headers = {
    ...parseStoredJson(integration.headers_json, {})
  };
  const options = {
    method: integration.method,
    headers,
    signal: controller.signal
  };
  const bodyPayload = parseStoredJson(integration.body_json, null);

  if (["POST", "PUT", "DELETE"].includes(integration.method) && bodyPayload !== null) {
    if (!Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
      options.headers = {
        ...headers,
        "content-type": "application/json"
      };
    }

    options.body = JSON.stringify(bodyPayload);
  }

  try {
    const startedAt = Date.now();
    const response = await fetch(buildExternalApiUrl(integration), options);
    const responseText = await response.text();
    const durationMs = Date.now() - startedAt;
    const expectedStatus = Number(integration.expected_status || 200);
    const status = response.status === expectedStatus ? "ok" : "failed";

    return {
      status,
      responseCode: response.status,
      responseBody: responseText.slice(0, 5000),
      durationMs,
      message: status === "ok"
        ? `Endpoint merespons sesuai expected status ${expectedStatus}.`
        : `Endpoint merespons ${response.status}, expected ${expectedStatus}.`
    };
  } catch (error) {
    return {
      status: "failed",
      responseCode: null,
      responseBody: error.name === "AbortError" ? "Request timeout setelah 10 detik." : error.message,
      durationMs: null,
      message: error.name === "AbortError" ? "Request timeout setelah 10 detik." : error.message
    };
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeAccess = (handlerSource) => {
  const roleMatch = handlerSource.match(/requireRole\(["']([^"']+)["']\)/);
  if (roleMatch) {
    return roleMatch[1].charAt(0).toUpperCase() + roleMatch[1].slice(1);
  }

  if (handlerSource.includes("requireAuth")) {
    return "Login";
  }

  return "Publik";
};

const inferResponseType = (method, routePath) => {
  if (routePath.endsWith(".json") || routePath.includes("/api") || routePath === "/pos/pembayaran") {
    return "JSON";
  }

  if (routePath.includes("/export/csv")) {
    return "CSV download";
  }

  if (routePath.includes("/export/pdf") || routePath.includes("/download")) {
    return "PDF download";
  }

  return method === "GET" ? "HTML" : "Redirect";
};

const discoverRouteEndpoints = () => {
  if (!fs.existsSync(ROUTES_DIR)) {
    return [];
  }

  return fs.readdirSync(ROUTES_DIR)
    .filter((fileName) => fileName.endsWith(".js"))
    .flatMap((fileName) => {
      const routeSource = fs.readFileSync(path.join(ROUTES_DIR, fileName), "utf8");
      const routeMatches = [...routeSource.matchAll(/router\.(get|post)\(\s*["'`]([^"'`]+)["'`]\s*,([\s\S]*?)\);/g)];

      return routeMatches.map((match) => {
        const method = match[1].toUpperCase();
        const routePath = match[2];
        const handlerSource = match[3];
        const controllerMatches = [...handlerSource.matchAll(/([A-Za-z0-9_]+Controller\.[A-Za-z0-9_]+)/g)];
        const direction = controllerMatches.length > 0
          ? controllerMatches[controllerMatches.length - 1][1]
          : `${fileName} inline handler`;
        const metadata = metadataByEndpoint.get(`${method}:${routePath}`) || {};

        return {
          method,
          path: routePath,
          purpose: metadata.purpose || `Endpoint ${method} ${routePath}. Tambahkan metadata untuk deskripsi lebih detail.`,
          direction: metadata.direction || direction,
          access: metadata.access || normalizeAccess(handlerSource),
          response: metadata.response || inferResponseType(method, routePath),
          sourceFile: fileName,
          autoDiscovered: true
        };
      });
    })
    .sort((left, right) => {
      if (left.path === right.path) {
        return left.method.localeCompare(right.method);
      }
      return left.path.localeCompare(right.path);
    });
};

const getApiGroup = (path) => {
  if (path === "/" || path === "/login" || path === "/register" || path === "/logout") {
    return "Auth";
  }

  const segment = path.split("/").filter(Boolean)[0] || "Root";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
};

const getApiQueryParams = (path) => {
  if (path === "/manager") {
    return [
      { name: "filter", type: "string", required: false, example: "all", description: "Pilihan: today, week, month, all." },
      { name: "recentPage", type: "number", required: false, example: "1", description: "Halaman daftar transaksi terbaru." }
    ];
  }

  if (path === "/manager/export/csv" || path === "/manager/export/pdf") {
    return [
      { name: "filter", type: "string", required: false, example: "month", description: "Pilihan: today, week, month, all." }
    ];
  }

  if (path === "/konsumen") {
    return [
      { name: "search", type: "string", required: false, example: "kopi", description: "Kata kunci nama produk." },
      { name: "kategori", type: "string", required: false, example: "Minuman", description: "Filter kategori produk." },
      { name: "page", type: "number", required: false, example: "1", description: "Halaman katalog produk." }
    ];
  }

  return [];
};

const getApiPathParams = (path) => {
  const matches = path.match(/:([A-Za-z0-9_]+)/g) || [];
  return matches.map((match) => {
    const name = match.slice(1);
    return {
      name,
      type: name === "invoice" ? "string" : "number",
      required: true,
      example: name === "invoice" ? "INV17100000000001234" : "1",
      description: `Nilai path parameter ${name}.`
    };
  });
};

const getApiBodyFields = (method, path) => {
  if (method !== "POST") {
    return [];
  }

  const bodyMap = {
    "/login": [
      { name: "email", type: "string", required: true, example: "manager@warungpos.test", description: "Email akun." },
      { name: "password", type: "string", required: true, example: "admin123", description: "Password akun." }
    ],
    "/register": [
      { name: "nama", type: "string", required: true, example: "Budi", description: "Nama konsumen." },
      { name: "email", type: "string", required: true, example: "budi@test.com", description: "Email konsumen." },
      { name: "password", type: "string", required: true, example: "secret123", description: "Password minimal 6 karakter." },
      { name: "confirmPassword", type: "string", required: true, example: "secret123", description: "Konfirmasi password." }
    ],
    "/operator/products": [
      { name: "nama_produk", type: "string", required: true, example: "Es Teh Manis", description: "Nama produk." },
      { name: "harga", type: "number", required: true, example: "8000", description: "Harga jual." },
      { name: "stock", type: "number", required: true, example: "25", description: "Jumlah stok." },
      { name: "kategori", type: "string", required: true, example: "Minuman", description: "Kategori produk." },
      { name: "gambar", type: "string", required: false, example: "https://example.com/image.jpg", description: "URL gambar produk." }
    ],
    "/operator/products/:id/update": [
      { name: "nama_produk", type: "string", required: true, example: "Es Teh Lemon", description: "Nama produk baru." },
      { name: "harga", type: "number", required: true, example: "10000", description: "Harga jual baru." },
      { name: "stock", type: "number", required: true, example: "30", description: "Stok baru." },
      { name: "kategori", type: "string", required: true, example: "Minuman", description: "Kategori produk." },
      { name: "gambar", type: "string", required: false, example: "https://example.com/image.jpg", description: "URL gambar produk." }
    ],
    "/operator/products/:id/stock": [
      { name: "stock", type: "number", required: true, example: "40", description: "Jumlah stok terbaru." }
    ],
    "/kasir/direct-sale": [
      { name: "product_ids", type: "array", required: true, example: "1,2", description: "ID produk yang dipilih." },
      { name: "qty_{productId}", type: "number", required: true, example: "2", description: "Quantity untuk tiap produk." }
    ],
    "/kasir/pay/:id": [
      { name: "payment_method", type: "string", required: true, example: "qris", description: "Pilihan: cash, qris, transfer, smartbank." }
    ],
    "/pos/pembayaran": [
      { name: "transaction_id", type: "number", required: true, example: "12", description: "ID transaksi berstatus approved." }
    ],
    "/konsumen/profile": [
      { name: "nama", type: "string", required: true, example: "Konsumen Demo", description: "Nama profil." },
      { name: "email", type: "string", required: true, example: "konsumen@warungpos.test", description: "Email profil." },
      { name: "phone", type: "string", required: false, example: "08123456789", description: "Nomor telepon." }
    ],
    "/konsumen/profile/password": [
      { name: "currentPassword", type: "string", required: true, example: "admin123", description: "Password saat ini." },
      { name: "newPassword", type: "string", required: true, example: "secret123", description: "Password baru." },
      { name: "confirmPassword", type: "string", required: true, example: "secret123", description: "Konfirmasi password baru." }
    ],
    "/konsumen/cart/:id/qty": [
      { name: "action", type: "string", required: true, example: "increase", description: "Pilihan: increase atau decrease." },
      { name: "redirect", type: "string", required: false, example: "/konsumen", description: "URL redirect setelah aksi." }
    ],
    "/konsumen/checkout": [
      { name: "redirect", type: "string", required: false, example: "/konsumen", description: "URL redirect jika checkout gagal." }
    ]
  };

  if (path.includes("/approve/") || path === "/kasir/approve/:id" || path === "/kasir/reject/:id" || path === "/operator/products/:id/delete" || path === "/logout" || path === "/konsumen/cart/:id/add" || path === "/konsumen/cart/:id/remove") {
    return [
      { name: "redirect", type: "string", required: false, example: "/konsumen", description: "URL redirect opsional jika dikirim form." }
    ];
  }

  return bodyMap[path] || [];
};

const buildExamplePayload = (fields) => fields.reduce((payload, field) => {
  payload[field.name] = field.example;
  return payload;
}, {});

const getResponseExample = (endpoint) => {
  if (endpoint.path === "/pos/pembayaran") {
    return {
      success: true,
      payment_request_id: "SB-1710000000000-1234",
      status: "success",
      transaction_id: 12,
      message: "Pembayaran SmartBank berhasil."
    };
  }

  if (endpoint.response.includes("PDF")) {
    return "application/pdf download";
  }

  if (endpoint.response.includes("CSV")) {
    return "text/csv download";
  }

  if (endpoint.response.includes("Redirect")) {
    return "302 redirect";
  }

  return "text/html";
};

const buildDocumentedApiEndpoints = () => discoverRouteEndpoints().map((endpoint) => {
  const bodyFields = getApiBodyFields(endpoint.method, endpoint.path);

  return {
    ...endpoint,
    group: getApiGroup(endpoint.path),
    pathParams: getApiPathParams(endpoint.path),
    queryParams: getApiQueryParams(endpoint.path),
    bodyFields,
    examplePayload: buildExamplePayload(bodyFields),
    responseExample: getResponseExample(endpoint),
    specPath: endpoint.path.replace(/:([A-Za-z0-9_]+)/g, "{$1}")
  };
});

const getApiGroups = (endpoints) => [...new Set(endpoints.map((endpoint) => endpoint.group))];

const createOpenApiSpec = () => {
  const documentedApiEndpoints = buildDocumentedApiEndpoints();
  const paths = {};

  documentedApiEndpoints.forEach((endpoint) => {
    const method = endpoint.method.toLowerCase();
    const parameters = [
      ...endpoint.pathParams.map((param) => ({
        name: param.name,
        in: "path",
        required: param.required,
        schema: { type: param.type },
        example: param.example,
        description: param.description
      })),
      ...endpoint.queryParams.map((param) => ({
        name: param.name,
        in: "query",
        required: param.required,
        schema: { type: param.type },
        example: param.example,
        description: param.description
      }))
    ];

    paths[endpoint.specPath] = paths[endpoint.specPath] || {};
    paths[endpoint.specPath][method] = {
      tags: [endpoint.group],
      summary: endpoint.purpose,
      description: `${endpoint.purpose} Arah handler: ${endpoint.direction}. Akses: ${endpoint.access}.`,
      parameters,
      requestBody: endpoint.bodyFields.length > 0 ? {
        required: endpoint.bodyFields.some((field) => field.required),
        content: {
          "application/x-www-form-urlencoded": {
            schema: {
              type: "object",
              properties: endpoint.bodyFields.reduce((properties, field) => {
                properties[field.name] = {
                  type: field.type,
                  description: field.description,
                  example: field.example
                };
                return properties;
              }, {}),
              required: endpoint.bodyFields.filter((field) => field.required).map((field) => field.name)
            },
            example: endpoint.examplePayload
          }
        }
      } : undefined,
      responses: {
        200: {
          description: endpoint.response,
          content: endpoint.response === "JSON" ? {
            "application/json": {
              example: endpoint.responseExample
            }
          } : undefined
        },
        302: endpoint.response.includes("Redirect") ? {
          description: "Redirect setelah aksi berhasil/gagal."
        } : undefined,
        403: {
          description: "Akses ditolak jika role tidak sesuai."
        },
        500: {
          description: "Kesalahan server."
        }
      }
    };
  });

  return {
    openapi: "3.0.0",
    info: {
      title: "WarungPOS API Integrator",
      version: "1.0.0",
      description: "Dokumentasi endpoint aktif WarungPOS yang dibuat dari route Express."
    },
    servers: [
      { url: "http://localhost:3000" }
    ],
    paths
  };
};

const buildHealthCheckPath = (endpointPath) => {
  return endpointPath.replace(/:([A-Za-z0-9_]+)/g, (match, name) => {
    if (name === "invoice") {
      return "DEMO-PAID-001";
    }

    return "1";
  });
};

const getApiHealthStatus = async (endpoint, baseUrl, cookieHeader = "") => {
  if (endpoint.path === "/manager/api-health.json") {
    return {
      status: "ok",
      label: "OK",
      code: "registered",
      message: "Route health check terdaftar. Endpoint ini tidak memanggil dirinya sendiri."
    };
  }

  if (endpoint.method !== "GET") {
    return {
      status: "ok",
      label: "OK",
      code: "registered",
      message: "Route terdaftar. POST tidak dijalankan otomatis agar data tidak berubah."
    };
  }

  try {
    const response = await fetch(`${baseUrl}${buildHealthCheckPath(endpoint.path)}`, {
      method: "GET",
      redirect: "manual",
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        "x-warungpos-health-check": "internal"
      }
    });

    if (response.status >= 500 || response.status === 404) {
      return {
        status: "fail",
        label: "Gagal",
        code: response.status,
        message: `GET mengembalikan status ${response.status}.`
      };
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      return {
        status: "ok",
        label: "OK",
        code: response.status,
        message: "Route merespons redirect."
      };
    }

    if (response.status === 403) {
      return {
        status: "ok",
        label: "OK",
        code: response.status,
        message: "Route aktif dan terlindungi role."
      };
    }

    return {
      status: "ok",
      label: "OK",
      code: response.status,
      message: `Route merespons status ${response.status}.`
    };
  } catch (error) {
    return {
      status: "fail",
      label: "Gagal",
      code: "request_error",
      message: error.message
    };
  }
};

const formatCurrency = (value) => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
}).format(value);

const formatDate = (value) => new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
}).format(new Date(value));

const getDateKey = (value) => {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return String(value).slice(0, 10);
};

const getHourKey = (value) => {
  if (value instanceof Date) {
    return String(value.getHours()).padStart(2, "0");
  }

  return String(value).slice(11, 13);
};

const buildTodayChartDataset = (rows) => {
  const salesMap = new Map(
    rows.map((row) => {
      const hourKey = getHourKey(row.sales_period);
      return [hourKey, Number(row.total_sales)];
    })
  );
  const labels = [];
  const totals = [];

  for (let hour = 0; hour < 24; hour += 1) {
    const hourKey = String(hour).padStart(2, "0");
    labels.push(`${hourKey}:00`);
    totals.push(salesMap.get(hourKey) || 0);
  }

  return { labels, totals };
};

const buildDateRangeChartDataset = (rows, startDate, endDate) => {
  const salesMap = new Map(
    rows.map((row) => [getDateKey(row.sales_period), Number(row.total_sales)])
  );
  const labels = [];
  const totals = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= endDate) {
    const key = cursor.toISOString().slice(0, 10);
    labels.push(
      new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short"
      }).format(cursor)
    );
    totals.push(salesMap.get(key) || 0);
    cursor.setDate(cursor.getDate() + 1);
  }

  return { labels, totals };
};

const buildAllChartDataset = (rows) => {
  const labels = rows.map((row) => new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(getDateKey(row.sales_period))));
  const totals = rows.map((row) => Number(row.total_sales));

  return { labels, totals };
};

const buildChartDataset = (rows, filter) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (filter === "today") {
    return buildTodayChartDataset(rows);
  }

  if (filter === "week") {
    const startDate = new Date(today);
    const day = startDate.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    startDate.setDate(startDate.getDate() - diffToMonday);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    return buildDateRangeChartDataset(rows, startDate, endDate);
  }

  if (filter === "month") {
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return buildDateRangeChartDataset(rows, startDate, endDate);
  }

  return buildAllChartDataset(rows);
};

const getFilterMeta = (filter) => ({
  today: "Hari Ini",
  week: "Minggu Ini",
  month: "Bulan Ini",
  all: "Semua"
}[filter] || "Semua");

const getChartRangeLabel = (filter) => {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (filter === "today") {
    return formatter.format(today);
  }

  if (filter === "week") {
    const startDate = new Date(today);
    const day = startDate.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    startDate.setDate(startDate.getDate() - diffToMonday);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
  }

  if (filter === "month") {
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
  }

  return "Seluruh data transaksi";
};

const getManagerDashboardData = async (filter, recentTransactionPage = 1) => {
  const safePage = Number.isFinite(recentTransactionPage) && recentTransactionPage > 0
    ? Math.floor(recentTransactionPage)
    : 1;
  const offset = (safePage - 1) * RECENT_TRANSACTIONS_PER_PAGE;
  const [kpis, recentTransactions, recentTransactionCount, cashierPerformance, chartRows] = await Promise.all([
    TransactionModel.getManagerKpis(filter),
    TransactionModel.getManagerRecentTransactions(filter, RECENT_TRANSACTIONS_PER_PAGE, offset),
    TransactionModel.countManagerRecentTransactions(filter),
    TransactionModel.getManagerCashierPerformance(filter),
    TransactionModel.getManagerSalesChart(filter)
  ]);

  const chartData = buildChartDataset(chartRows, filter);
  const normalizedTransactions = recentTransactions.map((transaction) => ({
    ...transaction,
    customer_name: transaction.customer_name || transaction.customer_email || "Konsumen",
    cashier_name: transaction.cashier_name || "-",
    payment_method: transaction.payment_method || "-",
    grand_total_formatted: formatCurrency(transaction.grand_total),
    created_at_formatted: formatDate(transaction.created_at)
  }));
  const normalizedCashiers = cashierPerformance.map((cashier) => ({
    ...cashier,
    total_sales_formatted: formatCurrency(cashier.total_sales),
    total_fee_formatted: formatCurrency(cashier.total_fee)
  }));

  return {
    kpis,
    chartData,
    recentTransactions: normalizedTransactions,
    cashierMonitor: normalizedCashiers,
    recentTransactionsPagination: {
      currentPage: safePage,
      perPage: RECENT_TRANSACTIONS_PER_PAGE,
      totalItems: recentTransactionCount,
      totalPages: Math.max(1, Math.ceil(recentTransactionCount / RECENT_TRANSACTIONS_PER_PAGE))
    }
  };
};

exports.exportApiSpec = (req, res) => {
  return res.json(createOpenApiSpec());
};

exports.checkApiHealth = async (req, res) => {
  const apiEndpoints = buildDocumentedApiEndpoints();
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const cookieHeader = req.headers.cookie || "";
  const results = await Promise.all(apiEndpoints.map(async (endpoint) => {
    const health = await getApiHealthStatus(endpoint, baseUrl, cookieHeader);

    return {
      key: `${endpoint.method}:${endpoint.path}`,
      method: endpoint.method,
      path: endpoint.path,
      ...health
    };
  }));

  return res.json({
    checked_at: new Date().toISOString(),
    total: results.length,
    ok: results.filter((result) => result.status === "ok").length,
    fail: results.filter((result) => result.status === "fail").length,
    results
  });
};

exports.apiIntegrator = (req, res) => {
  const apiEndpoints = buildDocumentedApiEndpoints();

  return res.render("manager/api-integrator-home", {
    pageTitle: "API Integrator",
    providers: Object.values(EXTERNAL_API_PROVIDERS),
    localApiSummary: {
      total: apiEndpoints.length,
      get: apiEndpoints.filter((endpoint) => endpoint.method === "GET").length,
      post: apiEndpoints.filter((endpoint) => endpoint.method === "POST").length
    }
  });
};

exports.localApiIntegrator = (req, res) => {
  const apiEndpoints = buildDocumentedApiEndpoints();

  return res.render("manager/api-integrator", {
    pageTitle: "Local API Integrator",
    apiEndpoints,
    apiGroups: getApiGroups(apiEndpoints)
  });
};

exports.providerApiIntegrator = async (req, res) => {
  const provider = EXTERNAL_API_PROVIDERS[req.params.provider];

  if (!provider) {
    return res.status(404).render("errors/404", {
      pageTitle: "Provider Not Found"
    });
  }

  try {
    const integrations = await ApiIntegrationModel.getByProvider(provider.key);

    return res.render("manager/api-provider", {
      pageTitle: `${provider.name} API`,
      provider,
      integrations
    });
  } catch (error) {
    console.error("Provider API Integrator error:", error);
    return res.status(500).render("errors/500", {
      pageTitle: "Server Error"
    });
  }
};

exports.createExternalApiEndpoint = async (req, res) => {
  const provider = EXTERNAL_API_PROVIDERS[req.params.provider];

  if (!provider) {
    return res.status(404).render("errors/404", {
      pageTitle: "Provider Not Found"
    });
  }

  try {
    const payload = normalizeExternalApiInput(provider.key, req.body);
    await ApiIntegrationModel.create(payload);
    setFlash(req, {
      type: "success",
      message: `Endpoint ${provider.name} berhasil disimpan.`
    });
  } catch (error) {
    setFlash(req, {
      type: "error",
      message: error.isValidationError ? error.message : "Gagal menyimpan endpoint eksternal."
    });
  }

  return res.redirect(redirectProvider(provider.key));
};

exports.updateExternalApiEndpoint = async (req, res) => {
  const provider = EXTERNAL_API_PROVIDERS[req.params.provider];
  const endpointId = Number(req.params.id);

  if (!provider || !endpointId) {
    return res.status(404).render("errors/404", {
      pageTitle: "Endpoint Not Found"
    });
  }

  try {
    const payload = normalizeExternalApiInput(provider.key, req.body);
    await ApiIntegrationModel.update(endpointId, payload);
    setFlash(req, {
      type: "success",
      message: `Endpoint ${provider.name} berhasil diperbarui.`
    });
  } catch (error) {
    setFlash(req, {
      type: "error",
      message: error.isValidationError ? error.message : "Gagal memperbarui endpoint eksternal."
    });
  }

  return res.redirect(redirectProvider(provider.key));
};

exports.deleteExternalApiEndpoint = async (req, res) => {
  const provider = EXTERNAL_API_PROVIDERS[req.params.provider];
  const endpointId = Number(req.params.id);

  if (!provider || !endpointId) {
    return res.status(404).render("errors/404", {
      pageTitle: "Endpoint Not Found"
    });
  }

  try {
    await ApiIntegrationModel.delete(endpointId, provider.key);
    setFlash(req, {
      type: "success",
      message: "Endpoint berhasil dihapus."
    });
  } catch (error) {
    setFlash(req, {
      type: "error",
      message: "Gagal menghapus endpoint."
    });
  }

  return res.redirect(redirectProvider(provider.key));
};

exports.activateExternalApiEndpoint = async (req, res) => {
  const provider = EXTERNAL_API_PROVIDERS[req.params.provider];
  const endpointId = Number(req.params.id);

  if (!provider || !endpointId) {
    return res.status(404).render("errors/404", {
      pageTitle: "Endpoint Not Found"
    });
  }

  try {
    const integration = await ApiIntegrationModel.getById(endpointId);

    if (!integration || integration.provider !== provider.key) {
      setFlash(req, {
        type: "error",
        message: "Endpoint tidak ditemukan untuk provider ini."
      });
      return res.redirect(redirectProvider(provider.key));
    }

    if (integration.status !== "ok") {
      setFlash(req, {
        type: "error",
        message: "Endpoint harus dites dan berstatus OK sebelum bisa diaktifkan."
      });
      return res.redirect(redirectProvider(provider.key));
    }

    await ApiIntegrationModel.setActive({ id: endpointId, provider: provider.key });
    setFlash(req, {
      type: "success",
      message: "Endpoint aktif berhasil diperbarui."
    });
  } catch (error) {
    setFlash(req, {
      type: "error",
      message: "Gagal mengaktifkan endpoint."
    });
  }

  return res.redirect(redirectProvider(provider.key));
};

exports.testExternalApiEndpoint = async (req, res) => {
  const provider = EXTERNAL_API_PROVIDERS[req.params.provider];
  const endpointId = Number(req.params.id);

  if (!provider || !endpointId) {
    return res.status(404).json({
      success: false,
      message: "Endpoint tidak ditemukan."
    });
  }

  try {
    const integration = await ApiIntegrationModel.getById(endpointId);

    if (!integration || integration.provider !== provider.key) {
      return res.status(404).json({
        success: false,
        message: "Endpoint tidak ditemukan untuk provider ini."
      });
    }

    const result = await callExternalIntegration(integration);
    await ApiIntegrationModel.updateStatus({
      id: endpointId,
      status: result.status,
      lastResponseCode: result.responseCode,
      lastResponseBody: result.responseBody
    });

    return res.json({
      success: result.status === "ok",
      endpoint_id: endpointId,
      status: result.status,
      response_code: result.responseCode,
      response_body: result.responseBody,
      duration_ms: result.durationMs,
      message: result.message
    });
  } catch (error) {
    console.error("Test external API endpoint error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengetes endpoint eksternal."
    });
  }
};

exports.index = async (req, res) => {
  const filter = ALLOWED_FILTERS.includes(req.query.filter) ? req.query.filter : "all";
  const requestedRecentTransactionPage = Number.parseInt(req.query.recentPage, 10) || 1;

  try {
    const dashboardData = await getManagerDashboardData(filter, requestedRecentTransactionPage);
    const totalPages = dashboardData.recentTransactionsPagination.totalPages;
    const currentPage = Math.min(dashboardData.recentTransactionsPagination.currentPage, totalPages);

    if (currentPage !== dashboardData.recentTransactionsPagination.currentPage) {
      const normalizedData = await getManagerDashboardData(filter, currentPage);

      return res.render("manager/dashboard", {
        pageTitle: "Manager Dashboard",
        filters: [
          { key: "today", label: "Hari Ini" },
          { key: "week", label: "Minggu Ini" },
          { key: "month", label: "Bulan Ini" },
          { key: "all", label: "Semua" }
        ],
        activeFilter: filter,
        summaryCards: [
          {
            title: "Total Penjualan",
            value: formatCurrency(normalizedData.kpis.total_sales || 0),
            description: "Akumulasi transaksi paid",
            accent: "from-blue-500 to-blue-600"
          },
          {
            title: "Total Transaksi",
            value: `${Number(normalizedData.kpis.total_transactions || 0)} transaksi`,
            description: "Jumlah transaksi paid",
            accent: "from-sky-500 to-blue-500"
          },
          {
            title: "Total Fee POS",
            value: formatCurrency(normalizedData.kpis.total_fee || 0),
            description: "Akumulasi fee layanan",
            accent: "from-indigo-500 to-blue-600"
          },
          {
            title: "Rata-rata Transaksi",
            value: formatCurrency(normalizedData.kpis.average_transaction || 0),
            description: "Nilai rata-rata per transaksi",
            accent: "from-blue-700 to-indigo-600"
          }
        ],
        recentTransactions: normalizedData.recentTransactions,
        recentTransactionsPagination: normalizedData.recentTransactionsPagination,
        cashierMonitor: normalizedData.cashierMonitor,
        chartData: normalizedData.chartData,
        chartRangeLabel: getChartRangeLabel(filter),
        todayLabel: new Intl.DateTimeFormat("id-ID", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric"
        }).format(new Date())
      });
    }

    return res.render("manager/dashboard", {
      pageTitle: "Manager Dashboard",
      filters: [
        { key: "today", label: "Hari Ini" },
        { key: "week", label: "Minggu Ini" },
        { key: "month", label: "Bulan Ini" },
        { key: "all", label: "Semua" }
      ],
      activeFilter: filter,
      summaryCards: [
        {
          title: "Total Penjualan",
          value: formatCurrency(dashboardData.kpis.total_sales || 0),
          description: "Akumulasi transaksi paid",
          accent: "from-blue-500 to-blue-600"
        },
        {
          title: "Total Transaksi",
          value: `${Number(dashboardData.kpis.total_transactions || 0)} transaksi`,
          description: "Jumlah transaksi paid",
          accent: "from-sky-500 to-blue-500"
        },
        {
          title: "Total Fee POS",
          value: formatCurrency(dashboardData.kpis.total_fee || 0),
          description: "Akumulasi fee layanan",
          accent: "from-indigo-500 to-blue-600"
        },
        {
          title: "Rata-rata Transaksi",
          value: formatCurrency(dashboardData.kpis.average_transaction || 0),
          description: "Nilai rata-rata per transaksi",
          accent: "from-blue-700 to-indigo-600"
        }
      ],
      recentTransactions: dashboardData.recentTransactions,
      recentTransactionsPagination: dashboardData.recentTransactionsPagination,
      cashierMonitor: dashboardData.cashierMonitor,
      chartData: dashboardData.chartData,
      chartRangeLabel: getChartRangeLabel(filter),
      todayLabel: new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
      }).format(new Date())
    });
  } catch (error) {
    console.error("Manager dashboard error:", error);

    return res.status(500).render("manager/dashboard", {
      pageTitle: "Manager Dashboard",
      filters: [
        { key: "today", label: "Hari Ini" },
        { key: "week", label: "Minggu Ini" },
        { key: "month", label: "Bulan Ini" },
        { key: "all", label: "Semua" }
      ],
      activeFilter: filter,
      summaryCards: [
        {
          title: "Total Penjualan",
          value: formatCurrency(0),
          description: "Akumulasi transaksi paid",
          accent: "from-blue-500 to-blue-600"
        },
        {
          title: "Total Transaksi",
          value: "0 transaksi",
          description: "Jumlah transaksi paid",
          accent: "from-sky-500 to-blue-500"
        },
        {
          title: "Total Fee POS",
          value: formatCurrency(0),
          description: "Akumulasi fee layanan",
          accent: "from-indigo-500 to-blue-600"
        },
        {
          title: "Rata-rata Transaksi",
          value: formatCurrency(0),
          description: "Nilai rata-rata per transaksi",
          accent: "from-blue-700 to-indigo-600"
        }
      ],
      recentTransactions: [],
      recentTransactionsPagination: {
        currentPage: 1,
        perPage: RECENT_TRANSACTIONS_PER_PAGE,
        totalItems: 0,
        totalPages: 1
      },
      cashierMonitor: [],
      chartData: {
        labels: [],
        totals: []
      },
      chartRangeLabel: getChartRangeLabel(filter),
      todayLabel: new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
      }).format(new Date()),
      dashboardError: "Gagal memuat dashboard manager dari database."
    });
  }
};

exports.payments = async (req, res) => {
  try {
    const payments = await PaymentModel.getRecent({ limit: 50, offset: 0 });
    const normalizedPayments = payments.map((payment) => ({
      ...payment,
      invoice: payment.invoice || "-",
      cashier_name: payment.cashier_name || payment.cashier_email || "-",
      amount_formatted: formatCurrency(payment.amount),
      paid_at_formatted: payment.paid_at ? formatDate(payment.paid_at) : "-",
      created_at_formatted: formatDate(payment.created_at),
      reference_label: payment.payment_request_id || payment.provider_reference || "-"
    }));
    const paymentSummary = {
      total: normalizedPayments.length,
      success: normalizedPayments.filter((payment) => payment.status === "success").length,
      failed: normalizedPayments.filter((payment) => payment.status === "failed").length,
      smartbank: normalizedPayments.filter((payment) => payment.provider === "smartbank").length
    };

    return res.render("manager/payments", {
      pageTitle: "Payment Manager",
      payments: normalizedPayments,
      paymentSummary,
      todayLabel: new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
      }).format(new Date())
    });
  } catch (error) {
    console.error("Manager payments error:", error);

    return res.status(500).render("manager/payments", {
      pageTitle: "Payment Manager",
      payments: [],
      paymentSummary: {
        total: 0,
        success: 0,
        failed: 0,
        smartbank: 0
      },
      todayLabel: new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
      }).format(new Date()),
      dashboardError: "Gagal memuat riwayat pembayaran."
    });
  }
};

exports.exportCsv = async (req, res) => {
  const filter = ALLOWED_FILTERS.includes(req.query.filter) ? req.query.filter : "all";

  try {
    const transactions = await TransactionModel.getManagerReportTransactions(filter);
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: "invoice", title: "Invoice" },
        { id: "customer_name", title: "Konsumen" },
        { id: "cashier_name", title: "Kasir" },
        { id: "grand_total", title: "Total" },
        { id: "fee", title: "Fee" },
        { id: "payment_method", title: "Metode Bayar" },
        { id: "status", title: "Status" },
        { id: "created_at_formatted", title: "Tanggal" }
      ]
    });

    const records = transactions.map((transaction) => ({
      invoice: transaction.invoice,
      customer_name: transaction.customer_name || transaction.customer_email || "Konsumen",
      cashier_name: transaction.cashier_name || "-",
      grand_total: Number(transaction.grand_total || 0),
      fee: Number(transaction.fee || 0),
      payment_method: transaction.payment_method || "-",
      status: transaction.status,
      created_at_formatted: formatDate(transaction.created_at)
    }));

    const csvContent = `${csvStringifier.getHeaderString()}${csvStringifier.stringifyRecords(records)}`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="warungpos-manager-${filter}.csv"`);
    return res.send(csvContent);
  } catch (error) {
    console.error("Manager export CSV error:", error);
    return res.status(500).render("errors/500", {
      pageTitle: "Server Error"
    });
  }
};

exports.exportPdf = async (req, res) => {
  const filter = ALLOWED_FILTERS.includes(req.query.filter) ? req.query.filter : "all";

  try {
    const [dashboardData, transactions] = await Promise.all([
      getManagerDashboardData(filter),
      TransactionModel.getManagerReportTransactions(filter)
    ]);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="warungpos-manager-${filter}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).text("WarungPOS Manager Report", { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor("#475569").text(`Filter: ${getFilterMeta(filter)}`);
    doc.text(`Generated: ${new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date())}`);
    doc.fillColor("#111827");
    doc.moveDown();

    const kpiLines = [
      `Total Penjualan: ${formatCurrency(dashboardData.kpis.total_sales || 0)}`,
      `Total Transaksi: ${Number(dashboardData.kpis.total_transactions || 0)} transaksi`,
      `Total Fee POS: ${formatCurrency(dashboardData.kpis.total_fee || 0)}`,
      `Rata-rata Transaksi: ${formatCurrency(dashboardData.kpis.average_transaction || 0)}`
    ];

    kpiLines.forEach((line) => doc.fontSize(11).text(line));
    doc.moveDown();
    doc.fontSize(14).text("Daftar Transaksi");
    doc.moveDown(0.5);

    if (transactions.length === 0) {
      doc.fontSize(11).text("Belum ada transaksi untuk periode ini.");
    } else {
      transactions.forEach((transaction, index) => {
        doc.fontSize(11).text(
          `${index + 1}. ${transaction.invoice} | ${transaction.customer_name || transaction.customer_email || "Konsumen"} | ${transaction.cashier_name || "-"} | ${formatCurrency(transaction.grand_total || 0)} | ${transaction.payment_method || "-"} | ${transaction.status} | ${formatDate(transaction.created_at)}`
        );
        if (doc.y > 760) {
          doc.addPage();
        }
      });
    }

    doc.end();
  } catch (error) {
    console.error("Manager export PDF error:", error);
    return res.status(500).render("errors/500", {
      pageTitle: "Server Error"
    });
  }
};
