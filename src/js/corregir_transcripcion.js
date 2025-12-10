// Corrige ortografía y gramática de una transcripción
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function corregirTranscripcion(inputPath, outputPath, modelo, chunkOverride, overlapOverride, promptTemplateOverride) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY no configurada');

    const client = new GoogleGenerativeAI(apiKey);
    const modelName = modelo || process.env.MODELO_GEMINI || 'gemini-2.5-flash';
    const modelInstance = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
            temperature: parseFloat(process.env.TEMPERATURA) || 0.3,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: parseInt(process.env.MAX_TOKENS) || 8192,
        }
    });
    const maxTokens = modelInstance.generationConfig.maxOutputTokens;

    const promptTemplate = promptTemplateOverride || `Corrige y reescribe párrafos provenientes de audio con ruido.
Estilo: Primera persona, registro oral natural y coherente, sin adornos.
Reglas:

Mantén el orden exacto del documento de entrada.

Conserva etiquetas de hablante si existen (ej.: “INTERVIENE …:”).

Repara gramática, puntuación y muletillas; elimina repeticiones.

No inventes datos: si algo es inaudible, marca [inaudible].

No cambies el sentido; resume solo lo redundante.

Mantén formato de párrafo por intervención.
Salida: Texto corregido, en primera persona, listo para pegar en el acta. {texto}`;

    function construirPrompt(parte) {
        return promptTemplate.includes('{texto}')
            ? promptTemplate.replace('{texto}', parte)
            : `${promptTemplate} ${parte}`;
    }

    const texto = fs.readFileSync(inputPath, 'utf8');
    const envChunk = parseInt(process.env.CHUNK_WORDS, 10);
    let chunkWords = Number.isInteger(chunkOverride)
        ? chunkOverride
        : (Number.isInteger(envChunk) ? envChunk : 10000);
    const envOverlap = parseInt(process.env.OVERLAP_WORDS, 10);
    const overlapWords = Number.isInteger(overlapOverride)
        ? overlapOverride
        : (Number.isInteger(envOverlap) ? envOverlap : 20);
    const palabras = texto.split(/\s+/);
    const partes = [];
    let i = 0;
    while (i < palabras.length) {
        let parte = palabras.slice(i, i + chunkWords).join(' ');
        let prompt = construirPrompt(parte);
        let tokenInfo = await modelInstance.countTokens(prompt);
        while (tokenInfo.totalTokens > maxTokens && chunkWords > 1) {
            chunkWords = Math.max(Math.floor(chunkWords / 2), 1);
            parte = palabras.slice(i, i + chunkWords).join(' ');
            prompt = construirPrompt(parte);
            tokenInfo = await modelInstance.countTokens(prompt);
        }
        partes.push(parte);
        i += Math.max(chunkWords - overlapWords, 1);
    }

    let resultadoCompleto = '';
    let segmentosCorrectos = 0;
    const segmentosFallidos = [];

    async function corregirSegmento(parte, nivel = 0) {
        const prompt = construirPrompt(parte);
        const tokenInfo = await modelInstance.countTokens(prompt);
        if (tokenInfo.totalTokens > maxTokens) {
            console.warn(`⚠️ Segmento supera tokens (${tokenInfo.totalTokens} > ${maxTokens}), subdividiendo (nivel ${nivel})`);
            const palabras = parte.split(/\s+/);
            if (palabras.length <= 1) {
                return parte;
            }
            const mitad = Math.ceil(palabras.length / 2);
            const primera = palabras.slice(0, mitad).join(' ');
            const segunda = palabras.slice(mitad).join(' ');
            const primeraCorregida = await corregirSegmento(primera, nivel + 1);
            const segundaCorregida = await corregirSegmento(segunda, nivel + 1);
            return `${primeraCorregida} ${segundaCorregida}`.trim();
        }
        const maxIntentos = 3;
        let intentos = 0;
        let resp;
        let textoCorregido = '';
        let ultimoError;

        while (intentos < maxIntentos && !textoCorregido.trim()) {
            intentos++;
            try {
                const res = await modelInstance.generateContent(prompt);
                resp = res.response;

                if (resp?.text) {
                    // SDK ofrece helper text()
                    textoCorregido = resp.text();
                } else if (resp?.candidates?.length) {
                    // Fallback manual a los candidatos
                    textoCorregido = resp.candidates
                        .map(c => c.content?.parts?.map(p => p.text || '').join(''))
                        .join('\n');
                }

                if (!textoCorregido.trim()) {
                    console.warn(`⚠️ Intento ${intentos} sin texto (nivel ${nivel})`);
                }
            } catch (error) {
                ultimoError = error;
                console.error(`⚠️ Error en el segmento (nivel ${nivel}), intento ${intentos}:`, error.message);
            }
        }

        console.log(`Intentos realizados (nivel ${nivel}): ${intentos}`);

        const finishReason = resp?.candidates?.[0]?.finishReason;
        if (finishReason === 'MAX_TOKENS') {
            console.warn(`⚠️ Segmento excede tokens, subdividiendo (nivel ${nivel})`);
            const palabras = parte.split(/\s+/);
            if (palabras.length <= 1) {
                return textoCorregido || parte;
            }
            const mitad = Math.ceil(palabras.length / 2);
            const primera = palabras.slice(0, mitad).join(' ');
            const segunda = palabras.slice(mitad).join(' ');
            const primeraCorregida = await corregirSegmento(primera, nivel + 1);
            const segundaCorregida = await corregirSegmento(segunda, nivel + 1);
            return `${primeraCorregida} ${segundaCorregida}`.trim();
        }

        if (!textoCorregido.trim()) {
            if (ultimoError) throw ultimoError;
            console.warn(`⚠️ Gemini no devolvió texto (nivel ${nivel})`);
            console.log(JSON.stringify(resp, null, 2));
            const blockReason = resp?.promptFeedback?.blockReason;
            if (finishReason || blockReason) {
                console.warn(`Motivo: ${finishReason || blockReason}`);
            }
            textoCorregido = parte;
        }

        return textoCorregido;
    }

    for (let index = 0; index < partes.length; index++) {
        const parte = partes[index];
        try {
            let textoCorregido = await corregirSegmento(parte);
            if (index > 0 && overlapWords > 0) {
                const palabrasCorregidas = textoCorregido.split(/\s+/).slice(overlapWords);
                textoCorregido = palabrasCorregidas.join(' ');
            }
            resultadoCompleto += textoCorregido + '\n';
            segmentosCorrectos++;
        } catch (error) {
            resultadoCompleto += `[SEGMENTO ${index + 1} NO PROCESADO]\n`;
            segmentosFallidos.push(index + 1);
            console.error(`⚠️ Error en el segmento ${index + 1}:`, error.message);
        }
    }
    let pudoGuardar = true;
    try {
        fs.writeFileSync(outputPath, resultadoCompleto, 'utf8');
    } catch (error) {
        pudoGuardar = false;
        console.error(`❌ No se pudo guardar la transcripción corregida: ${error.message}`);
    }

    const total = partes.length;
    const fallidos = segmentosFallidos.length;
    const correctos = segmentosCorrectos;
    console.log(`Segmentos correctos: ${correctos}, fallidos: ${fallidos}`);

    return { correctos, fallidos: segmentosFallidos, total, outputPath, pudoGuardar };
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const input = args[0];
    if (!input) {
        console.error('Uso: node src/js/corregir_transcripcion_10000.js archivo.txt [salida.txt] [modeloGemini] [--chunk=n] [--overlap=n] [--prompt-template="texto"]');
        process.exit(1);
    }

    let output;
    let modelo;
    let chunk;
    let overlap;
    let promptTemplate;

    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--chunk=')) {
            const val = parseInt(arg.split('=')[1], 10);
            if (!Number.isNaN(val)) chunk = val;
        } else if (arg.startsWith('--overlap=')) {
            const val = parseInt(arg.split('=')[1], 10);
            if (!Number.isNaN(val)) overlap = val;
        } else if (arg.startsWith('--prompt-template=')) {
            promptTemplate = arg.slice('--prompt-template='.length);
        } else if (!output) {
            output = arg;
        } else if (!modelo) {
            modelo = arg;
        }
    }

    output = output || path.join(path.dirname(input), path.basename(input, path.extname(input)) + '_corregida.txt');

    corregirTranscripcion(input, output, modelo, chunk, overlap, promptTemplate)
        .then(({ correctos, fallidos, total, outputPath, pudoGuardar }) => {
            if (fallidos.length > 0) {
                console.error(`❌ ${fallidos.length} de ${total} segmentos no se corrigieron: ${fallidos.join(', ')}`);
                process.exit(1);
            } else if (!pudoGuardar) {
                process.exit(1);
            } else {
                console.log(`✅ Transcripción corregida guardada en: ${outputPath}`);
            }
        })
        .catch(err => {
            console.error('❌ Error al corregir transcripción:', err.message);
            process.exit(1);
        });
}

module.exports = { corregirTranscripcion };