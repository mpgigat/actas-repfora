const fs = require('fs');

function unificarHablantesEntrePartes(listaTranscripciones) {
    console.log('🧠 Unificando hablantes entre todas las partes...');

    const mapeoHablantesGlobal = {};
    let contadorDeHablantes = 1;

    const transcripcionesUnificadas = listaTranscripciones.map((transcripcion, indice) => {
        let textoUnificado = transcripcion.contenido;
        const numeroParteActual = indice + 1;

        const hablantesEnEstaParte = [...new Set([...textoUnificado.matchAll(/INTERVIENE HABLANTE (SPEAKER_\d+|\d+):/g)].map(m => m[1]))];

        hablantesEnEstaParte.forEach(hablanteLocal => {
            const claveMapeo = `PARTE_${numeroParteActual}_${hablanteLocal}`;

            if (!mapeoHablantesGlobal[claveMapeo]) {
                mapeoHablantesGlobal[claveMapeo] = contadorDeHablantes;
                console.log(`   ${hablanteLocal} (Parte ${numeroParteActual}) → HABLANTE ${contadorDeHablantes}`);
                contadorDeHablantes++;
            }

            const expresionRegular = new RegExp(`INTERVIENE HABLANTE ${hablanteLocal}:`, 'g');
            textoUnificado = textoUnificado.replace(expresionRegular, `INTERVIENE HABLANTE ${mapeoHablantesGlobal[claveMapeo]}:`);
        });

        return {
            ...transcripcion,
            contenido: textoUnificado
        };
    });

    return transcripcionesUnificadas;
}

function combinarTodasLasTranscripciones(transcripciones) {
    console.log('🔗 Combinando todas las transcripciones en una sola...');

    const transcripcionesUnificadas = unificarHablantesEntrePartes(transcripciones);
    transcripcionesUnificadas.sort((a, b) => parseInt(a.parte) - parseInt(b.parte));

    let textoFinalCompleto = '';
    const hablantesQueEncontre = new Set();

    transcripcionesUnificadas.forEach((transcripcion, indice) => {
        if (indice > 0) {
            textoFinalCompleto += '\n\n\n--- CONTINUACIÓN PARTE ' + transcripcion.parte + ' ---\n\n\n';
        }

        textoFinalCompleto += transcripcion.contenido;

        const hablantesEnEstaParte = [...transcripcion.contenido.matchAll(/INTERVIENE HABLANTE (\d+):/g)].map(m => m[1]);
        hablantesEnEstaParte.forEach(h => hablantesQueEncontre.add(h));
    });

    console.log('✅ Transcripciones combinadas exitosamente');
    console.log(`👥 Hablantes únicos que identifiqué: ${Array.from(hablantesQueEncontre).sort((a, b) => parseInt(a) - parseInt(b)).map(h => `HABLANTE ${h}`).join(', ')}`);

    return {
        textoCompleto: textoFinalCompleto,
        listaHablantes: Array.from(hablantesQueEncontre)
    };
}

function verificarSiHablantesEstanRegistrados(hablantesDetectados, archivoHablantes) {
    const mapeoExistente = fs.existsSync(archivoHablantes)
        ? JSON.parse(fs.readFileSync(archivoHablantes, 'utf-8'))
        : {};

    const hablantesNoRegistrados = hablantesDetectados.filter(h => !mapeoExistente[`HABLANTE_${h}`] && !mapeoExistente[`HABLANTE ${h}`]);

    if (hablantesNoRegistrados.length > 0) {
        return false;
    }

    return true;
}

module.exports = {
    unificarHablantesEntrePartes,
    combinarTodasLasTranscripciones,
    verificarSiHablantesEstanRegistrados
};