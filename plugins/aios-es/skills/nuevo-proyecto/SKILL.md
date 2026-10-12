---
name: nuevo-proyecto
description: Crear un proyecto nuevo en su lugar, con brief y bitácora, y anotarlo en prioridades. USE WHEN nuevo proyecto, voy a empezar un encargo, tengo un proyecto nuevo, vamos a trabajar en algo nuevo, empecemos un proyecto, crea una carpeta para esto, quiero armar una propuesta, una tarea grande, un proyecto personal.
---

# /aios-es:nuevo-proyecto

La persona quiere empezar algo. Tu trabajo es ponerlo en su lugar y dejarlo listo para trabajar,
en menos de dos minutos. Tres preguntas, de a una, y solo si no las respondió ya al pedirlo:

1. ¿De qué se trata? Una frase basta.
2. ¿Es de trabajo, personal, o de otra área? Si no lo dice, asume trabajo cuando huele a trabajo.
3. ¿Qué decisión o entrega debe salir de esto, y para quién?

Luego, sin más preguntas y sin pedir permiso para ninguno de estos pasos:

- Elige el nombre de la carpeta: minúsculas, guiones, sin acentos, corto. Díselo: «lo llamo
  `venta-empresa-norte`, ¿te sirve?». Si prefiere otro, usa el suyo.
- Crea la carpeta en `<área>/proyectos/<nombre>/` (el área es `trabajo`, `personal` u
  `otras-areas/<área>`) con:
  - `brief.md`: objetivo, para quién, decisión o entrega que busca, fuentes conocidas, fecha
    límite si la dijo. Lo que no sepas queda como «pendiente», no lo inventes.
  - `bitacora.md`: título y una primera entrada con fecha: «Proyecto creado. Siguiente paso: …».
  - `entradas/`, `borradores/`, `entrega/`, vacías.
- Añade una línea en `contexto/prioridades.md`, en la sección «## Proyectos activos» (créala si
  no existe): `- <área>/proyectos/<nombre> · <una frase> · desde AAAA-MM-DD`.
- Cierra en una línea: dónde quedó y cuál es el primer paso. Nada más.

Los proyectos viven en `proyectos/`. Si la persona pide otro sitio, dile en una frase que aquí los
proyectos van en `proyectos/` y créalo ahí; si insiste, la convención se cambia en `AGENTS.md`.
