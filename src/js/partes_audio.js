const fs = require('fs');
const path = require('path');

function buscarArchivosDeAudioProcesado(carpetaAudioProcesado) {
    if (!fs.existsSync(carpetaAudioProcesado)) {
        console.error(`❌ No encontré la carpeta: ${carpetaAudioProcesado}`);
        console.log('💡 Primero necesito ejecutar el preprocesador de audio');
        return [];
    }

    const todosLosArchivos = fs.readdirSync(carpetaAudioProcesado);
    const archivosDeParte = todosLosArchivos
        .filter(archivo => archivo.includes('_parte_') && archivo.endsWith('.wav'))
        .sort();

    return archivosDeParte.map(archivo => ({
        nombreArchivo: archivo,
        rutaCompleta: path.join(carpetaAudioProcesado, archivo),
        numeroParte: archivo.match(/_parte_(\d+)/)[1]
    }));
}

module.exports = { buscarArchivosDeAudioProcesado };