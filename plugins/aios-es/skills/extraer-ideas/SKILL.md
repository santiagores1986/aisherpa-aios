---
name: extraer-ideas
description: Saca las mejores ideas de un pódcast, video, charla o artículo, y dice qué significan para el trabajo de la persona. USE WHEN extrae las ideas, qué tiene de bueno esto, ideas clave de este video, resúmeme este pódcast, vale la pena verlo, lo más importante de este artículo, analiza esta charla, extract wisdom.
argument-hint: "Un enlace, un archivo o el texto pegado"
---

# /aios-es:extraer-ideas

La idea es que se sienta como un amigo inteligente que vio la cosa y te la cuenta tomando un café:
lo que le sorprendió, lo que se robaría y lo que significa para ti. No un resumen escolar.

## 1 · Conseguir el contenido

- **Artículo o página web:** léelo de la web.
- **YouTube o un pódcast con página:** consigue la transcripción. Para YouTube, corre
  `yt-dlp --skip-download --write-auto-subs --sub-langs "es.*,en.*" --sub-format vtt -o "/tmp/aios-%(id)s" <url>`
  y lee el .vtt que escribe (ignora las líneas de tiempos). Si no hay transcripción, descarga el
  audio (`yt-dlp -x --audio-format mp3 -o "/tmp/aios-%(id)s.%(ext)s" <url>`) y transcríbelo como abajo.
- **Un archivo de audio o video** (una nota de voz, una grabación de Zoom, un episodio de pódcast):
  transcríbelo en el Mac. `ffmpeg -y -i <archivo> -ar 16000 -ac 1 /tmp/aios-audio.wav`, luego
  `whisper-cli -m ~/.cache/whisper-models/ggml-small.bin -l auto -otxt -of /tmp/aios-audio -f /tmp/aios-audio.wav`,
  y lee `/tmp/aios-audio.txt`. Una grabación larga se demora: dilo antes de empezar.
- **Un archivo de texto o texto pegado:** úsalo tal cual.

Si el contenido está detrás de un inicio de sesión o un muro de pago, dilo en una línea y pide el
texto.

## 2 · Leerlo todo y luego armar las secciones

Primero lee o mira todo. Luego decide qué hay de verdad ahí y arma de 3 a 7 secciones alrededor de
eso (por ejemplo «Cómo cobra», «En qué se equivocaron con la IA», «Hábitos para copiar»), no los
mismos títulos siempre. Bajo cada una, de 3 a 8 viñetas. Cada viñeta es una idea en una frase
completa y simple, con las palabras exactas de quien habla entre comillas cuando la forma de
decirlo es lo importante. Si el contenido está en inglés, escribe las notas en español y deja las
citas en el idioma original con su traducción.

Después, siempre tres cierres cortos:
- **En una frase:** la idea central.
- **Para tu trabajo:** de dos a cuatro líneas que la conecten con lo que la persona está haciendo
  (lee `contexto/usuario.md` y `contexto/prioridades.md`). Si nada conecta, dilo con honestidad.
- **¿Vale la pena?** Si vale la pena ver o leer todo, y qué minutos o qué parte si solo una parte.

Reglas: sin relleno («profundiza en», «resalta la importancia de»), sin inventar citas, sin
afirmar lo que el contenido no dice. Si algo es opinión de quien habla y no un hecho, di «sostiene
que», no «es».

## 3 · Guardarlo

Guárdalo como `trabajo/conocimiento/notas/AAAA-MM-DD-<titulo>.md` (crea la carpeta si hace falta),
o en `entradas/` del proyecto si se pidió para un proyecto. Si el contenido es material propio de un
cliente (su grabación, su documento), siempre va en el proyecto de ese cliente, nunca en el
conocimiento general. Muéstrale en el chat «En una frase» y
«Para tu trabajo», y di en una línea dónde quedaron las notas completas.
