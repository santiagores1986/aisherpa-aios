---
name: extraer-proceso
description: Convertir lo que la persona cuenta de un proceso, hablado y desordenado, en un procedimiento escrito con pasos, responsables y excepciones. USE WHEN extraer proceso, te cuento cómo hacemos X, esto es lo que hago cada vez que, saquemos el proceso de, déjame explicarte cómo funciona, documentemos este proceso, o cuando narra un flujo de trabajo por voz.
argument-hint: "¿Qué proceso me vas a contar?"
---

# /aios-es:extraer-proceso

La persona va a contarte cómo hace algo que se repite: armar una propuesta, cerrar los pendientes
de una reunión, preparar un informe mensual. Lo cuenta hablando, de principio a fin, con desvíos.
Tu trabajo es devolverle un procedimiento limpio que pueda leer, corregir y, más adelante,
automatizar en parte.

## Cómo se hace

1. Escucha todo. No interrumpas la narración con preguntas; déjala llegar al final.
2. Devuélvele una primera versión ordenada, fiel a lo que contó: dónde empieza, qué pasos siguen,
   quién hace cada uno, qué herramientas toca, cómo sabe que quedó bien. Marca con «pendiente» lo
   que no dijo; no lo rellenes.
3. Pregunta de a una, y solo lo que cambia el procedimiento: las excepciones («¿y cuando el
   cliente no manda los documentos a tiempo?»), las decisiones que hoy solo ella puede tomar, y
   cómo reconoce un buen resultado.
4. Escribe el procedimiento final en `<área>/conocimiento/procesos/<nombre>.md` (casi siempre
   `trabajo/`; crea la carpeta `procesos/` si no existe) con esta forma: qué lo dispara, qué
   entra, los pasos con su responsable, qué sale, las excepciones y qué se hace en cada una, y el
   punto donde alguien revisa. Corto; un proceso cabe en una página.
5. Cierra con dos cosas en cuatro líneas: qué parte del proceso podría hacer la IA mañana sin
   riesgo (un borrador, una búsqueda, un recordatorio) y qué parte debe seguir en manos de la
   persona. Si un paso se repite en varios procesos, dilo: es candidato a comando.

## Voz

Escribe el procedimiento con los verbos y los nombres que la persona usó. Si dice «el resumen
semanal», el archivo dice «el resumen semanal». Nada de lenguaje de manual de calidad.
