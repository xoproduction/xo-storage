/**
 * XO Enterprise — Local Storage Server
 * 
 * Deploy di VPS/server client. Menerima upload file dari backend xostore.id
 * dan serve file secara publik lewat HTTP.
 * 
 * CARA PAKAI:
 *   1. Copy folder ini ke server client
 *   2. Edit CONFIG di bawah (TOKEN, PORT, dll.)
 *   3. npm install  (atau: npm install express)
 *   4. node server.js  (atau pakai PM2: pm2 start server.js --name xo-storage)
 * 
 * URL yang dimasukkan ke aplikasi:
 *   http://<IP-atau-domain-server>:<PORT>/xo-storage/<TOKEN>
 *   Contoh: http://192.168.1.100:4500/xo-storage/secret123
 *           https://mycompany.com/xo-storage/secret123
 */

"use strict";
const http    = require("http");
const https   = require("https");
const fs      = require("fs");
const path    = require("path");
const express = require("express");

// ── Auto-load .env jika ada (tanpa memerlukan package dotenv) ────────────────
const ENV_FILE = path.join(__dirname, ".env");
if (fs.existsSync(ENV_FILE)) {
  fs.readFileSync(ENV_FILE, "utf8").split("\n").forEach(line => {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  });
}

// ─── KONFIGURASI ────────────────────────────────────────────────────────────
const CONFIG = {
  PORT:        process.env.PORT        || 4500,
  TOKEN:       process.env.TOKEN       || "ganti-token-ini-dengan-string-acak",
  STORAGE_DIR: process.env.STORAGE_DIR || path.join(__dirname, "uploads"),
  BASE_URL:    process.env.BASE_URL    || "",   // kosongkan = auto-detect dari request Host
  MAX_FILE_MB: parseInt(process.env.MAX_FILE_MB || "50", 10),

  // (Opsional) HTTPS — isi path ke sertifikat jika pakai HTTPS tanpa reverse proxy
  TLS_KEY:  process.env.TLS_KEY  || "",
  TLS_CERT: process.env.TLS_CERT || "",
};
// ────────────────────────────────────────────────────────────────────────────

const app = express();
const MAX_BYTES = CONFIG.MAX_FILE_MB * 1024 * 1024;

// Parse JSON body (base64 file upload)
app.use(express.json({ limit: MAX_BYTES + 4096 }));

