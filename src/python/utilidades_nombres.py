from __future__ import annotations

import json
from typing import Any, Optional


def cargar_json(path: str, default: Optional[Any] = None) -> Any:
    """Carga el contenido JSON de ``path``.

    Si el archivo no existe o contiene datos no válidos, se devuelve
    ``default``.

    Parameters
    ----------
    path:
        Ruta del archivo JSON a leer.
    default:
        Valor a devolver en caso de error.

    Returns
    -------
    Any
        Datos del archivo o ``default`` si ocurrió algún problema.
    """
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def guardar_json(path: str, data: Any) -> bool:
    """Guarda ``data`` como JSON en ``path``.

    Parameters
    ----------
    path:
        Archivo de salida.
    data:
        Datos serializables a JSON.

    Returns
    -------
    bool
        ``True`` si se guardó correctamente, ``False`` en caso de error.
    """
    try:
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2, ensure_ascii=False)
        return True
    except Exception:
        return False