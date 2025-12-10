const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

function limpiarMarkdown(texto) {
    if (!texto) return texto;
    let limpio = texto;
    limpio = limpio.replace(/__(.*?)__/g, '$1');
    limpio = limpio.replace(/_(.*?)_/g, '$1');
    limpio = limpio.replace(/\*\*([\s\S]+?)\*\*/g, '$1');
    limpio = limpio.replace(/^[*-]\s+/gm, '');
    limpio = limpio.replace(/(\d+\.\s[^\n]+)\n(?=\d+\.\s)/g, '$1\n\n');
    return limpio;
}

function generarDocumentoWord(textoCompleto, nombreDelArchivo, datosExtras = {}, archivoPlantillaWord, directorioDelProyecto) {
    if (!fs.existsSync(archivoPlantillaWord)) {
        console.error('❌ No encontré la plantilla de Word.');
        return false;
    }

    try {
        const datosPlantilla = fs.readFileSync(archivoPlantillaWord, 'binary');
        const zip = new PizZip(datosPlantilla);
        const documentoWord = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '[[', end: ']]' }
        });

        const textoLimpio = limpiarMarkdown(textoCompleto);
        const participantesTexto = limpiarMarkdown(
            Array.isArray(datosExtras.participantes)
                ? datosExtras.participantes.join('\n')
                : (datosExtras.participantes || '')
        );

        const compromisosArray = Array.isArray(datosExtras.compromisos)
            ? datosExtras.compromisos.map(c => ({
                actividad: limpiarMarkdown(c.actividad || ''),
                fecha: c.fecha || '',
                responsable: c.responsable || ''
            }))
            : [];

        documentoWord.render({
            DESARROLLO: textoLimpio,
            FECHA: datosExtras.fecha || '',
            HORA_INICIO: datosExtras.horaInicio || '',
            HORA_FIN: datosExtras.horaFin || '',
            PARTICIPANTES: participantesTexto,
            OBJETIVOS: limpiarMarkdown(datosExtras.objetivos || ''),
            HECHOS: limpiarMarkdown(datosExtras.hechos || ''),
            DESARROLLO_COMITE: limpiarMarkdown(datosExtras.desarrolloComite || ''),
            CONCLUSIONES: limpiarMarkdown(datosExtras.conclusiones || ''),
            COMPROMISOS: compromisosArray
        });

        const bufferDocumento = documentoWord.getZip().generate({ type: 'nodebuffer' });
        const rutaDocumentoFinal = path.join(directorioDelProyecto, `${nombreDelArchivo}_acta_completa.docx`);
        fs.writeFileSync(rutaDocumentoFinal, bufferDocumento);

        console.log(`✅ ¡Logré generar el documento Word! Se guardó como: ${nombreDelArchivo}_acta_completa.docx`);
        return true;
    } catch (error) {
        console.error('❌ Tuve problemas generando el documento Word:', error);
        return false;
    }
}

module.exports = { limpiarMarkdown, generarDocumentoWord };