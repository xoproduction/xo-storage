/**
 * XO Enterprise Storage Server — Setup Wizard
 * Jalankan sekali: node setup.js
 */
"use strict";
const crypto = require("crypto");
const fs     = require("fs");
const path   = require("path");
const readline = require("readline");

const ENV_FILE = path.join(__dirname, ".env");

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  console.log("\n========================================");
  console.log("  XO Enterprise Storage Server Setup");
  console.log("========================================\n");

  // Jika .env sudah ada, tanya apakah mau overwrite
  if (fs.existsSync(ENV_FILE)) {
    const rl0 = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ow = await ask(rl0, ".env sudah ada. Timpa? (y/N): ");
    rl0.close();
    if (!ow.trim().toLowerCase().startsWith("y")) {
      console.log("\nSetup dibatalkan. File .env tidak diubah.");
      printExistingEnv();
      return;
    }
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // PORT
  const portInput = await ask(rl, "Port server (tekan Enter untuk default 4500): ");
  const port = parseInt(portInput.trim(), 10) || 4500;

  // IP/domain
  const hostInput = await ask(rl, "IP publik atau domain server ini (contoh: 192.168.1.100 atau mycompany.com): ");
  const host = hostInput.trim() || "localhost";

  // Storage dir
  const dirInput = await ask(rl, "Folder penyimpanan file (Enter = ./uploads): ");
  const storageDir = dirInput.trim() || "./uploads";

  rl.close();

  // Generate token otomatis
  const token = crypto.randomBytes(24).toString("hex");

  // Tulis .env
  const envContent = [
    `PORT=${port}`,
    `TOKEN=${token}`,
    `STORAGE_DIR=${storageDir}`,
    `BASE_URL=http://${host}:${port}`,
    `MAX_FILE_MB=50`,
    `TLS_KEY=`,
    `TLS_CERT=`,
  ].join("\n") + "\n";

  fs.writeFileSync(ENV_FILE, envContent, "utf8");

  // Buat folder storage jika belum ada
  const absDirInput = storageDir.startsWith(".") ? path.join(__dirname, storageDir.replace(/^\.\//, "")) : storageDir;
  if (!fs.existsSync(absDirInput)) {
    fs.mkdirSync(absDirInput, { recursive: true });
    console.log(`\nFolder '${absDirInput}' dibuat.`);
  }

  const url = `http://${host}:${port}/xo-storage/${token}`;

  console.log("\n========================================");
  console.log("  Setup selesai!");
  console.log("========================================");
  console.log("\nJalankan server:");
  console.log("  node server.js");
  console.log("\nAtau dengan PM2 (auto-restart):");
  console.log("  pm2 start server.js --name xo-storage && pm2 save");
  console.log("\n--- URL untuk dimasukkan ke aplikasi XO Enterprise ---");
  console.log("\n  " + url + "\n");
  console.log("Simpan URL ini. Token tidak bisa dipulihkan jika .env dihapus.");
  console.log("========================================\n");
}

function printExistingEnv() {
  try {
    const lines = fs.readFileSync(ENV_FILE, "utf8").split("\n");
    const tokenLine = lines.find(l => l.startsWith("TOKEN="));
    const portLine  = lines.find(l => l.startsWith("PORT="));
    const baseLine  = lines.find(l => l.startsWith("BASE_URL="));
    if (tokenLine && portLine) {
      const token   = tokenLine.split("=")[1] || "";
      const baseUrl = baseLine ? baseLine.split("=").slice(1).join("=") : "";
      const port    = portLine.split("=")[1] || "4500";
      const url = baseUrl
        ? `${baseUrl}/xo-storage/${token}`
        : `http://localhost:${port}/xo-storage/${token}`;
      console.log("\nURL aktif saat ini:");
      console.log("  " + url + "\n");
    }
  } catch (_) {}
}

main().catch(e => { console.error("Setup error:", e.message); process.exit(1); });
