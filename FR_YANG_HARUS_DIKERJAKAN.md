# Functional Requirements yang Harus Dikerjakan

Dokumen ini berisi daftar Functional Requirements (FR) yang masih perlu dikerjakan pada aplikasi WarungPOS. Daftar ini difokuskan pada pengembangan POS agar lebih mendekati kebutuhan PRD ekosistem UMKM.

## 1. Inventory dan Stok

### FR-INV-001 - Sistem harus memiliki inventory module formal

Sistem harus menyediakan struktur inventory yang tidak hanya memakai kolom `products.stock`, tetapi juga menyimpan:

- `on_hand`
- `reserved`
- `available`

Tujuan:

- Memisahkan stok fisik, stok yang sedang dipesan, dan stok yang benar-benar bisa dijual.
- Menjadi dasar integrasi POS, Marketplace, dan SupplierHub.

### FR-INV-002 - Sistem harus mendukung reservation stok

Saat konsumen melakukan checkout, sistem harus membuat reservation stok.

Kriteria:

- Stok tidak langsung dipotong saat checkout.
- Quantity masuk ke `reserved`.
- Stok `available` berkurang.
- Jika transaksi gagal atau expired, reservation dilepas.

### FR-INV-003 - Sistem harus memiliki expiry reservation

Reservation stok harus memiliki batas waktu.

Kriteria:

- Reservation memiliki waktu kedaluwarsa.
- Jika pembayaran tidak selesai sampai waktu tertentu, reservation otomatis dilepas.
- Transaksi yang expired tidak boleh dibayar lagi.

### FR-INV-004 - Sistem harus mencatat stock movement

Setiap perubahan stok harus dicatat sebagai stock movement.

Jenis movement minimal:

- `sale`
- `reserve`
- `release`
- `adjustment`
- `refund`
- `void`
- `receive`

Kriteria:

- Stock movement tidak boleh dihapus.
- Setiap movement menyimpan alasan, reference transaksi, user yang melakukan aksi, dan waktu kejadian.

### FR-INV-005 - Sistem harus mencegah stok negatif

Sistem harus memastikan stok tidak pernah menjadi negatif.

Kriteria:

- Pengurangan stok harus atomic.
- Direct sale dan pembayaran transaksi harus gagal jika stok tidak cukup.
- Sistem harus aman saat dua transaksi membeli stok terakhir secara bersamaan.

## 2. Payment dan Idempotency

### FR-PAY-001 - Sistem harus menyimpan idempotency key

Setiap pembayaran harus memiliki idempotency key yang disimpan di database.

Tujuan:

- Mencegah double payment akibat double click.
- Mencegah efek ganda saat retry request.

### FR-PAY-002 - Sistem harus menolak idempotency key yang sama dengan payload berbeda

Jika idempotency key sudah pernah digunakan, sistem harus membandingkan payload pembayaran.

Kriteria:

- Jika payload sama, sistem mengembalikan hasil pembayaran yang sama.
- Jika payload berbeda, sistem menolak request dengan error conflict.

### FR-PAY-003 - Sistem harus memiliki payment state machine

Sistem harus memisahkan status transaksi dan status pembayaran.

Status pembayaran minimal:

- `pending`
- `processing`
- `succeeded`
- `failed`
- `voided`
- `refunded`

Kriteria:

- Status hanya boleh berubah melalui transisi yang valid.
- Pembayaran gagal tidak boleh membuat transaksi menjadi `paid`.
- Pembayaran sukses harus membuat transaksi menjadi `paid`.

### FR-PAY-004 - Sistem harus mendukung retry pembayaran yang aman

Jika pembayaran gagal karena timeout atau error sementara, sistem harus bisa retry dengan aman.

Kriteria:

- Retry dengan idempotency key sama tidak membuat pembayaran ganda.
- Retry tidak boleh memotong stok dua kali.
- Retry tidak boleh membuat transaksi berubah status secara tidak valid.

