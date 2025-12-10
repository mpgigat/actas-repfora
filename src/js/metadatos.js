function extraerInformacionDelAudio(nombreArchivo, textoTranscrito = '') {
    const informacionDetectada = {
        nombreDelProyecto: nombreArchivo.replace(/(_transcripcion|_parte_\d+|_completa)/g, ''),
        fechaDeHoy: new Date().toLocaleDateString('es-CO'),
        programaAcademico: null,
        numeroFicha: null,
        nombreAprendiz: null,
        numeroDeActa: null,
        instructorPrincipal: null
    };

    if (textoTranscrito) {
        const patronesPrograma = [
            /programa\s+([^.]{15,150})/i,
            /técnico\s+en\s+([^.]{10,100})/i,
            /del\s+programa\s+([^.]{10,100})/i
        ];

        for (const patron of patronesPrograma) {
            const coincidencia = textoTranscrito.match(patron);
            if (coincidencia) {
                informacionDetectada.programaAcademico = coincidencia[1].trim().replace(/\s+/g, ' ');
                break;
            }
        }

        const patronesFicha = [
            /ficha\s*:?\s*(\d+[-\d]*)/i,
            /de\s+la\s+ficha\s+(\d+)/i,
            /ficha\s+número\s+(\d+)/i
        ];

        for (const patron of patronesFicha) {
            const coincidencia = textoTranscrito.match(patron);
            if (coincidencia) {
                informacionDetectada.numeroFicha = coincidencia[1];
                break;
            }
        }

        const patronesAprendices = [
            /aprendiz\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})/g,
            /del\s+aprendiz\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})/g,
            /estudiante\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})/g
        ];

        const aprendicesEncontrados = new Set();
        for (const patron of patronesAprendices) {
            let coincidencia;
            while ((coincidencia = patron.exec(textoTranscrito)) !== null) {
                aprendicesEncontrados.add(coincidencia[1].trim());
            }
        }

        if (aprendicesEncontrados.size > 0) {
            informacionDetectada.nombreAprendiz = Array.from(aprendicesEncontrados).join(', ');
        }

        const patronesFecha = [
            /(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i,
            /(\d{1,2}\/\d{1,2}\/\d{4})/i,
            /fecha[:\s]+([^.]{10,30})/i
        ];

        for (const patron of patronesFecha) {
            const coincidencia = textoTranscrito.match(patron);
            if (coincidencia) {
                informacionDetectada.fechaDeHoy = coincidencia[1].trim();
                break;
            }
        }

        const patronesInstructor = [
            /instructor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})/i,
            /profesora?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})/i
        ];

        for (const patron of patronesInstructor) {
            const coincidencia = textoTranscrito.match(patron);
            if (coincidencia) {
                informacionDetectada.instructorPrincipal = coincidencia[1].trim();
                break;
            }
        }
    }

    const nombreEnMinusculas = nombreArchivo.toLowerCase();
    if (nombreEnMinusculas.includes('fotovoltaicos')) {
        informacionDetectada.programaAcademico = informacionDetectada.programaAcademico || 'Técnico en Mantenimiento e Instalación de Sistemas Solares Fotovoltaicos';
    } else if (nombreEnMinusculas.includes('adso')) {
        informacionDetectada.programaAcademico = informacionDetectada.programaAcademico || 'Análisis y Desarrollo de Software';
    } else if (nombreEnMinusculas.includes('asistencia') || nombreEnMinusculas.includes('administrativa')) {
        informacionDetectada.programaAcademico = informacionDetectada.programaAcademico || 'Técnico en Asistencia Administrativa';
    } else if (nombreEnMinusculas.includes('agrotronica') || nombreEnMinusculas.includes('agrotrónica')) {
        informacionDetectada.programaAcademico = informacionDetectada.programaAcademico || 'Técnico en Agrotrónica';
    }

    if (!informacionDetectada.numeroDeActa) {
        const codigoFecha = new Date().getFullYear().toString().slice(-2) +
                         String(new Date().getMonth() + 1).padStart(2, '0') +
                         String(new Date().getDate()).padStart(2, '0');
        informacionDetectada.numeroDeActa = `CEyS-${codigoFecha}`;
    }

    return informacionDetectada;
}

module.exports = { extraerInformacionDelAudio };