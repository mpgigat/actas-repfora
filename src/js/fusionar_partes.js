const marcador = '<<CONTINUAR>>';

function obtenerSegmentoFinal(texto) {
    const idxMarcador = texto.lastIndexOf(marcador);
    if (idxMarcador !== -1) {
        return texto.slice(idxMarcador + marcador.length).trim();
    }
    const oraciones = texto.match(/[^.?!]*[.?!]/g);
    if (oraciones && oraciones.length > 0) {
        return oraciones[oraciones.length - 1].trim();
    }
    return texto.trim();
}

function calcularSolapamiento(a, b) {
    const tokensA = a.split(/\s+/);
    const tokensB = b.split(/\s+/);
    const max = Math.min(tokensA.length, tokensB.length);
    for (let i = max; i > 0; i--) {
        const finA = tokensA.slice(-i).join(' ');
        const inicioB = tokensB.slice(0, i).join(' ');
        if (finA === inicioB) {
            return inicioB.length;
        }
    }
    return 0;
}

function fusionarPartes(primeraParte, segundaParte) {
    let primera = primeraParte.replace(marcador, '').trim();
    let segunda = segundaParte.trimStart();

    const referencia = obtenerSegmentoFinal(primeraParte);
    const solapamiento = calcularSolapamiento(referencia, segunda);
    if (solapamiento > 0) {
        segunda = segunda.slice(solapamiento).trimStart();
    }

    const residual = calcularSolapamiento(primera, segunda);
    if (residual > 0) {
        segunda = segunda.slice(residual).trimStart();
    }

    let separador = '';
    if (/[.!?]\s*$/.test(primera)) {
        separador = '\n';
    } else if (!/\s$/.test(primera)) {
        separador = ' ';
    }
    const actaFinal = (primera + separador + segunda).trim();

    if (actaFinal.includes(marcador) || calcularSolapamiento(primera, segunda) > 0) {
        console.warn('⚠️ Persisten inconsistencias tras la fusión.');
    }

    return actaFinal;
}

module.exports = { fusionarPartes, calcularSolapamiento, obtenerSegmentoFinal };