"""Herramientas para detectar posibles nombres en una transcripción.

Este módulo analiza un archivo de transcripción y busca nombres propios
cerca de cada marca "INTERVIENE HABLANTE X:". Si spaCy está disponible
se utiliza su modelo en español, de lo contrario se aplica una heurística
básica con expresiones regulares.
"""

from __future__ import annotations

import os
import re
from typing import Dict, List

try:
    import spacy
    try:
        _nlp = spacy.load("es_core_news_sm")
    except Exception:
        _nlp = None
except ImportError:  # pragma: no cover - spaCy opcional
    _nlp = None


def _extraer_nombres_fragmento(texto: str) -> List[str]:
    """Devuelve una lista de nombres detectados en el fragmento."""
    nombres: List[str] = []
    if _nlp:
        doc = _nlp(texto)
        nombres = [ent.text for ent in doc.ents if ent.label_ == "PER"]
    else:
        patron = re.compile(r"\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+")
        nombres = patron.findall(texto)
    # Elimino duplicados manteniendo el orden
    vistos = set()
    resultado = []
    for n in nombres:
        if n not in vistos:
            vistos.add(n)
            resultado.append(n.strip())
    return resultado


def detectar_nombres(archivo: str, ventana_palabras: int = 40) -> Dict[str, str]:
    """Analiza un archivo de transcripción y sugiere nombres.

    Parameters
    ----------
    archivo: str
        Ruta del archivo de transcripción.
    ventana_palabras: int, optional
        Cantidad de palabras a analizar después de cada marca de hablante.

    Returns
    -------
    Dict[str, str]
        Diccionario con claves del tipo ``HABLANTE_1`` y el nombre sugerido.
    """
    if not os.path.isfile(archivo):
        raise FileNotFoundError(archivo)

    with open(archivo, "r", encoding="utf-8") as f:
        texto = f.read()

    patron = re.compile(r"INTERVIENE HABLANTE ([^:]+):", re.IGNORECASE)
    coincidencias = list(patron.finditer(texto))
    sugerencias: Dict[str, str] = {}

    for i, match in enumerate(coincidencias):
        identificador = match.group(1).strip()
        if not identificador or "DESCONOCIDO" in identificador.upper():
            continue
        clave = f"HABLANTE_{identificador}"

        inicio = match.end()
        fin = coincidencias[i + 1].start() if i + 1 < len(coincidencias) else len(texto)
        fragmento = texto[inicio:fin]
        # Tomo sólo las primeras palabras para evitar textos muy largos
        palabras = fragmento.split()
        fragmento = " ".join(palabras[:ventana_palabras])

        nombres = _extraer_nombres_fragmento(fragmento)
        if nombres and clave not in sugerencias:
            sugerencias[clave] = nombres[0]

    return sugerencias


__all__ = ["detectar_nombres"]