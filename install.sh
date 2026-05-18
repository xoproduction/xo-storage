#!/usr/bin/env bash
# XO Enterprise Storage Server — Installer (Linux / macOS)
# Cara pakai:
#   bash <(curl -fsSL https://raw.githubusercontent.com/xoenterprise/xo-storage/main/install.sh)

set -e

REPO="https://raw.githubusercontent.com/xoenterprise/xo-storage/main"
DIR="$HOME/xo-storage"

echo ""
echo "======================================"
echo "  XO Enterprise Storage Server Setup"
echo "======================================"
echo ""

# ── Cek Node.js ──────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js tidak ditemukan di sistem ini."
  echo ""
  echo "Silakan install Node.js terlebih dahulu:"
  echo "  https://nodejs.org  (pilih LTS)"
  echo ""
  echo "Setelah install, jalankan perintah ini lagi."
  exit 1
fi

NODE_VER=$(node --version)
echo "Node.js ditemukan: $NODE_VER"

# ── Download file ke ~/xo-storage ────────────────────────────────────────────
echo "Membuat folder: $DIR"
mkdir -p "$DIR"
cd "$DIR"

echo "Mengunduh file..."
curl -fsSL "$REPO/server.js"   -o server.js
curl -fsSL "$REPO/setup.js"    -o setup.js
curl -fsSL "$REPO/package.json" -o package.json

# ── npm install ───────────────────────────────────────────────────────────────
echo "Instalasi dependensi (express)..."
npm install --silent
echo ""

# ── Jalankan wizard ───────────────────────────────────────────────────────────
node setup.js
