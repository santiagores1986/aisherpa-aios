---
name: investigar
description: Investigar un tema con la técnica de triangulación: un buen prompt de investigación, la misma pregunta en dos modelos, y una comparación de señal, complemento y contradicción. USE WHEN investigar, investiga, necesito entender bien este sector, esta empresa o esta pregunta, hazme la investigación, averigua todo sobre, quiero saber si es cierto que.
argument-hint: "¿Qué quieres investigar y para qué?"
---

# /aios-es:investigar

La técnica es esta: una investigación rigurosa no se cree a un solo modelo. Se escribe la
pregunta bien, se hace en dos lugares, y se comparan.

## Paso 1 · El prompt

Si el objetivo no está claro, una sola pregunta: ¿para qué va a usar lo que encuentre? Luego
escribe el prompt de investigación con esta forma, en español:

- **Objetivo:** un párrafo con qué queremos saber, por qué, y cómo se usará.
- **Tipo:** exploratoria (mapear un terreno), comparativa (elegir entre opciones), de método
  (cómo se hace bien algo), o de verificación (¿es cierto esto?).
- **Preguntas centrales:** de tres a siete, cada una respondible por sí sola.
- **Fuentes:** primarias antes que comentario; de los últimos doce meses si el tema cambia rápido;
  al menos dos voces escépticas; cifras con fuente; marcar lo que solo aparece en una fuente.
- **Formato de respuesta:** resumen ejecutivo; hallazgos por pregunta con fuentes; patrones;
  sorpresas; confianza por pregunta (alta, media, baja); lista de fuentes con enlace; preguntas
  abiertas.
- **Contexto:** lo que la persona ya sabe y el ángulo que le interesa. Toma el ángulo de su
  trabajo de `trabajo/empresa.md`: quién compra, quién vende, cómo se gana dinero en ese mundo y
  qué lo mueve.

Guárdalo en el proyecto (`borradores/investigacion-<tema>-prompt.md`) o, sin proyecto, en
`trabajo/salidas/` (o `personal/salidas/` si el tema es personal). Dile en una línea dónde quedó.

## Paso 2 · Dos corridas

Corre tú el prompt aquí, con búsqueda web, y guarda tu informe como `...-informe-claude.md`. Luego
pídele a la persona que pegue el mismo prompt en otro asistente de IA (ChatGPT, Gemini, el que
tenga a mano) y te traiga la respuesta: pegada aquí o guardada en `entradas/`. Si solo hay un
informe, dilo y espera; no triangules con uno solo.

## Paso 3 · Triangulación

Con los dos informes, tres cubos:
- **Señal:** lo que ambos encontraron por separado. Alta confianza, más aún si llegaron por
  fuentes distintas.
- **Complemento:** lo que solo uno trajo y no contradice al otro. Di cuál lo trajo, y marca lo que
  huela a invento: afirmaciones extraordinarias sin fuente verificable.
- **Contradicción:** donde se oponen. Aquí está el trabajo: di quién tiene mejor fuente, o qué
  hace falta verificar.

Escribe `...-triangulado.md`: la respuesta a cada pregunta central con su nivel de confianza, las
sorpresas, lo que queda abierto, y las fuentes que vale la pena leer. Cierra con lo que la
persona debería hacer con esto, en dos líneas.
