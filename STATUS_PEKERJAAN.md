# Status Pekerjaan WarungPOS

Dokumen ini merangkum pekerjaan yang sudah dikerjakan dan yang belum dikerjakan pada aplikasi WarungPOS berdasarkan kondisi implementasi saat ini dan perbandingan dengan PRD ekosistem UMKM.

## Yang Sudah Dikerjakan

1. **Auth dan role dasar**
   - Login user.
   - Register user.
   - Logout user.
   - Session login.
   - Pembatasan akses berdasarkan role `manager`, `operator`, `kasir`, dan `konsumen`.

2. **Manajemen produk dan stok dasar**
   - Operator dapat menambah produk.
   - Operator dapat mengedit produk.
   - Operator dapat menghapus produk.
   - Operator dapat memperbarui stok produk.
   - Produk memiliki nama, harga, stok, kategori, dan gambar.

3. **Katalog konsumen**
   - Konsumen dapat melihat katalog produk.
   - Konsumen dapat mencari produk.
   - Konsumen dapat melakukan filter berdasarkan kategori.
   - Konsumen dapat menambahkan produk ke cart.
   - Konsumen dapat mengubah quantity cart.
   - Konsumen dapat menghapus item dari cart.

4. **Checkout konsumen**
   - Konsumen dapat checkout dari cart.
   - Sistem membuat invoice transaksi.
   - Transaksi checkout konsumen dibuat dengan status `pending`.
   - Item transaksi tersimpan ke database.

5. **Approval transaksi oleh kasir**
   - Kasir dapat melihat transaksi masuk.
   - Kasir dapat melihat detail transaksi.
   - Kasir dapat melakukan approve transaksi.
   - Kasir dapat melakukan reject transaksi.

6. **Pembayaran transaksi**
   - Kasir dapat memproses pembayaran transaksi yang sudah berstatus `approved`.
   - Setelah pembayaran berhasil, status transaksi berubah menjadi `paid`.

7. **Metode pembayaran dasar**
   - Sistem mendukung metode pembayaran `cash`.
   - Sistem mendukung metode pembayaran `qris`.
   - Sistem mendukung metode pembayaran `transfer`.
   - Sistem mendukung metode pembayaran `smartbank`.

8. **Direct sale kasir**
   - Kasir dapat membuat transaksi langsung dari dashboard kasir.
   - Kasir dapat memilih produk dan quantity.
   - Transaksi direct sale langsung dibuat dengan status `paid`.
   - Direct sale tidak harus melalui checkout konsumen.

9. **Pengurangan stok otomatis**
   - Stok produk dicek sebelum transaksi diproses.
   - Stok produk berkurang saat transaksi berhasil menjadi `paid`.
   - POS dan katalog konsumen memakai sumber stok yang sama dari tabel `products`.

10. **Struk atau receipt**
    - Kasir dapat melihat struk transaksi.
    - Konsumen dapat melihat struk transaksi.
    - Konsumen dapat mengunduh receipt dalam format PDF.

11. **Dashboard manager**
    - Manager dapat melihat KPI penjualan.
    - Manager dapat melihat grafik penjualan.
    - Manager dapat melihat transaksi terbaru.
    - Manager dapat melihat performa kasir.
    - Manager dapat export laporan CSV.
    - Manager dapat export laporan PDF.

12. **API Integrator dasar**
    - Manager dapat melihat endpoint lokal.
    - Manager dapat mengelola endpoint eksternal.
    - Manager dapat mengetes endpoint eksternal.
    - Manager dapat mengaktifkan endpoint eksternal.

13. **Integrasi SmartBank dasar**
    - Pembayaran SmartBank dapat memakai endpoint aktif dari API Integrator.
    - Sistem membuat payload pembayaran SmartBank.
    - Sistem memproses hasil sukses atau gagal dari endpoint SmartBank.

14. **Keamanan dasar**
    - Middleware Helmet sudah digunakan.
    - Rate limit sudah digunakan.
    - Sanitasi input sudah digunakan.
    - Session timeout sudah digunakan.
    - Halaman error 403, 404, dan 500 sudah tersedia.

## Yang Belum Dikerjakan

1. **Inventory module formal**
   - Belum ada pemisahan stok `on_hand`, `reserved`, dan `available`.
   - Belum ada reservation stok.
   - Belum ada expiry reservation.
   - Belum ada stock movement immutable.

2. **Pencegahan overselling yang kuat**
   - Validasi stok sudah ada, tetapi belum sepenuhnya aman untuk transaksi paralel.
   - Belum ada atomic stock update seperti pengurangan stok dengan kondisi `stock >= qty`.
   - Belum ada pengujian untuk pembelian stok terakhir secara bersamaan.

3. **Audit log**
   - Belum ada audit untuk approve transaksi.
   - Belum ada audit untuk reject transaksi.
   - Belum ada audit untuk pembayaran.
   - Belum ada audit untuk direct sale.
   - Belum ada audit untuk update stok.
   - Belum ada audit untuk hapus produk.
   - Belum ada audit untuk perubahan endpoint API.

