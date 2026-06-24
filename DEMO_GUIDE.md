# Panduan Demo WarungPOS

## 1. Persiapan

Pastikan MySQL/XAMPP sudah menyala, lalu jalankan:

```bash
npm install
npm run setup:db
npm start
```

Aplikasi berjalan di:

```txt
http://localhost:3000
```

## 2. Akun Demo

Password semua akun:

```txt
admin123
```

| Role | Email |
| --- | --- |
| Manager | `manager@warungpos.test` |
| Operator | `operator@warungpos.test` |
| Kasir | `kasir@warungpos.test` |
| Konsumen | `konsumen@warungpos.test` |

## 3. Alur Demo Utama

1. Login sebagai Manager.
2. Buka dashboard untuk melihat KPI, grafik, performa kasir, dan export laporan.
3. Buka `API Integrator`.
4. Tunjukkan halaman `Endpoint POS` untuk dokumentasi API lokal otomatis.
5. Buka `SmartBank`.
6. Tunjukkan endpoint `SmartBank Create Payment Request`.
7. Jelaskan bahwa endpoint bisa ditambah oleh user, dites, lalu diaktifkan jika statusnya `OK`.
8. Login sebagai Konsumen, buat checkout dari katalog.
9. Login sebagai Kasir, approve transaksi.
10. Pilih pembayaran `SmartBank`.

## 4. Konfigurasi SmartBank

Isi `.env` POS jika SmartBank Gateway sudah berjalan:

```env
SMARTBANK_BASE_URL=http://localhost:4000
SMARTBANK_TOKEN=token_dari_smartbank
SMARTBANK_PAYER_WALLET_ID=wallet_pembayar
SMARTBANK_PAYEE_WALLET_ID=wallet_penerima_pos
```

Endpoint template yang sudah masuk ke API Integrator:

```txt
POST http://localhost:4000/api/bank/payment-requests
```

Headers:

```json
{
  "Authorization": "Bearer {{token}}",
  "Idempotency-Key": "{{idempotency_key}}"
}
```

Body:

```json
{
  "source_app": "POS",
  "payer_wallet_id": "{{payer_wallet_id}}",
  "payee_wallet_id": "{{payee_wallet_id}}",
  "gross_amount": "{{grand_total}}",
  "description": "Pembayaran POS {{invoice}}",
  "metadata": {
    "invoice": "{{invoice}}",
    "transaction_id": "{{transaction_id}}"
  },
  "expires_at": "{{expires_at}}"
}
```

## 5. Catatan Demo

- Jika SmartBank Gateway belum berjalan di port `4000`, test endpoint SmartBank akan `failed` dengan pesan koneksi gagal.
- Endpoint eksternal hanya bisa diaktifkan setelah status test `OK`.
- Jika belum ada endpoint SmartBank aktif, pembayaran SmartBank di Kasir akan ditolak dengan pesan yang jelas.
- Endpoint lokal POS tetap bisa dilihat tanpa SmartBank karena dibaca otomatis dari route aplikasi.
