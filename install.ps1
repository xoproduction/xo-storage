# XO Enterprise Storage Server — Installer (Windows PowerShell)
# Cara pakai (paste ke PowerShell):
#   irm https://raw.githubusercontent.com/xoenterprise/xo-storage/main/install.ps1 | iex

$REPO = "https://raw.githubusercontent.com/xoenterprise/xo-storage/main"
$DIR  = "$env:USERPROFILE\xo-storage"

Write-Host ""
Write-Host "======================================"
Write-Host "  XO Enterprise Storage Server Setup"
Write-Host "======================================"
Write-Host ""

# ── Cek Node.js ──────────────────────────────────────────────────────────────
try {
  $nodeVer = & node --version 2>&1
  Write-Host "Node.js ditemukan: $nodeVer"
} catch {
  Write-Host "ERROR: Node.js tidak ditemukan di sistem ini." -ForegroundColor Red
  Write-Host ""
  Write-Host "Silakan install Node.js terlebih dahulu:"
  Write-Host "  https://nodejs.org  (pilih LTS)"
  Write-Host ""
  Write-Host "Setelah install, jalankan perintah ini lagi."
  exit 1
}

# ── Buat folder dan download file ────────────────────────────────────────────
Write-Host "Membuat folder: $DIR"
New-Item -ItemType Directory -Force -Path $DIR | Out-Null
Set-Location $DIR

Write-Host "Mengunduh file..."
Invoke-WebRequest "$REPO/server.js"   -OutFile "server.js"   -UseBasicParsing
Invoke-WebRequest "$REPO/setup.js"    -OutFile "setup.js"    -UseBasicParsing
Invoke-WebRequest "$REPO/package.json" -OutFile "package.json" -UseBasicParsing

# ── npm install ───────────────────────────────────────────────────────────────
Write-Host "Instalasi dependensi (express)..."
& npm.cmd install --silent
Write-Host ""

# ── Jalankan wizard ───────────────────────────────────────────────────────────
& node setup.js
