const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const archiver = require('archiver');
const { randomUUID } = require('crypto');
const { scheduleDeletion, runStartupPurge, TTL } = require('./tempFileManager');

try { require('dotenv').config(); } catch {}

const { transcribirUnSoloArchivo } = require('../js/transcribir');

const API_BASE_PATH = process.env.API_BASE_PATH || '/api';
const app = express();
fs.mkdirSync('uploads', { recursive: true });
runStartupPurge();
setInterval(runStartupPurge, TTL);
const upload = multer({ dest: 'uploads/' });

console.log('🔍 __dirname:', __dirname);
console.log('🔍 process.cwd():', process.cwd());

const publicDir = path.join(__dirname, '..', '..', 'public');
console.log('📁 Directorio public:', publicDir);
console.log('📁 ¿Existe el directorio?', fs.existsSync(publicDir));
if (fs.existsSync(publicDir)) {
  console.log('📄 Archivos en public:', fs.readdirSync(publicDir));
  console.log('📄 Contenido de styles.css:', fs.readFileSync(path.join(publicDir, 'styles.css'), 'utf8').substring(0, 100));
}

const indexPath = path.join(publicDir, 'index.html');
const indexHtml = fs
  .readFileSync(indexPath, 'utf8')
  .replace('%API_BASE_PATH%', JSON.stringify(API_BASE_PATH));

// Deshabilitar caché COMPLETAMENTE
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// Servir index.html con la variable API_BASE_PATH inyectada (ANTES de static)
app.get('/', (req, res) => {
  console.log('✅ Sirviendo index.html personalizado');
  res.setHeader('Content-Type', 'text/html');
  res.send(indexHtml);
});

// Servir archivos estáticos de la carpeta public (CSS, JS, etc.)
app.use((req, res, next) => {
  console.log(`🔄 Middleware static - Intentando servir: ${req.url}`);
  next();
});
app.use(express.static(publicDir));
app.use((req, res, next) => {
  console.log(`⚠️  Archivo no encontrado en static: ${req.url}`);
  next();
});

// Conexiones SSE activas
const conexiones = new Map();
// Archivos generados por ID con persistencia en disco
const archivosGenerados = require('./archivosStore');
archivosGenerados.load();

// Router de la API
const router = express.Router();

// Endpoint SSE para escuchar el progreso de la transcripción
router.get('/progreso/:id', (req, res) => {
  const { id } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();
  conexiones.set(id, res);
  req.on('close', () => conexiones.delete(id));
});

router.post('/transcribir', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    const id = randomUUID();
    const rutasDescarga = {
      txt: `${API_BASE_PATH}/descargar?id=${id}&tipo=txt`,
      md: `${API_BASE_PATH}/descargar?id=${id}&tipo=md`,
      docx: `${API_BASE_PATH}/descargar?id=${id}&tipo=docx`
    };
    res.json({ id, archivos: rutasDescarga });

    const rutaAbsoluta = path.resolve(req.file.path);
    scheduleDeletion(req.file.path);
    console.log('Llamando a transcribirUnSoloArchivo con:', rutaAbsoluta);

    const enviar = (payload) => {
      const cliente = conexiones.get(id);
      if (cliente) {
        cliente.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    };

    const finalizar = () => {
      const cliente = conexiones.get(id);
      if (cliente) {
        cliente.end();
        conexiones.delete(id);
      }
    };

      setImmediate(async () => {
        try {
          const resultado = await transcribirUnSoloArchivo(rutaAbsoluta, (msg) => {
            enviar({ progreso: msg });
          });
          if (!resultado || typeof resultado !== 'object' || !resultado.transcripcion) {
            throw new Error('transcribirUnSoloArchivo no devolvió una ruta de transcripción');
          }
          archivosGenerados.set(id, resultado.rutasRelativas, {
            nombre: req.file.originalname || id,
            fecha: Date.now(),
          });
          const primeraRuta = Object.values(resultado.rutasRelativas).find(Boolean);
          if (primeraRuta) {
            const dir = path.dirname(path.resolve(__dirname, '..', '..', primeraRuta));
            scheduleDeletion(dir, () => archivosGenerados.delete(id));
          }
          const contenido = fs.readFileSync(resultado.transcripcion, 'utf-8');
          enviar({ final: contenido, id });
        } catch (err) {
          console.error('Error en transcripción:', err);
          enviar({ error: err.message });
        } finally {
          finalizar();
        }
      });
  } catch (error) {
    console.error(`Error en ${API_BASE_PATH}/transcribir:`, error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/descargar', (req, res) => {
  const { id, tipo } = req.query;
  const permitidos = ['txt', 'md', 'docx'];
  if (!permitidos.includes(tipo)) {
    return res.status(400).json({ error: 'Tipo no válido' });
  }
  const archivos = archivosGenerados.get(id);
  if (!archivos) {
    return res.status(404).json({ error: 'ID no válido' });
  }
  const relativa = archivos[tipo];
  if (!relativa) {
    return res.status(404).json({ error: 'Archivo no disponible' });
  }
  const base = path.resolve(__dirname, '..', '..');
  const ruta = path.resolve(base, relativa);
  if (!ruta.startsWith(base)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  if (!fs.existsSync(ruta)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }
  res.download(ruta, (err) => {
    if (err) console.error('Error al enviar archivo:', err);
  });
});

router.get('/descargar-zip', (req, res) => {
  const { id, tipos } = req.query;
  const permitidos = ['txt', 'md', 'docx'];
  if (!id || !tipos) {
    return res.status(400).json({ error: 'Parámetros faltantes' });
  }
  const solicitados = tipos
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  if (
    !solicitados.length ||
    solicitados.some((t) => !permitidos.includes(t))
  ) {
    return res.status(400).json({ error: 'Tipo no válido' });
  }
  const archivos = archivosGenerados.get(id);
  if (!archivos) {
    return res.status(404).json({ error: 'ID no válido' });
  }
  const base = path.resolve(__dirname, '..', '..');
  const lista = [];
  for (const tipo of solicitados) {
    const relativa = archivos[tipo];
    if (!relativa) {
      return res.status(404).json({ error: 'Archivo no disponible' });
    }
    const ruta = path.resolve(base, relativa);
    if (!ruta.startsWith(base) || !fs.existsSync(ruta)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    lista.push({ ruta, nombre: path.basename(relativa) });
  }

  const zipName = `transcripcion-${id}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${zipName}"`
  );

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    console.error('Error al crear ZIP:', err);
    res.status(500).end();
  });
  archive.pipe(res);
  lista.forEach((f) => archive.file(f.ruta, { name: f.nombre }));
  archive.finalize();
});

router.get('/historial', (req, res) => {
  res.json(archivosGenerados.list());
});

router.delete('/historial/:id', (req, res) => {
  const { id } = req.params;
  archivosGenerados.delete(id);
  res.status(204).end();
});

app.use(API_BASE_PATH, router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando http://localhost:${PORT}`);
});