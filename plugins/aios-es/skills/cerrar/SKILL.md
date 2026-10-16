---
name: cerrar
description: "Cerrar la sesión de trabajo dejando rastro: bitácoras al día, prioridades actualizadas, reglas propuestas. USE WHEN cerrar, cerremos, hasta aquí, terminamos, ya acabé por hoy, dejemos esto aquí, me voy, termina la sesión, guarda dónde quedamos."
---

# /aios-es:cerrar

Es el final de la sesión. Deja el entorno de modo que la próxima sesión arranque sabiendo
exactamente dónde quedó todo. Escribe directamente los pasos 1, 2 y 4; solo el paso 3 pide el sí
de la persona. No narres cada paso: haz todo y entrega el resumen del paso 5.

1. **Bitácoras.** Para cada proyecto en el que se cambió algo en esta sesión, añade a su
   `bitacora.md` una entrada con fecha: qué se hizo, qué se decidió, qué sigue. Una entrada por
   proyecto, tres líneas como máximo. Si un proyecto no tiene bitácora, créala.
2. **Dónde estamos.** Actualiza la sección «Dónde estamos» de `contexto/prioridades.md`: la fecha
   de hoy, en qué quedó la sesión, y el siguiente paso acordado en una frase. Sustituye la
   entrada anterior; no acumules historial ahí, para eso están las bitácoras.
3. **Lo que aprendiste de la persona.** Si en la sesión te corrigió algo o expresó una
   preferencia, propón una línea para «Reglas aprendidas» en `AGENTS.md`, con el formato del
   archivo, y espera su sí. Si aprendiste algo estable sobre ella o sobre su trabajo, propón el
   cambio en `contexto/usuario.md` o `trabajo/empresa.md` y espera su sí. Si no hubo nada, dilo
   en una línea y sigue.
4. **Memoria.** Añade a `memoria/MEMORY.md` una línea con la fecha y el resumen de la sesión en
   diez palabras, apuntando a un archivo `memoria/sesion-AAAA-MM-DD.md` con el detalle en cinco
   líneas, en el formato que ya usa esa carpeta. Si `MEMORY.md` no existe, créalo. Si el archivo de
   hoy ya existe (una segunda sesión el mismo día), agrega una sección nueva con la hora al final;
   nunca reemplaces lo que hay. Si la sesión fue sobre material de un cliente, la nota de memoria
   solo nombra el proyecto y apunta a su `bitacora.md`; los detalles del cliente se quedan dentro
   del proyecto.
5. **Resumen.** Termina con tres líneas: qué quedó hecho, qué quedó pendiente, y qué conviene
   tener a mano la próxima vez.

Cada afirmación del resumen debe poder comprobarse abriendo un archivo. Si algo no quedó escrito,
no lo cuentes como hecho.
