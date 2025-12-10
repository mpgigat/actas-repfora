const fs = require('fs');
const path = require('path');

const TTL = parseInt(process.env.FILE_TTL_MS, 10) || 864000000; // borrar despues de 24 horas

function scheduleDeletion(targetPath, onDelete) {
  setTimeout(() => {
    fs.rm(targetPath, { recursive: true, force: true }, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Error al eliminar archivo temporal:', targetPath, err);
      }
      if (typeof onDelete === 'function') onDelete();
    });
  }, TTL);
}

function purgeOldFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const now = Date.now();
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    let stats;
    try {
      stats = fs.statSync(full);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      purgeOldFiles(full);
      if (now - stats.mtimeMs > TTL) {
        try { fs.rmSync(full, { recursive: true, force: true }); } catch {}
      } else {
        try {
          if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
        } catch {}
      }
    } else if (now - stats.mtimeMs > TTL) {
      try { fs.unlinkSync(full); } catch {}
    }
  }
}

function runStartupPurge() {
  purgeOldFiles(path.resolve('uploads'));
  purgeOldFiles(path.resolve('transcripciones'));
  purgeOldFiles(path.resolve('actas_gemini/versiones'));
}

module.exports = { scheduleDeletion, runStartupPurge, TTL };