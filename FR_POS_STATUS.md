# Status Implementasi FR-POS WarungPOS

Dokumen ini merangkum kesesuaian aplikasi POS terhadap Functional Requirement WarungPOS pada PRD, khususnya **FR-POS-001 sampai FR-POS-007**.

## Ringkasan Status

| FR | Requirement | Status | Bukti / Catatan |
| --- | --- | --- | --- |
| FR-POS-001 | Kasir dapat membuat invoice dari produk dan jumlah. | Sesuai | Ada `POST /kasir/direct-sale`; kasir memilih produk dan quantity, lalu sistem membuat invoice berstatus `pending_payment`. |
| FR-POS-002 | POS menggunakan sumber stok yang sama dengan Marketplace. | Sesuai di konteks project, belum sesuai PRD penuh | POS dan katalog konsumen memakai tabel `products.stock`. Namun PRD mengarah ke Inventory Module formal dengan `on_hand`, `reserved`, dan `available`, yang belum ada. |
| FR-POS-003 | Sistem mendukung pembayaran SmartBank dan pembayaran tunai simulasi. | Sesuai sebagian | Pembayaran lokal `cash`, `qris`, dan `transfer` sudah berjalan dan dicatat di tabel `payments`. Jalur SmartBank di sisi POS sudah siap, tetapi belum dinyatakan sesuai penuh karena belum terhubung ke endpoint SmartBank asli/simulator yang valid. |
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

## Perbaikan Hari Ini

| FR | Area | Perbaikan | Detail Implementasi | Role Terdampak | Status |
| --- | --- | --- | --- | --- | --- |
| FR-POS-001 | Alur invoice kasir | Invoice kasir dibuat sebelum pembayaran. | Kasir memilih produk dan quantity, lalu sistem membuat invoice direct sale dengan status `pending_payment`. Invoice belum memerlukan metode pembayaran di tahap ini. | Kasir | Selesai |
| FR-POS-001 | UI kasir | Dashboard kasir dibuat ulang agar menyerupai alur kasir toko offline. | Halaman transaksi dipisah menjadi `Pilih Produk`, `Invoice Aktif`, dan `Antrian Bayar`. Transaksi masuk dipindahkan ke menu sidebar sendiri. | Kasir | Selesai |
| FR-POS-001 | UI produk | Nama produk ditampilkan jelas dan tidak dipotong. | Kartu produk menampilkan nama lengkap, kategori, stok, harga, serta kontrol tambah/kurang quantity. Jika produk punya `gambar`, gambar dipakai; jika tidak, fallback inisial tetap tersedia. | Kasir | Selesai |
| FR-POS-001 | Konfirmasi invoice | Notifikasi bawaan browser diganti modal custom. | Konfirmasi `Buat Invoice` tidak lagi memakai `window.confirm` bawaan Chrome, tetapi memakai modal yang sesuai UI aplikasi. | Kasir | Selesai |
| FR-POS-003 | Database payment | Payment dipisah dari transaksi. | Ditambahkan tabel `payments` untuk menyimpan `transaction_id`, provider, method, status, amount, payment request ID, response code/body, kasir, dan waktu bayar. | Kasir, Manager, Konsumen | Selesai |
| FR-POS-003 | Model payment | Model khusus payment dibuat. | Ditambahkan `models/paymentModel.js` untuk membuat record payment dan mengambil payment success terbaru per transaksi. | Sistem | Selesai |
| FR-POS-003 | Pembayaran lokal | Cash, QRIS, dan transfer dicatat sebagai payment lokal. | Saat kasir memproses cash/QRIS/transfer, sistem membuat record `payments` dengan provider `local` dan status `success`. | Kasir, Manager | Selesai |
| FR-POS-003 | SmartBank | Jalur POS untuk SmartBank disiapkan, tetapi belum sesuai penuh. | POS sudah bisa mengambil endpoint aktif dari API Integrator dan menyimpan status `success` atau `failed`, `payment_request_id`, endpoint/reference, response code, dan response body. Namun integrasi belum selesai karena endpoint SmartBank asli/simulator valid belum tersambung. | Kasir, Manager | Sesuai sebagian |
| FR-POS-003 | UI manager payment | Riwayat payment dipisah dari dashboard utama. | Ditambahkan halaman `/manager/payments` dengan ringkasan total payment, success, failed, SmartBank, dan tabel detail payment. | Manager | Selesai |
| FR-POS-003 | Sidebar manager | Menu manager dirapihkan. | Sidebar manager sekarang memisahkan `Dashboard`, `Payment`, dan `API Integrator`. Active state sidebar dibuat exact supaya halaman Payment tidak terbaca sebagai Dashboard. | Manager | Selesai |
| FR-POS-004 | Guard status paid | Transaksi tidak bisa menjadi `paid` tanpa payment success. | `TransactionModel.payTransaction()` mengecek keberadaan `payments.status = 'success'` untuk transaksi dan metode pembayaran yang diproses. Jika tidak ada, update ke `paid` ditolak dengan alasan `payment_not_success`. | Sistem | Selesai |
| FR-POS-004 | Struk kasir | Struk kasir menampilkan detail payment. | Struk kasir menampilkan status payment, provider, waktu bayar, request ID/reference, dan response code jika tersedia. | Kasir | Selesai |
| FR-POS-004 | Struk konsumen | Struk konsumen menampilkan detail payment. | Struk konsumen dan PDF receipt ikut membaca payment success terbaru agar pembeli melihat bukti pembayaran yang sama. | Konsumen | Selesai |
| FR-POS-005 | Validasi stok | Stok dicek saat invoice dan saat payment. | Sistem mengecek stok sebelum invoice dibuat dan mengecek ulang stok saat pembayaran. Stok hanya dipotong ketika transaksi berhasil `paid`. | Kasir, Sistem | Sudah sesuai |
| FR-POS-006 | Analisis | Void transaksi belum dibuat. | Kebutuhan berikutnya adalah endpoint/UI void sebelum settlement dan permission supervisor/manager. | Kasir, Manager | Belum ada |
| FR-POS-007 | Analisis | Audit log belum dibuat. | Kebutuhan berikutnya adalah tabel audit log untuk mencatat void, diskon, koreksi, aktor, alasan, data sebelum/sesudah, dan waktu aksi. | Manager, Sistem | Belum ada |