4. **Void transaksi**
   - Belum ada fitur void transaksi.
   - Belum ada pembatalan transaksi sebelum settlement.
   - Belum ada alasan void.
   - Belum ada permission supervisor atau manager untuk void.
   - Belum ada restore stok dari transaksi yang di-void.

5. **Refund**
   - Belum ada refund penuh.
   - Belum ada refund parsial.
   - Belum ada reversal stok untuk refund.
   - Belum ada pencatatan status refund.

6. **Idempotency payment**
   - Belum ada penyimpanan idempotency key di database POS.
   - Belum ada proteksi agar double click atau retry tidak menghasilkan efek pembayaran ganda.
   - Idempotency key baru dikirim ke SmartBank, tetapi belum dikelola penuh oleh POS.

7. **Payment state machine lengkap**
   - Status transaksi masih sederhana: `pending`, `approved`, `paid`, dan `rejected`.
   - Belum ada status seperti `pending_payment`, `processing`, `succeeded`, `failed`, `voided`, atau `refunded`.
   - Belum ada validasi transisi status yang lengkap.

8. **SmartBank ledger**
   - SmartBank baru dipanggil sebagai endpoint pembayaran.
   - Belum ada double-entry ledger.
   - Belum ada account balance.
   - Belum ada reconciliation order-payment-ledger.
   - Belum ada refund atau reversal melalui ledger.

9. **Tenant dan outlet**
   - Belum ada `tenant_id`.
   - Belum ada `outlet_id`.
   - Belum ada assignment kasir ke outlet.
   - Belum ada pemisahan produk per outlet.
   - Belum ada pemisahan transaksi per UMKM atau tenant.

10. **Permission detail**
    - Saat ini sistem hanya menggunakan role dasar.
    - Belum ada permission granular untuk void.
    - Belum ada permission granular untuk refund.
    - Belum ada permission granular untuk koreksi transaksi.
    - Belum ada permission supervisor.

11. **Riwayat pergerakan stok**
    - Belum ada catatan stok masuk.
    - Belum ada catatan stok keluar.
    - Belum ada catatan adjustment stok.
    - Belum ada catatan stok karena void.
    - Belum ada catatan stok karena refund.
    - Belum ada catatan stok karena restock.

12. **SupplierHub**
    - Belum ada supplier order.
    - Belum ada proses restock dari supplier.
    - Belum ada penerimaan barang.
    - Belum ada partial receipt.
    - Belum ada integrasi restock ke inventory atau stok POS.

13. **LogistiKita**
    - Belum ada shipment request.
    - Belum ada tracking pengiriman.
    - Belum ada tarif logistik.
    - Belum ada proof of delivery.

14. **Analytics read model**
    - Dashboard manager masih membaca langsung dari data transaksi utama.
    - Belum ada read model khusus analytics.
    - Belum ada informasi `last_updated_at` untuk data analytics.

15. **Gamification**
    - Belum ada point.
    - Belum ada badge.
    - Belum ada mission.
    - Belum ada reward.
    - Belum ada event target harian POS.
    - Belum ada reversal point jika transaksi dibatalkan atau direfund.

16. **Event dan outbox**
    - Belum ada transactional outbox.
    - Belum ada event processing.
    - Belum ada retry event.
    - Belum ada replay event.
    - Belum ada dead-letter handling.
    - Belum ada consumer idempotent.

17. **Monitoring production**
    - Belum ada health endpoint lengkap.
    - Belum ada readiness endpoint.
    - Belum ada liveness endpoint.
    - Belum ada request ID.
    - Belum ada structured log.
    - Belum ada monitoring operasional.

18. **Testing lengkap**
    - Belum ada test untuk double payment.
    - Belum ada test untuk stok habis.
    - Belum ada test untuk transaksi paralel.
    - Belum ada test untuk SmartBank gagal.
    - Belum ada test untuk void.
    - Belum ada test untuk refund.
    - Belum ada test untuk audit log.

## Urutan Pekerjaan yang Disarankan

1. Pencegahan overselling yang kuat.
2. Audit log.
3. Idempotency payment.
4. Void transaksi.
5. Inventory module formal.
6. Refund.
7. Tenant dan outlet.
8. SmartBank ledger.
9. Event dan outbox.
10. Analytics read model.

## Catatan

Aplikasi saat ini sudah cukup untuk kebutuhan demo POS dasar karena fitur login, role, produk, checkout, kasir, pembayaran, pemotongan stok, struk, laporan manager, API Integrator, dan SmartBank dasar sudah tersedia.

Namun, aplikasi belum sepenuhnya memenuhi PRD ekosistem UMKM karena bagian seperti inventory formal, audit, idempotency, ledger, tenant, permission granular, event processing, SupplierHub, LogistiKita, analytics read model, dan gamification belum tersedia.
