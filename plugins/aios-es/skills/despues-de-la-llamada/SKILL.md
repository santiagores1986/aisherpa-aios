---
name: despues-de-la-llamada
description: Después de una reunión o llamada, convierte la transcripción en lo que importa (decisiones, quién hace qué, preguntas abiertas y un borrador de seguimiento) y lo guarda en el proyecto correcto. La primera vez se configura con lo que la persona use para grabar sus reuniones. USE WHEN después de la llamada, acabo de salir de una reunión, acabo de tener una llamada, procesa mi reunión, aquí está la transcripción, qué decidimos, correo de seguimiento de esta reunión, post-call, after the call.
argument-hint: "¿Qué llamada? (o pega la transcripción)"
---

# /aios-es:despues-de-la-llamada

Una llamada solo cuenta cuando lo que se decidió queda escrito donde vive el trabajo. Esta skill
hace eso en un paso, y la primera vez aprende cómo se graban las reuniones de esta persona.

## La primera vez: configurarla (solo si no existe `contexto/despues-de-la-llamada.md`)

Di en una línea que vas a dejar esto listo una sola vez, y pregunta de a una:

1. «¿Con qué grabas o tomas notas en tus reuniones?». Respuestas típicas: Fathom, Granola, las notas
   con IA de Notion, la transcripción de Zoom o de Google Meet, Otter, el celular, o nada.
2. Busca la forma más simple de traer la transcripción hasta aquí, y pruébala con la persona ahora,
   con una reunión real reciente:
   - Si ese servicio ya está conectado a Claude (revisa los conectores que tienes disponibles),
     lee la reunión desde ahí. Si se puede conectar y no lo está, explica en una frase qué
     significa conectarlo (Claude puede leer sus notas de reuniones; pide permiso una vez) y
     pregunta si quiere; la conexión la hace la persona en la configuración de Claude, tú nunca
     manejas sus contraseñas.
   - Si no hay conexión, acuerden el camino manual: copia la transcripción desde la app y la pega
     aquí, o guarda el archivo en la carpeta `entradas/` del proyecto. Muéstrale los pasos exactos
     para su app, cortos. Si solo tiene el audio o el video, lo guarda en `entradas/` y tú lo
     transcribes en el Mac: `ffmpeg -y -i <archivo> -ar 16000 -ac 1 /tmp/aios-audio.wav`, luego
     `whisper-cli -m ~/.cache/whisper-models/ggml-small.bin -l auto -otxt -of /tmp/aios-audio -f /tmp/aios-audio.wav`.
   - Si no graba nada, el camino es: apenas termina la llamada, habla dos minutos sobre lo que pasó
     (con dictado sirve) y tú trabajas con eso.
3. Pregunta qué quiere recibir después de cada llamada, ofreciendo lo de abajo como opción, y qué
   partes no necesita.
4. Escribe `contexto/despues-de-la-llamada.md` con lo acordado, después de su sí: la fuente, los
   pasos exactos para traer una transcripción, qué quiere recibir y qué saltarse. Esa página son tus
   instrucciones desde ahora; dile que puede cambiarlas con solo decírtelo.

Luego procesa la reunión que usaron para la prueba, como se explica abajo.

## Cada vez

Lee `contexto/despues-de-la-llamada.md` y síguelo. Trae la transcripción como dice ahí. Si la
persona no nombró ninguna reunión, toma la más reciente y di cuál tomaste.

Busca a qué proyecto pertenece (en `contexto/prioridades.md` y en las carpetas de proyectos). Si no
está claro, pregunta; si no pertenece a ningún proyecto, usa `trabajo/salidas/`.

Escribe un archivo en la carpeta `entradas/` de ese proyecto, `AAAA-MM-DD-llamada-<con-quien-o-tema>.md`,
con esta forma, salvo que su página diga otra cosa:

- **En una línea:** para qué era la llamada y cómo terminó.
- **Decisiones:** qué se decidió, cada una en una línea, con quién lo decidió.
- **Quién hace qué:** cada tarea con un responsable y una fecha si se dijo. Marca claramente las
  tareas de la persona.
- **Preguntas abiertas:** lo que quedó sin resolver.
- **Lo que vale la pena guardar:** algo dicho que cambia el proyecto, un riesgo o una buena idea.
  Cita las palabras exactas cuando importen.
- **Borrador de seguimiento:** un correo o mensaje corto para los demás, con la voz de la persona
  (`contexto/voz.md` si ya está aprobado; si no, simple y cálido). Es un borrador: nunca lo envíes.

Añade una línea con fecha en la `bitacora.md` del proyecto. Si una decisión cambia sus prioridades
o el siguiente paso del proyecto, propón el cambio y espera su sí.

Cierra en tres líneas: dónde quedaron las notas, las próximas acciones de la persona y que el
borrador de seguimiento está listo para que lo envíe.

## Reglas

- Nunca inventes quién dijo qué. Si la transcripción no lo deja claro, dilo.
- No supongas el género de nadie que aparezca en la reunión: usa su nombre.
- El material de clientes o de terceros se queda dentro de su proyecto. Sigue las reglas de
  confidencialidad de `AGENTS.md` antes de leer cualquier sistema de un cliente.
- Nunca envíes nada. Solo borradores.
