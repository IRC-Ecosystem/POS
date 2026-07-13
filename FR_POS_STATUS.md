# Status Implementasi FR-POS WarungPOS

Dokumen ini merangkum kesesuaian aplikasi POS terhadap Functional Requirement WarungPOS pada PRD, khususnya **FR-POS-001 sampai FR-POS-007**.

## Ringkasan Status

| FR | Requirement | Status | Bukti / Catatan |
| --- | --- | --- | --- |
| FR-POS-001 | Kasir dapat membuat invoice dari produk dan jumlah. | Sesuai | Ada `POST /kasir/direct-sale`; kasir memilih produk dan quantity, lalu sistem membuat invoice berstatus `pending_payment`. |
| FR-POS-002 | POS menggunakan sumber stok yang sama dengan Marketplace. | Sesuai di konteks project, belum sesuai PRD penuh | POS dan katalog konsumen memakai tabel `products.stock`. Namun PRD mengarah ke Inventory Module formal dengan `on_hand`, `reserved`, dan `available`, yang belum ada. |
| FR-POS-003 | Sistem mendukung pembayaran SmartBank dan pembayaran tunai simulasi. | Sesuai sebagian | Ada metode `cash`, `qris`, `transfer`, dan `smartbank`. SmartBank diproses melalui API Integrator aktif. |
| FR-POS-004 | Invoice digital hanya `PAID` jika payment sukses. | Sesuai | Order konsumen berjalan `pending -> approved -> paid`, sedangkan direct sale kasir berjalan `pending_payment -> paid` setelah pembayaran diproses. |
| FR-POS-005 | Sistem harus mencegah penjualan melebihi stock available. | Sesuai | Sistem mengecek stok sebelum transaksi/payment. Jika stok kurang, transaksi ditolak dengan alasan `insufficient_stock`. |
| FR-POS-006 | Sistem mendukung void sebelum settlement dengan permission supervisor. | Belum ada | Belum ada route/controller/model untuk void transaksi dan belum ada role/permission supervisor. |
| FR-POS-007 | Semua void, diskon, dan koreksi harus diaudit. | Belum ada | Belum ada audit log khusus untuk void, diskon, atau koreksi. Fitur diskon juga belum terlihat sebagai fitur POS. |

## FR yang Sudah Paling Sesuai

| FR | Alasan |
| --- | --- |
| FR-POS-001 | Kasir dapat membuat invoice direct sale dari produk dan quantity tanpa langsung menandai transaksi sebagai `paid`. |
| FR-POS-004 | Status `paid` baru diberikan setelah proses pembayaran berhasil. |
| FR-POS-005 | Validasi stok sudah dilakukan sebelum transaksi/payment dan stok dipotong saat transaksi `paid`. |

## FR yang Berjalan tetapi Belum 100% Sesuai PRD

| FR | Kekurangan Utama |
| --- | --- |
| FR-POS-002 | Masih memakai `products.stock`, belum Inventory Module shared formal. |
| FR-POS-003 | SmartBank sudah ada, tetapi payment/ledger PRD penuh belum diterapkan. |

## FR yang Belum Ada

| FR | Yang Perlu Dibuat |
| --- | --- |
| FR-POS-006 | Endpoint dan UI void, role/permission supervisor, validasi status sebelum settlement. |
| FR-POS-007 | Tabel audit log dan pencatatan aksi untuk void, diskon, koreksi, dan perubahan penting. |

## Referensi File Implementasi

| Area | File |
| --- | --- |
| Route kasir | `routes/kasirRoutes.js` |
| Controller kasir | `controllers/kasirController.js` |
| Model transaksi | `models/transactionModel.js` |
| Schema database | `database/migrate_to_current_schema.sql` |
| Dashboard kasir | `views/kasir/dashboard.ejs` |
| Receipt kasir | `views/kasir/receipt.ejs` |