## Validasi Hari Ini

| Validasi | Hasil |
| --- | --- |
| `node --check` controller/model terkait | Lolos |
| Compile EJS view kasir, konsumen, manager | Lolos |
| Render dummy dashboard/payment/receipt | Lolos |
| Migration database lokal | Tabel `payments` berhasil dibuat di database `warungpos` |
| `npm test` | Berjalan, tetapi project masih berisi placeholder `No automated tests configured yet` |

## FR yang Berjalan tetapi Belum 100% Sesuai PRD

| FR | Kekurangan Utama |
| --- | --- |
| FR-POS-002 | Masih memakai `products.stock`, belum Inventory Module shared formal. |
| FR-POS-003 | Pembayaran lokal sudah berjalan, tetapi SmartBank belum terintegrasi penuh dengan endpoint asli/simulator valid. |

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
| Model payment | `models/paymentModel.js` |
| Schema database | `database/migrate_to_current_schema.sql` |
| Dashboard kasir | `views/kasir/dashboard.ejs` |
| Receipt kasir | `views/kasir/receipt.ejs` |
| Receipt konsumen | `views/konsumen/receipt.ejs` |
| Controller konsumen | `controllers/konsumenController.js` |
| Route manager | `routes/managerRoutes.js` |
| Controller manager | `controllers/managerController.js` |
| Dashboard manager | `views/manager/dashboard.ejs` |
| Payment manager | `views/manager/payments.ejs` |
| Sidebar shared | `views/partials/sidebar.ejs` |