## 3. SmartBank dan Ledger

### FR-FIN-001 - Sistem harus mengintegrasikan pembayaran POS dengan SmartBank secara lebih kuat

Pembayaran SmartBank tidak cukup hanya memanggil endpoint aktif. Sistem harus menyimpan hasil pembayaran secara jelas.

Data minimal:

- payment request ID
- external reference
- status pembayaran
- response code
- response body
- waktu request
- waktu response

### FR-FIN-002 - Sistem harus mendukung ledger double-entry

Setiap transaksi finansial harus dicatat dalam ledger double-entry.

Kriteria:

- Total debit harus sama dengan total credit.
- Ledger yang sudah posted tidak boleh diedit atau dihapus.
- Koreksi hanya boleh dilakukan dengan reversal atau compensating transaction.

### FR-FIN-003 - Sistem harus memiliki account balance

Sistem harus memiliki akun finansial untuk pihak yang terlibat.

Akun minimal:

- customer account
- merchant account
- platform fee account
- cash account
- SmartBank clearing account

### FR-FIN-004 - Sistem harus memiliki reconciliation

Sistem harus bisa mencocokkan:

- transaksi POS
- payment
- ledger
- stok yang dipotong

Kriteria:

- Transaksi `paid` harus punya payment sukses.
- Payment sukses harus punya ledger balanced.
- Transaksi yang gagal tidak boleh punya pemotongan stok final.

## 4. Audit Log

### FR-AUD-001 - Sistem harus mencatat audit log untuk aksi penting

Sistem harus mencatat aktivitas penting yang dilakukan user.

Aksi minimal:

- login berhasil
- login gagal
- approve transaksi
- reject transaksi
- pembayaran transaksi
- direct sale
- void transaksi
- refund transaksi
- update stok
- hapus produk
- update endpoint API Integrator

### FR-AUD-002 - Audit log harus menyimpan metadata aksi

Setiap audit log harus menyimpan:

- user ID
- role user
- action
- entity type
- entity ID
- data sebelum perubahan
- data setelah perubahan
- IP address
- user agent
- waktu kejadian

### FR-AUD-003 - Audit log tidak boleh diubah oleh user biasa

Audit log harus bersifat append-only.

Kriteria:

- User biasa tidak boleh mengedit audit log.
- User biasa tidak boleh menghapus audit log.
- Akses audit log dibatasi untuk manager/admin/auditor.

## 5. Void dan Refund

### FR-VOID-001 - Sistem harus mendukung void transaksi

Kasir atau supervisor harus dapat membatalkan transaksi sebelum settlement.

Kriteria:

- Void hanya boleh dilakukan pada status tertentu.
- Void membutuhkan alasan.
- Void harus dicatat di audit log.
- Void harus mengembalikan stok jika stok sudah terpotong.

### FR-VOID-002 - Void harus membutuhkan permission supervisor atau manager

Tidak semua kasir boleh melakukan void.

Kriteria:

- Kasir biasa tidak boleh void tanpa izin.
- Supervisor atau manager dapat melakukan void.
- Semua percobaan void gagal tetap dicatat di audit log.

### FR-REF-001 - Sistem harus mendukung refund penuh

Sistem harus mendukung pengembalian dana penuh untuk transaksi yang valid.

Kriteria:

- Refund hanya bisa dilakukan untuk transaksi `paid`.
- Refund membuat status refund tercatat.
- Refund harus membuat reversal ledger.
- Refund harus dicatat di audit log.

### FR-REF-002 - Sistem harus mendukung refund parsial

Sistem harus mendukung refund sebagian berdasarkan item atau nominal tertentu.

Kriteria:

- Refund parsial tidak boleh melebihi total transaksi.
- Refund parsial harus menyimpan item atau nominal yang direfund.
- Refund parsial harus memengaruhi ledger dan stok sesuai aturan.

## 6. Tenant, Outlet, dan Permission

