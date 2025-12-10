const fs = require('fs');
const path = require('path');

const STORAGE_PATH = path.resolve(__dirname, 'archivosGenerados.json');

let cache = {};

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf8'));
    // Normaliza formato antiguo {id:{txt,md,docx}} a nuevo {id:{rutas:{}, meta:{}}}
    cache = Object.fromEntries(
      Object.entries(raw).map(([id, value]) =>
        value && value.rutas ? [id, value] : [id, { rutas: value, meta: {} }]
      )
    );
  } catch {
    cache = {};
  }
  // Elimina las entradas cuyos archivos ya no existen
  const base = path.resolve(__dirname, '..', '..');
  for (const [id, entry] of Object.entries(cache)) {
    const rutas = entry.rutas || {};
    const primera = Object.values(rutas).find(Boolean);
    if (!primera) continue;
    const absoluta = path.resolve(base, primera);
    if (!fs.existsSync(absoluta)) {
      delete cache[id];
    }
  }
  save();
}

function save() {
  fs.writeFileSync(STORAGE_PATH, JSON.stringify(cache, null, 2));
}

function get(id) {
  return cache[id] && cache[id].rutas;
}

function set(id, rutas, meta = {}) {
  cache[id] = { rutas, meta };
  save();
}

function list() {
  return Object.entries(cache).map(([id, value]) => {
    const rutas = value && value.rutas;
    const meta = (value && value.meta) || {};
    return {
      id,
      rutas,
      nombre: meta.nombre || id,
      fecha: meta.fecha,
    };
  });
}

function remove(id) {
  delete cache[id];
  save();
}

load();

module.exports = {
  load,
  get,
  set,
  list,
  delete: remove,
};