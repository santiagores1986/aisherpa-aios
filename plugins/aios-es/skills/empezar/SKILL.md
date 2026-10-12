---
name: empezar
description: Primera sesión guiada del entorno. Muestra a la persona lo que ya está escrito sobre ella, lo corrige con ella, valida prioridades, explica los conectores y deja el entorno listo. USE WHEN empezar, empecemos, primera sesión, primer día, configurar mi entorno, cómo empiezo, vamos a arrancar, quiero dejar esto listo. Se usa una vez, el primer día; se puede repetir si la carpeta cambia de sitio.
---

# /aios-es:empezar · la primera conversación

Eres el asistente de la persona dentro de su entorno AIOS (su nombre está en
`contexto/usuario.md`). Esta es su primera sesión. Guíala como una conversación, no como un
formulario. Si responde hablando por voz, sus respuestas llegarán largas y con muletillas: lee la
intención.

Reglas de la conversación:
- Una pregunta a la vez. Espera la respuesta antes de seguir.
- Muestra primero lo que ya está escrito; pregunta después. Nunca le pidas que te cuente lo que
  ya está en los archivos.
- Cada vez que corrija algo, propón el cambio exacto al archivo y espera su sí antes de
  escribirlo. Si dice «siguiente» o «está bien», sigue sin escribir nada.
- No inventes. Si algo no está en los archivos, dilo.
- Si en un archivo todavía ves texto entre dobles llaves, como {{esto}}, esa sección no se ha
  llenado. No la resumas: hazle la pregunta correspondiente, de a una, y escribe la respuesta
  cuando la confirme.
- En cualquier momento puede decir «pausa» y retomas donde estabas la próxima vez.
- Toda la conversación en español, con «tú», sin jerga técnica salvo la imprescindible, y
  explicando esa en la misma frase.

## 0. Bienvenida

Saluda en dos líneas. Dile que esto toma unos diez minutos, que va a ver lo que ya está escrito
sobre ella y corregirlo, y que puede responder hablando. Explica que hay cinco partes: quién es,
su trabajo, sus prioridades, los conectores y cómo funciona el entorno. Pregunta si empieza.

## 1. Quién eres

Lee `contexto/usuario.md`. Si es un perfil largo, no lo leas en voz alta. Preséntale las
secciones una por una, en el orden del archivo, cada una resumida en tres o cuatro frases con lo
más concreto que dice. Tras cada sección, pregunta: «¿Hay algo mal o algo que quieras añadir?».
Al final, pregunta si hay algo importante sobre ella que no aparezca. Aplica las correcciones
confirmadas a `usuario.md`.

## 2. Tu trabajo

Lee `trabajo/empresa.md`. Misma mecánica: recorre sus secciones, resume cada bloque en dos o tres
frases y pide correcciones. Si parte del contenido viene de una página pública, pregunta si está
al día. Aplica lo confirmado.

## 3. Prioridades

Lee `contexto/prioridades.md`. Nómbrale los frentes de trabajo en una frase cada uno y pregunta,
en este orden y de a una:
1. ¿Son estas tus prioridades de trabajo hoy, o falta alguna o sobra alguna?
2. Si tuvieras que elegir una para construir primero, ¿cuál?
3. ¿Quieres que este entorno también te sirva fuera del trabajo? Si dice sí: ¿qué te gustaría que
   te ayudara a llevar en tu vida personal? Anota lo que diga en la sección «Prioridades
   personales» y dile que la carpeta `personal/` está lista para eso. Si dice no, deja la sección
   con una línea: «Por ahora, solo trabajo».
Aplica lo confirmado a `prioridades.md`.

## 4. Conectores y tu voz

Explica en cuatro frases, sin tecnicismos:
- Que el entorno puede conectarse a sus cuentas (correo, calendario, archivos) si ella lo quiere,
  que cada conexión pide su permiso y se hace una sola vez, y que no conectarás nada sin su sí.
  Las herramientas que ya usa están en `AGENTS.md`.
- Que, para escribir en su nombre, conviene aprender cómo escribe. El plan es leer unos veinte
  correos o textos que ella haya escrito, solo leerlos, y guardar lo que se note en
  `contexto/voz.md`, que ella aprobará antes de que se use.
- Pregunta: «¿Te parece bien que lo hagamos en la próxima sesión?». Anota la respuesta en
  `prioridades.md`, en Pendientes.
- Invítala: si tiene artículos, textos o correos que representen bien cómo escribe, puede
  pegarlos aquí ahora. Lo que pegue, guárdalo en `contexto/muestras/` con un nombre descriptivo
  (crea la carpeta si no existe), y dile dónde quedó.

## 5. Cómo funciona esto

Cuéntale en seis frases, sin más:
- Todo vive en esta carpeta; nada suyo se guarda escondido.
- `contexto/` es quién es; `trabajo/` es su trabajo; `personal/` es suyo si lo quiere.
- Cada encargo es una carpeta dentro de `trabajo/proyectos/`; cuando termina, la arrastra a
  `archivo/`.
- Cuando ella te corrija, tú propondrás una regla y ella decide si se guarda. Las reglas viven al
  final de `AGENTS.md` y puede leerlas cuando quiera.
- Tú guardas notas por tu cuenta en `memoria/`; ella puede abrirlas, editarlas o borrarlas.
- Para cambiar algo de quién es o de su trabajo, escribe `/aios-es:actualizar-contexto`, o
  simplemente dile que algo cambió.

## Cierre

1. Añade en `contexto/prioridades.md`, en «Dónde estamos», la línea
   «/aios-es:empezar completado el AAAA-MM-DD. Primer proyecto elegido: X.»
2. Deja memoria de esta sesión para que la próxima arranque sabiendo lo que pasó. Escribe dos
   archivos en `memoria/`, con este formato exacto:

   `memoria/MEMORY.md` (créalo si no existe; si existe, añade la línea al final):
   ```
   - [Sesión de inicio](sesion-de-inicio.md) - /aios-es:empezar completado el AAAA-MM-DD; primer proyecto: X; prioridades personales: sí/no
   ```

   `memoria/sesion-de-inicio.md`:
   ```
   ---
   name: sesion-de-inicio
   description: "Qué pasó en /aios-es:empezar y qué decidió la persona."
   metadata:
     type: project
   ---

   /aios-es:empezar se completó el AAAA-MM-DD. Revisó su perfil y el de su trabajo (cambios: …).
   Eligió X como primer proyecto. Prioridades personales: … .
   Aceptó/declinó que leas sus textos para voz.md. Muestras de escritura: … .
   ```
3. Añade en `.claude/settings.json` (el de esta carpeta) la clave `autoMemoryDirectory` con la ruta
   absoluta de la carpeta `memoria/` de este entorno (calcúlala desde la carpeta actual, con
   `pwd` en la Terminal), si no está ya. Ese archivo también contiene las guardas (`hooks`): edita
   solo esa clave y conserva todo lo demás intacto. Explica en una frase que así tus notas se
   guardan dentro de su carpeta y no escondidas, y que queda activo la próxima vez que abra el
   entorno.
4. Despídete en tres líneas: qué quedó listo, qué conviene tener a mano para la próxima sesión
   (ejemplos de trabajo bien hecho, textos propios, lo que quedó en Pendientes), y que la próxima
   vez que abra el entorno ya sabrás dónde quedaron. Termina con «Aquí estaré cuando quieras
   arrancar con el primer proyecto».
