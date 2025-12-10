# Sistema de Transcripción y Actas para Comités SENA

Este proyecto automatiza la transcripción de audio de reuniones del SENA y genera actas en formato Markdown/Word.

## Requisitos

- **Node.js** (recomendado v18 o superior)
- **Python** 3.10+
- Instalar dependencias:
  - `npm install`
  - `pip install -r requirements.txt`
  - El propio PyTorch a la instalación del desde PyPI, por lo que **sin necesidad** especificar un `--url de índice adicional`.
- Configurar las siguientes variables de entorno en un archivo `.env`:
  - `GEMINI_API_KEY` – clave para usar Google Gemini.
  - `MODELO_GEMINI` – nombre del modelo Gemini (opcional).
  - `TEMPERATURA` – control de aleatoriedad para Gemini (opcional).
  - `MAX_TOKENS` – límite de tokens generados por Gemini (opcional).
  - `HF_TOKEN` – token de Hugging Face usado por el transcriptor en Python.

## Comandos principales

- `npm run transcribir` – procesa los audios y genera archivos de texto.
- `npm run generar-acta [--articulos=...]` – crea un acta a partir de una transcripción; usa `--articulos` para citar artículos del reglamento.
- `npm run generar-acta-partes` – acepta uno o dos archivos de transcripción y genera el acta completa.
- `npm run corregir-transcripcion -- ruta/al/archivo.txt` – genera una versión corregida de la transcripción.

```bash
npm run corregir-transcripcion -- transcripciones/mi_reunion.txt
```

## Carpeta `src`

- `src/js` contiene los scripts Node.js para transcribir y generar actas.
- `src/python` incluye el transcriptor avanzado con WhisperX.

Las actas generadas se almacenan en la carpeta `actas_gemini`.

### Asignar nombres de hablantes

Después de transcribir un audio puedes ejecutar:

```bash
python src/python/gestionar_nombres.py ruta/al/archivo_transcripcion.txt
```

El programa intentará detectar nombres propios cerca de cada etiqueta `INTERVIENE HABLANTE X:` usando spaCy y te sugerirá un nombre para cada hablante. Presiona **Enter** para aceptar la sugerencia o escribe el nombre correcto.

Para mejorar la detección de nombres, instala el modelo de spaCy para español con:

```bash
python -m spacy download es_core_news_sm
```

Cuando confirmes los nombres se guardarán en el archivo `hablantes.json`. Luego
debes volver a ejecutar `transcribir.py` (o `npm run transcribir`) para que los
nombres aparezcan tanto en la transcripción como en las actas generadas.

### Referenciar el Reglamento del Aprendiz

Puedes agregar citas del Reglamento del Aprendiz de forma automática. Crea el archivo `config/reglamento.json` (ya se incluye un ejemplo) con los artículos que quieras referenciar. Al generar un acta, pasa una lista de artículos a través del parámetro `articulosReglamento`:

```js
const generador = new GeneradorActas();
await generador.init();
generador.generarMiActa(texto, { articulosReglamento: [
  "CAPITULO III - Articulo 8 - Numeral 6",
  "CAPITULO IV - Articulo 10 - Numeral 2"
] });
```

El texto completo de esos artículos se añadirá al prompt para que aparezcan en la sección **Hechos que serán objeto de estudio** del acta.

Si no se proporcionan artículos explícitos, el generador intentará deducirlos automáticamente. Para ello analiza la transcripción y busca coincidencias con el texto del reglamento, seleccionando los artículos más relevantes y agregándolos al prompt.

### Generar reglamento.json

Para extraer todos los artículos del PDF oficial ejecuta:

```bash
python scripts/extraer_reglamento.py ruta/al/Reglamento.pdf config/reglamento.json
```

El archivo `config/reglamento.json` incluirá cada numeral con una clave del tipo `"CAPITULO III - Articulo 8 - Numeral 6"`.

### Placeholders de la plantilla Word

La plantilla `config/plantilla.docx` usa marcadores de reemplazo entre `[[` y `]]` que se completan al generar el documento final. Los campos disponibles son:

- `[[FECHA]]`
- `[[HORA_INICIO]]`
- `[[HORA_FIN]]`
- `[[PARTICIPANTES]]`
- `[[HECHOS]]`
- `[[DESARROLLO_COMITE]]`
- `[[CONCLUSIONES]]`
- `[[OBJETIVOS]]` para el objetivo de la reunión.