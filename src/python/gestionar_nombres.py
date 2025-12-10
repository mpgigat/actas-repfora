#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para gestionar nombres de hablantes de forma interactiva
"""

from __future__ import annotations

import os
import sys
from typing import Optional

from utilidades_nombres import cargar_json, guardar_json

def cargar_mapeo_global():
    """Carga el mapeo global de hablantes"""
    return cargar_json("mapeo_hablantes_global.json", {})

def cargar_nombres():
    """Carga los nombres personalizados"""
    return cargar_json("hablantes.json", {})

def cargar_sugerencias():
    """Carga sugerencias de nombres si existen"""
    return cargar_json("sugerencias.json", {})

def guardar_nombres(nombres):
    """Guarda los nombres personalizados"""
    return guardar_json("hablantes.json", nombres)

def mostrar_hablantes_detectados():
    """Muestra todos los hablantes que han sido detectados"""
    mapeo_global = cargar_mapeo_global()
    nombres = cargar_nombres()
    
    if not mapeo_global:
        print("No hay hablantes detectados aún. Ejecuta primero una transcripción.")
        return
    
    print("\nHABLANTES DETECTADOS:")
    print("=" * 50)
    
    # Obtener todos los hablantes globales únicos
    hablantes_globales = sorted(set(mapeo_global.values()), key=lambda x: int(x.split('_')[1]))
    
    for hablante_global in hablantes_globales:
        numero = hablante_global.split('_')[1]
        nombre_actual = nombres.get(hablante_global, f"HABLANTE {numero}")
        
        # Mostrar qué speakers locales mapean a este global
        speakers_locales = [k for k, v in mapeo_global.items() if v == hablante_global]
        
        print(f"\n{hablante_global} -> {nombre_actual}")
        print(f"   Detectado como: {', '.join(speakers_locales)}")

def asignar_nombres_interactivo(archivo_transcripcion: Optional[str] = None) -> None:
    """Permite asignar nombres de forma interactiva.

    Parameters
    ----------
    archivo_transcripcion : Optional[str], optional
        Ruta al archivo de transcripción. Si se especifica y no existe
        ``sugerencias.json``, se generarán sugerencias automáticamente.
    """
    mapeo_global = cargar_mapeo_global()
    nombres = cargar_nombres()
    sugerencias = cargar_sugerencias()

    if archivo_transcripcion and not sugerencias:
        try:
            from detectar_nombres import detectar_nombres
            sugerencias = detectar_nombres(archivo_transcripcion)
            guardar_json("sugerencias.json", sugerencias)
            if sugerencias:
                print("\n✓ Sugerencias generadas automáticamente")
        except Exception as e:  # pragma: no cover - detección es best-effort
            print(f"Error al generar sugerencias: {e}")

    if not mapeo_global:
        print("No hay hablantes detectados aún. Ejecuta primero una transcripción.")
        return
    
    print("\nASIGNAR NOMBRES A HABLANTES")
    print("=" * 50)
    print("Presiona Enter para mantener el nombre actual")
    print("Escribe 'salir' para terminar")
    
    # Obtener todos los hablantes globales únicos
    hablantes_globales = sorted(set(mapeo_global.values()), key=lambda x: int(x.split('_')[1]))
    
    cambios_realizados = False

    for hablante_global in hablantes_globales:
        numero = hablante_global.split('_')[1]
        nombre_actual = nombres.get(hablante_global, f"HABLANTE {numero}")
        sugerencia = sugerencias.get(hablante_global)
        
        # Mostrar contexto
        speakers_locales = [k for k, v in mapeo_global.items() if v == hablante_global]
        print(f"\n{hablante_global}")
        print(f"Detectado como: {', '.join(speakers_locales)}")
        print(f"Nombre actual: {nombre_actual}")

        if sugerencia:
            prompt = f"Nuevo nombre [{sugerencia}]: "
        else:
            prompt = "Nuevo nombre (Enter para mantener): "

        nuevo_nombre = input(prompt).strip()
        
        if nuevo_nombre.lower() == "salir":
            break
        elif nuevo_nombre:
            nombres[hablante_global] = nuevo_nombre
            cambios_realizados = True
            print(f"✓ {hablante_global} -> {nuevo_nombre}")
        elif sugerencia:
            nombres[hablante_global] = sugerencia
            cambios_realizados = True
            print(f"✓ {hablante_global} -> {sugerencia}")
    
    if cambios_realizados:
        if guardar_nombres(nombres):
            print("\n✓ Nombres guardados correctamente")
        else:
            print("\n✗ Error al guardar nombres")
    else:
        print("\nNo se realizaron cambios")

def mostrar_estadisticas():
    """Muestra estadísticas de los hablantes"""
    mapeo_global = cargar_mapeo_global()
    nombres = cargar_nombres()
    
    if not mapeo_global:
        print("No hay datos de hablantes disponibles")
        return
    
    print("\nESTADÍSTICAS DE HABLANTES")
    print("=" * 50)
    
    # Contar hablantes únicos
    hablantes_globales = set(mapeo_global.values())
    speakers_locales = set(mapeo_global.keys())
    
    print(f"Hablantes únicos detectados: {len(hablantes_globales)}")
    print(f"Total de detecciones locales: {len(speakers_locales)}")
    print(f"Hablantes con nombres personalizados: {len(nombres)}")
    
    # Mostrar distribución
    print("\nDistribución por hablante:")
    for hablante_global in sorted(hablantes_globales, key=lambda x: int(x.split('_')[1])):
        count = sum(1 for v in mapeo_global.values() if v == hablante_global)
        numero = hablante_global.split('_')[1]
        nombre = nombres.get(hablante_global, f"HABLANTE {numero}")
        print(f"  {nombre}: {count} detecciones")

def limpiar_mapeo():
    """Permite limpiar el mapeo global (CUIDADO)"""
    print("\n¡ADVERTENCIA!")
    print("Esto eliminará todo el mapeo de hablantes y empezará desde cero.")
    print("Solo hazlo si quieres resetear completamente el sistema.")
    
    confirmacion = input("\n¿Estás seguro? Escribe 'CONFIRMAR' para continuar: ")
    
    if confirmacion == "CONFIRMAR":
        try:
            if os.path.exists("mapeo_hablantes_global.json"):
                os.remove("mapeo_hablantes_global.json")
            if os.path.exists("hablantes.json"):
                os.remove("hablantes.json")
            print("✓ Mapeo eliminado. El próximo audio empezará con HABLANTE 1")
        except Exception as e:
            print(f"Error al eliminar archivos: {e}")
    else:
        print("Operación cancelada")

def main():
    archivo_transcripcion = sys.argv[1] if len(sys.argv) > 1 else None

    print("🎭 GESTOR DE NOMBRES DE HABLANTES")
    print("=" * 50)
    
    while True:
        print("\nOpciones disponibles:")
        print("1. Ver hablantes detectados")
        print("2. Asignar nombres a hablantes")
        print("3. Ver estadísticas")
        print("4. Limpiar mapeo (CUIDADO)")
        print("5. Salir")
        
        opcion = input("\nElige una opción (1-5): ").strip()
        
        if opcion == "1":
            mostrar_hablantes_detectados()
        elif opcion == "2":
            asignar_nombres_interactivo(archivo_transcripcion)
        elif opcion == "3":
            mostrar_estadisticas()
        elif opcion == "4":
            limpiar_mapeo()
        elif opcion == "5":
            print("¡Hasta luego!")
            break
    else:
        print("Opción no válida")


if __name__ == "__main__":
    main()