### FR-TEN-001 - Sistem harus mendukung tenant atau UMKM

Sistem harus dapat memisahkan data antar UMKM.

Data yang perlu memiliki `tenant_id`:

- users
- products
- transactions
- inventory
- payments
- audit logs

### FR-TEN-002 - Sistem harus mendukung outlet

Sistem harus mendukung beberapa outlet dalam satu tenant.

Kriteria:

- Produk dapat memiliki stok per outlet.
- Kasir ditugaskan ke outlet tertentu.
- Transaksi POS tercatat berdasarkan outlet.
- Laporan dapat difilter berdasarkan outlet.

### FR-PERM-001 - Sistem harus mendukung permission granular

Sistem tidak cukup hanya memakai role.

Permission minimal:

- `transaction.approve`
- `transaction.reject`
- `transaction.pay`
- `transaction.void`
- `transaction.refund`
- `stock.adjust`
- `product.delete`
- `api_endpoint.manage`
- `report.export`

### FR-PERM-002 - Sistem harus menolak akses lintas tenant atau outlet

User tidak boleh mengakses data tenant atau outlet lain tanpa permission.

Kriteria:

- Query data harus tenant-aware.
- Route penting harus memvalidasi tenant dan outlet.
- Percobaan akses tidak sah harus menghasilkan 403 atau 404 sesuai kebijakan.

## 7. SupplierHub dan Restock

### FR-SUP-001 - Sistem harus mendukung supplier order

Owner atau manager dapat membuat order pembelian barang ke supplier.

Data minimal:

- supplier
- item produk
- quantity
- estimasi harga
- status order
- tanggal order

### FR-SUP-002 - Sistem harus mendukung penerimaan barang

Ketika barang datang, sistem harus mencatat goods receipt.

Kriteria:

- Barang yang diterima menambah stok melalui inventory receipt.
- Penerimaan barang harus membuat stock movement `receive`.
- Penerimaan barang harus dicatat di audit log.

### FR-SUP-003 - Sistem harus mendukung partial receipt

Sistem harus bisa menerima barang sebagian.

Kriteria:

- Quantity diterima bisa lebih kecil dari quantity order.
- Sisa quantity tetap tercatat sebagai belum diterima.
- Stok hanya bertambah sesuai quantity yang benar-benar diterima.

## 8. Analytics dan Laporan

### FR-ANA-001 - Sistem harus memiliki analytics read model

Dashboard laporan tidak boleh selalu membaca langsung dari tabel transaksi utama.

Kriteria:

- Sistem memiliki tabel atau model khusus untuk analytics.
- Data analytics dapat diperbarui secara periodik atau melalui event.
- Dashboard menampilkan waktu terakhir data diperbarui.

### FR-ANA-002 - Sistem harus mencatat aktivitas export laporan

Setiap export laporan harus masuk audit log.

Data minimal:

- user ID
- jenis laporan
- filter periode
- format export
- waktu export

## 9. Event dan Outbox

### FR-EVT-001 - Sistem harus memiliki transactional outbox

Setiap event penting harus disimpan di outbox bersama transaksi database.

Event minimal:

- `transaction.created`
- `transaction.approved`
- `transaction.rejected`
- `transaction.paid`
- `transaction.voided`
- `transaction.refunded`
- `stock.reserved`
- `stock.deducted`
- `stock.released`

### FR-EVT-002 - Sistem harus memiliki event consumer idempotent

Consumer event harus aman saat event diproses ulang.

Kriteria:

- Setiap event memiliki event ID unik.
- Event yang sama tidak boleh menghasilkan efek ganda.
- Event yang gagal dapat diproses ulang.

### FR-EVT-003 - Sistem harus mendukung retry dan dead-letter

Event gagal harus bisa dicoba ulang.

Kriteria:

- Event gagal disimpan dengan status failed.
- Jumlah retry tercatat.
- Event yang terus gagal masuk ke dead-letter.