// ── Logging sederhana ────────────────────────────────────────────────────────
function log(level, msg, extra) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level.toUpperCase()}] ${msg}`;
  if (extra) console.log(line, JSON.stringify(extra));
  else       console.log(line);
}

// ── Pastikan direktori storage ada ──────────────────────────────────────────
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
ensureDir(CONFIG.STORAGE_DIR);

// ── Helper: sanitize nama file ───────────────────────────────────────────────
function sanitizeFilename(name) {
  return String(name || "file").replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 200) || "file";
}

// ── Helper: deteksi ekstensi dari contentType ─────────────────────────────
function extFromContentType(ct) {
  const c = String(ct || "").toLowerCase();
  if (c.includes("pdf"))       return ".pdf";
  if (c.includes("jpeg"))      return ".jpg";
  if (c.includes("jpg"))       return ".jpg";
  if (c.includes("png"))       return ".png";
  if (c.includes("webp"))      return ".webp";
  if (c.includes("gif"))       return ".gif";
  if (c.includes("xlsx") || c.includes("spreadsheetml")) return ".xlsx";
  if (c.includes("zip"))       return ".zip";
  return "";
}

// ── Helper: base URL untuk membentuk URL file yang dikembalikan ──────────────
function getBaseUrl(req) {
  let base = CONFIG.BASE_URL ? CONFIG.BASE_URL.replace(/\/+$/, "") : "";
  if (base && !base.startsWith("http://") && !base.startsWith("https://")) {
    base = "https://" + base; // auto-add scheme jika user lupa
  }
  if (base) return base;
  const proto = req.headers["x-forwarded-proto"] || (req.secure ? "https" : "http");
  return proto + "://" + req.headers.host;
}

// ════════════════════════════════════════════════════════════════════════════
// ENDPOINT: POST /xo-storage/:token/:subfolder?/upload
// Body JSON: { filename, contentType, data: "<base64>" }
// Response:  { url: "https://..." }
// ════════════════════════════════════════════════════════════════════════════
app.post("/xo-storage/:token/:subfolder*/upload", (req, res) => {
  const { token, subfolder } = req.params;

  // Auth check
  if (token !== CONFIG.TOKEN) {
    log("warn", "Unauthorized upload attempt", { token });
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }

  const { filename, contentType, data: base64Data } = req.body || {};

  if (!base64Data) {
    return res.status(400).json({ status: "error", message: "Field 'data' (base64) wajib diisi" });
  }

  // Decode base64
  let fileBuffer;
  try {
    // Support "data:<mime>;base64,..." dan plain base64
    const raw = String(base64Data).replace(/^data:[^;]+;base64,/, "");
    fileBuffer = Buffer.from(raw, "base64");
  } catch (e) {
    return res.status(400).json({ status: "error", message: "Gagal decode base64: " + e.message });
  }

  if (!fileBuffer.length) {
    return res.status(400).json({ status: "error", message: "File kosong" });
  }
  if (fileBuffer.length > MAX_BYTES) {
    return res.status(413).json({ status: "error", message: "File terlalu besar (max " + CONFIG.MAX_FILE_MB + " MB)" });
  }

  // Tentukan nama file akhir
  let safeName = sanitizeFilename(filename);
  // Tambahkan ekstensi jika belum ada
  if (contentType && !path.extname(safeName)) {
    safeName += extFromContentType(contentType);
  }
  // Tambahkan timestamp agar tidak tabrakan
  const baseName = path.basename(safeName, path.extname(safeName));
  const ext      = path.extname(safeName);
  const finalName = baseName + "_" + Date.now() + ext;

  // Tentukan subfolder path
  const subfolderPath = subfolder ? subfolder.replace(/[^a-z0-9_/\-]/gi, "_") : "";
  const destDir  = subfolderPath
    ? path.join(CONFIG.STORAGE_DIR, subfolderPath)
    : CONFIG.STORAGE_DIR;
  ensureDir(destDir);

  const destPath = path.join(destDir, finalName);

  // Tulis file
  try {
    fs.writeFileSync(destPath, fileBuffer);
  } catch (writeErr) {
    log("error", "Gagal tulis file", { path: destPath, error: writeErr.message });
    return res.status(500).json({ status: "error", message: "Gagal menyimpan file: " + writeErr.message });
  }

  // Bentuk URL publik
  const baseUrl = getBaseUrl(req);
  const relPath = subfolderPath
    ? `/xo-storage/${token}/files/${subfolderPath}/${finalName}`
    : `/xo-storage/${token}/files/${finalName}`;
  const fileUrl = baseUrl + relPath;

  log("info", "File uploaded", { name: finalName, subfolder: subfolderPath, size: fileBuffer.length, url: fileUrl });
  return res.json({ status: "success", url: fileUrl, filename: finalName });
});

// ════════════════════════════════════════════════════════════════════════════
// ENDPOINT: GET /xo-storage/:token/files/...path
// Serve file secara publik (URL-nya sudah cukup sebagai "auth")
// ════════════════════════════════════════════════════════════════════════════
app.get("/xo-storage/:token/files/*", (req, res) => {
  const { token } = req.params;
  if (token !== CONFIG.TOKEN) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }

  // Extract path setelah /files/
  const rawPath = req.path.replace(/^\/xo-storage\/[^/]+\/files\//, "");
  // Cegah path traversal
  const safePath = rawPath.replace(/\.\.\//g, "").replace(/\.\./g, "");
  const filePath = path.join(CONFIG.STORAGE_DIR, safePath);

  if (!filePath.startsWith(CONFIG.STORAGE_DIR)) {
    return res.status(403).json({ status: "error", message: "Forbidden" });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ status: "error", message: "File tidak ditemukan" });
  }

  res.sendFile(filePath);
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", server: "xo-storage", uptime: process.uptime() }));

// ── Default 404 ──────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ status: "error", message: "Not found" }));

// ── Start server ─────────────────────────────────────────────────────────────
if (CONFIG.TLS_KEY && CONFIG.TLS_CERT && fs.existsSync(CONFIG.TLS_KEY) && fs.existsSync(CONFIG.TLS_CERT)) {
  const tlsOptions = {
    key:  fs.readFileSync(CONFIG.TLS_KEY),
    cert: fs.readFileSync(CONFIG.TLS_CERT)
  };
  https.createServer(tlsOptions, app).listen(CONFIG.PORT, () => {
    log("info", "XO Storage Server (HTTPS) running", { port: CONFIG.PORT });
  });
} else {
  http.createServer(app).listen(CONFIG.PORT, () => {
    log("info", "XO Storage Server (HTTP) running", { port: CONFIG.PORT, storageDir: CONFIG.STORAGE_DIR });
    log("info", "URL untuk dimasukkan ke aplikasi:", { url: "http://<IP-SERVER>:" + CONFIG.PORT + "/xo-storage/" + CONFIG.TOKEN });
  });
}
