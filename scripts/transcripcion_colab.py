{
 "cells": [
  {
   "cell_type": "markdown",
   "id": "87be4657",
   "metadata": {},
   "source": [
    "# Transcripción en Google Colab\n",
    "\n",
    "Este cuaderno permite transcribir las tres partes del audio de Cosmetología aprovechando la GPU de Colab. Ejecuta cada celda de arriba hacia abajo:\n",
    "\n",
    "1. Instala las dependencias.\n",
    "2. Monta tu Google Drive o sube manualmente los archivos `cosmetologia_parte_1.wav`, `cosmetologia_parte_2.wav` y `cosmetologia_parte_3.wav`.\n",
    "3. Ejecuta la transcripción para cada archivo.\n",
    "4. Se unirán las tres transcripciones en un solo documento.\n",
    "5. Finalmente podrás ver o descargar el resultado combinado.\n"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "id": "cb58b20f",
   "metadata": {},
   "outputs": [],
   "source": [
    "!pip install -r requirements.txt"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "id": "9b9155a9",
   "metadata": {},
   "outputs": [],
   "source": [
    "from google.colab import drive, files\n",
    "# Monta Google Drive (comenta esta línea si prefieres subir los archivos manualmente)\n",
    "drive.mount('/content/drive')\n",
    "\n",
    "# Para subir los archivos sin Drive descomenta la siguiente línea\n",
    "# uploaded = files.upload()\n"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "id": "f1f891bd",
   "metadata": {},
   "outputs": [],
   "source": [
    "import os\n",
    "\n",
    "audios = [\n",
    "    'cosmetologia_parte_1.wav',\n",
    "    'cosmetologia_parte_2.wav',\n",
    "    'cosmetologia_parte_3.wav'\n",
    "]\n",
    "\n",
    "text_files = []\n",
    "for audio in audios:\n",
    "    if not os.path.exists(audio):\n",
    "        raise FileNotFoundError(f'No se encontró {audio}. Verifica la ruta.')\n",
    "    !python src/python/transcribir.py \"{audio}\"\n",
    "    text_files.append(f\"{os.path.splitext(audio)[0]}_transcripcion.txt\")\n"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "id": "b3fa0707",
   "metadata": {},
   "outputs": [],
   "source": [
    "combined = 'cosmetologia_completa.txt'\n",
    "with open(combined, 'w', encoding='utf-8') as out:\n",
    "    for tf in text_files:\n",
    "        with open(tf, 'r', encoding='utf-8') as f:\n",
    "            out.write(f.read().strip() + '\n",
    "\n",
    "')\n",
    "\n",
    "print('Archivo combinado guardado en', combined)\n"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": None,
   "id": "dd4f7d51",
   "metadata": {},
   "outputs": [],
   "source": [
    "from google.colab import files\n",
    "\n",
    "with open(combined, 'r', encoding='utf-8') as f:\n",
    "    print(f.read()[:1000])\n",
    "\n",
    "files.download(combined)\n"
   ]
  }
 ],
 "metadata": {},
 "nbformat": 4,
 "nbformat_minor": 5
}