## 10. Gamification

### FR-GAM-001 - Sistem harus mendukung point ledger

Point user tidak boleh hanya disimpan sebagai total.

Kriteria:

- Setiap penambahan point membuat entry ledger.
- Setiap pengurangan point membuat reversal.
- Total point dihitung dari point ledger.

### FR-GAM-002 - Sistem harus memberi reward dari event POS tertentu

Event POS yang dapat memberi reward:

- transaksi pertama berhasil
- target harian POS tercapai
- transaksi selesai

### FR-GAM-003 - Sistem harus membalik point saat refund atau void

Jika transaksi dibatalkan, di-void, atau direfund, point yang terkait harus dibalik.

## 11. Monitoring dan Operasional

### FR-OPS-001 - Sistem harus memiliki health endpoint

Sistem harus menyediakan endpoint health untuk mengecek aplikasi aktif.

### FR-OPS-002 - Sistem harus memiliki readiness endpoint

Readiness endpoint harus memastikan dependency penting siap digunakan.

Dependency minimal:

- database
- session store
- SmartBank endpoint jika aktif

### FR-OPS-003 - Sistem harus memiliki liveness endpoint

Liveness endpoint harus menunjukkan aplikasi masih berjalan dan tidak hang.

### FR-OPS-004 - Sistem harus memiliki request ID

Setiap request harus memiliki request ID agar mudah ditelusuri.

Kriteria:

- Request ID muncul di log.
- Request ID diteruskan ke response header.
- Request ID diteruskan ke external integration jika memungkinkan.

## 12. Testing

### FR-TST-001 - Sistem harus memiliki test untuk pembayaran ganda

Test harus memastikan double click atau retry tidak menghasilkan pembayaran ganda.

### FR-TST-002 - Sistem harus memiliki test untuk stok habis

Test harus memastikan transaksi gagal jika stok tidak cukup.

### FR-TST-003 - Sistem harus memiliki test untuk transaksi paralel

Test harus memastikan hanya satu transaksi berhasil saat dua pembeli membeli stok terakhir secara bersamaan.

### FR-TST-004 - Sistem harus memiliki test untuk SmartBank gagal

Test harus memastikan transaksi tidak menjadi `paid` jika SmartBank gagal.

### FR-TST-005 - Sistem harus memiliki test untuk void dan refund

Test harus memastikan void dan refund:

- mengubah status dengan benar
- mengembalikan atau menyesuaikan stok
- membuat audit log
- tidak membuat ledger tidak seimbang

## Prioritas Implementasi

### Prioritas 1 - Wajib Dikerjakan Lebih Dulu

1. FR-INV-005 - Sistem harus mencegah stok negatif.
2. FR-PAY-001 - Sistem harus menyimpan idempotency key.
3. FR-AUD-001 - Sistem harus mencatat audit log untuk aksi penting.
4. FR-VOID-001 - Sistem harus mendukung void transaksi.

### Prioritas 2 - Penting untuk Mendekati PRD

1. FR-INV-001 - Sistem harus memiliki inventory module formal.
2. FR-INV-004 - Sistem harus mencatat stock movement.
3. FR-PAY-003 - Sistem harus memiliki payment state machine.
4. FR-REF-001 - Sistem harus mendukung refund penuh.
5. FR-TEN-001 - Sistem harus mendukung tenant atau UMKM.
6. FR-TEN-002 - Sistem harus mendukung outlet.

### Prioritas 3 - Pengembangan Lanjutan

1. FR-FIN-002 - Sistem harus mendukung ledger double-entry.
2. FR-EVT-001 - Sistem harus memiliki transactional outbox.
3. FR-ANA-001 - Sistem harus memiliki analytics read model.
4. FR-SUP-001 - Sistem harus mendukung supplier order.
5. FR-GAM-001 - Sistem harus mendukung point ledger.
6. FR-OPS-001 - Sistem harus memiliki health endpoint.
