# XO Enterprise Storage Server

Server penyimpanan file lokal untuk aplikasi XO Enterprise.  
Digunakan sebagai alternatif Google Drive — file tersimpan di server/komputer Anda sendiri.

---

## Install & Setup (satu perintah)

Pilih sesuai sistem operasi Anda:

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/xoproduction/xo-storage/main/install.ps1 | iex
```

> Buka **PowerShell** (bukan CMD), paste perintah di atas, tekan Enter.

### Linux / macOS (Terminal)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/xoproduction/xo-storage/main/install.sh)
```

---

## Yang terjadi setelah menjalankan perintah di atas

1. Node.js dicek — jika belum ada, installer menampilkan link download
2. File diunduh ke folder `xo-storage` di home directory Anda
3. Dependensi di-install otomatis (`npm install`)
4. Wizard setup berjalan — tanya port, IP server, folder simpan file
5. **URL siap pakai muncul di terminal** — copy dan paste ke aplikasi XO Enterprise

Contoh output akhir:
```
  http://192.168.1.100:4500/xo-storage/a3f8c2e1b94d7f0a2c5e8b1d4f7a0c3e6b9d2f5a
```

---

## Prasyarat

- **Node.js** versi 16 atau lebih baru: https://nodejs.org (pilih LTS)
- Port yang dipilih bisa diakses dari internet (jika VPS: cek firewall/security group)

---

## Jalankan server setelah setup

```bash
# Masuk ke folder
cd ~/xo-storage          # Linux/Mac
cd $env:USERPROFILE\xo-storage   # Windows PowerShell

# Jalankan
node server.js
```

**Agar otomatis hidup saat server reboot (Linux VPS):**
```bash
npm install -g pm2
pm2 start server.js --name xo-storage
pm2 save
pm2 startup   # ikuti instruksi yang muncul
```

---

## Lupa URL?

```bash
cd ~/xo-storage
node setup.js   # pilih N saat ditanya overwrite → URL ditampilkan ulang
```

---

## Kembali ke Google Drive

Di aplikasi XO Enterprise: **Pengaturan → Storage / Folder** → ganti dengan URL folder Google Drive Anda.
