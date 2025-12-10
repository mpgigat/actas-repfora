const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

// Permitir que el nombre del archivo se pase por la línea de comandos.
// Si no se proporciona, usar ADSO.mp3 por defecto.
const audioFile = process.argv[2] || "ADSO.mp3";
const nombreBase = path.basename(audioFile, path.extname(audioFile));

// Configuración
const outputDir = "audio_procesado";
const audioLimpio = path.join(outputDir, `${nombreBase}_limpio.wav`);
const prefijoParte = path.join(outputDir, `${nombreBase}_parte`);

console.log("🎵 Iniciando preprocesamiento de audio...");

// Crear directorio de salida si no existe
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
    console.log(`📁 Directorio creado: ${outputDir}`);
}

// Función para obtener duración del audio
async function obtenerDuracion(archivo) {
    const comando = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${archivo}"`;
    try {
        const { stdout } = await execAsync(comando);
        return parseFloat(stdout.trim());
    } catch (error) {
        throw error;
    }
}

// Función para limpiar audio (reducir ruido)
async function limpiarAudio() {
    console.log("🧹 Limpiando audio (reduciendo ruido de fondo)...");

    const filtros = [
        "highpass=f=80",           // Filtro pasa-altos a 80Hz
        "lowpass=f=8000",          // Filtro pasa-bajos a 8kHz
        "afftdn=nr=20:nf=-40",     // Reducción de ruido FFT
        "dynaudnorm=p=0.9:s=5"     // Normalización dinámica
    ].join(",");

    const comando = `ffmpeg -i "${audioFile}" -af "${filtros}" -ar 16000 -ac 1 "${audioLimpio}" -y`;

    console.log("⚙️  Aplicando filtros de limpieza...");
    try {
        await execAsync(comando);
        console.log("✅ Audio limpiado correctamente");
    } catch (error) {
        console.error("❌ Error al limpiar audio:", error.message);
        throw error;
    }
}

// Función para dividir audio en partes
async function dividirAudio(duracionTotal) {
    console.log("✂️  Dividiendo audio en 3 partes...");

    const duracionParte = duracionTotal / 3;
    const archivosGenerados = [];

    for (let i = 0; i < 3; i++) {
        const inicioTiempo = i * duracionParte;
        const archivoSalida = `${prefijoParte}_${i + 1}.wav`;
        const comando = `ffmpeg -i "${audioLimpio}" -ss ${inicioTiempo} -t ${duracionParte} -c copy "${archivoSalida}" -y`;

        console.log(`📝 Creando parte ${i + 1} (${Math.floor(inicioTiempo / 60)}min - ~${Math.floor(duracionParte / 60)}min)...`);
        try {
            await execAsync(comando);
            console.log(`✅ Parte ${i + 1} creada: ${path.basename(archivoSalida)}`);
            archivosGenerados.push(archivoSalida);
        } catch (error) {
            console.error(`❌ Error al crear parte ${i + 1}:`, error.message);
            throw error;
        }
    }

    return archivosGenerados;
}

// Función principal
async function procesarAudio() {
    try {
        // Verificar que existe el archivo de audio
        if (!fs.existsSync(audioFile)) {
            console.error(`❌ No se encontró el archivo: ${audioFile}`);
            return;
        }

        // Verificar que ffmpeg está instalado
        console.log("🔍 Verificando ffmpeg...");
        await new Promise((resolve, reject) => {
            exec("ffmpeg -version", (error) => {
                if (error) {
                    console.error("❌ ffmpeg no está instalado o no está en el PATH");
                    console.log("📋 Para instalar ffmpeg:");
                    console.log("   Windows: Descargar de https://ffmpeg.org/download.html");
                    console.log("   macOS: brew install ffmpeg");
                    console.log("   Ubuntu/Debian: sudo apt install ffmpeg");
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        // Obtener duración del audio original
        console.log("⏱️  Obteniendo información del audio...");
        const duracion = await obtenerDuracion(audioFile);
        console.log(`📊 Duración total: ${Math.floor(duracion / 60)} minutos ${Math.floor(duracion % 60)} segundos`);

        // Limpiar audio
        await limpiarAudio();

        // Dividir audio en partes
        const archivosPartes = await dividirAudio(duracion);

        console.log("\n🎉 ¡Preprocesamiento completado!");
        console.log("📁 Archivos generados:");
        console.log(`   - Audio limpio: ${audioLimpio}`);
        archivosPartes.forEach((archivo, i) => {
            console.log(`   - Parte ${i + 1}: ${archivo}`);
        });

        console.log("\n📝 Siguiente paso:");
        console.log("   Ejecuta transcribir.js usando cada archivo de parte individual");
        console.log("   Ejemplo: node transcribir.js para cada archivo .wav generado");

        // Crear un archivo de lote para transcribir todas las partes
        const scriptTranscripcion = archivosPartes
            .map(archivo => `echo "Transcribiendo ${path.basename(archivo)}..."\nnode transcribir.js "${archivo}"`)
            .join("\n\n");

        const archivoLote = path.join(outputDir, "transcribir_todas_partes.bat");
        fs.writeFileSync(archivoLote, scriptTranscripcion);

    } catch (error) {
        console.error("❌ Error durante el procesamiento:", error.message);
    }
}

// Ejecutar
procesarAudio();