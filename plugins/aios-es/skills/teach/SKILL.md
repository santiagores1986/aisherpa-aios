---
name: teach
description: Aprender un tema nuevo con un método simple: primero un texto base bien escrito, después las preguntas para el experto. USE WHEN teach, enséñame, quiero aprender sobre, explícame esta industria, explícame cómo funciona, necesito entender X antes de una reunión, no sé nada de este tema, prepárame para hablar con un experto.
argument-hint: "¿Qué quieres aprender?"
---

# /aios-es:teach

El método: admitir que no se sabe, leer un texto introductorio serio, y con esa base ir al
experto a preguntar lo que importa. Tu trabajo es producir ese texto y esas preguntas. Revisa en
`contexto/usuario.md` cómo prefiere aprender la persona; si no dice otra cosa, prefiere leer a
escuchar, así que nada de resúmenes en audio.

## Primera vez con un tema

1. Pregunta una sola cosa: ¿para qué lo necesita? (una reunión, un encargo, curiosidad). Eso
   define el nivel y el ángulo. Si ya lo dijo, no preguntes.
2. Decide dónde vive el tema: lo que sirve a su trabajo va en `trabajo/conocimiento/<tema>/`; algo
   personal va en `personal/conocimiento/<tema>/`. Crea la carpeta.
3. Escribe `base.md`: el texto introductorio, de una a tres páginas. Empieza por cómo funciona el
   asunto, con sus palabras clave explicadas en la misma frase, qué mueve el dinero (si aplica),
   quiénes son los actores, qué está cambiando. Concreto, con cifras solo cuando tengas fuente.
   Al final, «Lo que todavía no sé», tres líneas honestas.
4. Escribe `preguntas-para-el-experto.md`: entre cinco y diez preguntas que solo alguien de
   adentro puede responder bien, ordenadas de la más básica a la más fina. Son las que la persona
   llevará a la reunión.
5. Escribe `fuentes.md`: las fuentes que usaste o que debería leer, con una línea sobre por qué
   cada una. Si usaste búsqueda web, cita lo que leíste; si no, dilo.
6. Cierra en dos líneas: dónde quedó y por cuál archivo empezar.

## Volver a un tema

Lee lo que ya hay en la carpeta. Pregunta qué aprendió del experto o qué cambió. Añade a `base.md`
lo nuevo con fecha, y actualiza las preguntas: tacha las respondidas, añade las que surgieron.

## Forma

Los textos son para leerse de una vez, en pantalla o impresos. Títulos claros, párrafos cortos,
sin viñetas anidadas. Cuando un concepto lo permita, un ejemplo concreto antes de la definición.
Si la persona quiere el texto como página web para leerlo mejor, pídele que te lo diga y lo
armas como un archivo HTML que se abre en el navegador.
