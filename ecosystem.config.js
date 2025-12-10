require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'actas-repfora',
      script: './src/server/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 20231,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        MODELO_GEMINI: process.env.MODELO_GEMINI,
        TEMPERATURA: process.env.TEMPERATURA,
        MAX_TOKENS: process.env.MAX_TOKENS,
        CHUNK_WORDS: process.env.CHUNK_WORDS,
        OVERLAP_WORDS: process.env.OVERLAP_WORDS,
        INSTITUCION: process.env.INSTITUCION,
        CENTRO: process.env.CENTRO,
        REGION: process.env.REGION,
        COORDINADOR_ACADEMICO: process.env.COORDINADOR_ACADEMICO,
        MODO_DETALLADO: process.env.MODO_DETALLADO,
        HF_TOKEN: process.env.HF_TOKEN,
        API_BASE_PATH: process.env.API_BASE_PATH,
        PYTHON_CMD: process.env.PYTHON_CMD || 'python3'
      }
    }
  ]
};
