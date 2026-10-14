---
name: no-funciona
description: Averiguar qué se rompió en este sistema de IA y arreglarlo, en palabras sencillas. Revisa la versión de Claude Code y sus actualizaciones recientes, los botones y paneles laterales (mods), la barra de estado, la configuración y las apps conectadas. USE WHEN no funciona, se rompió, esto no anda, desaparecieron los botones, la barra de estado ya no está, algo cambió, error, ayuda, dejó de funcionar, ya no sale el panel.
---

# No funciona

La persona que usa este sistema no tiene formación técnica. Notó que algo está mal. Tu trabajo: averiguar qué
se rompió, explicarlo en palabras sencillas y arreglarlo cuando el arreglo sea seguro. Haz tú las
revisiones; nunca le pidas que ejecute comandos.

## 1. Pregunta una sola cosa primero

«¿Qué notaste y cuándo fue la última vez que funcionó?». Una pregunta. Si ya lo dijo, sáltala.

## 2. Haz las revisiones

Haz cada revisión, anota lo que devuelve y sigue. No pares en el primer problema: varias cosas
pueden romperse juntas tras una actualización.

| Revisión | Cómo | Cómo se ve lo roto |
|---|---|---|
| Versión de Claude Code | `claude --version`; compárala con la versión anotada en `~/.aios/installed.json` si existe | Una versión más nueva que la instalada: hubo una actualización y pudo cambiar cómo funcionan los mods |
| Mods cargan | AIOS son varios plugins, que el instalador activa en `/Library/Application Support/ClaudeCode/managed-settings.json` (`enabledPlugins`), así que `claude plugin list` puede no mostrar ninguno: es normal. Compara esa lista con las carpetas de `~/.claude/plugins/cache/aisherpa/` y corre `claude plugin validate` en la versión más nueva de cada una. Los plugins: `aios-es` (rutinas, estado de la sesión, bitácoras, estilo de escritura), `aios-quickbar-es` (botones y la fila de Esfuerzo), `aios-keepwarm` (la fila de caché caliente), `aios-side-chat-es` (chat al lado), `aios-md-view` (franja y panel de documentos), `aios-chat-mode` (pasos de herramientas en una línea), `aios-secret-filter` (oculta contraseñas y claves), `aios-spanish-accents` (revisión de tildes), `aios-design` (skills de diseño). También `document-skills` del marketplace propio de Anthropic (`anthropic-agent-skills`, carpeta `~/.claude/plugins/cache/anthropic-agent-skills/`): Word, PowerPoint, Excel y PDF | Un plugin en la configuración sin carpeta en la caché; la validación falla o nombra un evento o una llamada que el motor rechaza |
| Plugin al día | `claude plugin marketplace update aisherpa` y lee el resultado | Error al actualizar (sin conexión, marketplace no encontrado) o una versión más nueva disponible que no está instalada |
| Mods dibujados | Pregunta si se ven los botones sobre donde se escribe (la barra rápida) | Todos los mods desaparecen a la vez con la validación en orden: los mods están apagados o cambiaron del lado de Anthropic |
| Barra de estado | `echo '{}' \| python3 ~/.aios/statusline.py` | Salida con error, o `python3` no encontrado |
| Configuración | Lee `.claude/settings.json` de la carpeta y `~/.claude/settings.json`; comprueba que sean JSON válido | Un archivo que no se puede leer, o una ruta de la barra de estado que no existe |
| Archivos en todo el Mac | `ls ~/Desktop ~/Documents ~/Downloads >/dev/null` | «Operation not permitted»: Warp no tiene Acceso total al disco. Guía a la persona por menú de Apple → Configuración del Sistema → Privacidad y seguridad → Acceso total al disco → activar Warp (o `open "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"`), y luego cerrar y abrir Warp otra vez |
| Apps conectadas | `claude mcp list` | Un conector marcado como fallido o que pide iniciar sesión |
| Internet y Anthropic | `curl -sIL https://status.anthropic.com` (la última línea de estado debe ser 200) | Sin respuesta: sin conexión, o Anthropic tiene una caída |

## 3. Explica

Tres partes cortas, en palabras sencillas:
1. **Qué se rompió**, en sus términos («los botones sobre donde escribes dejaron de aparecer»).
2. **Por qué**, si lo sabes («Claude Code se actualizó anoche y cambió cómo cargan los botones»).
   Di cuándo estás suponiendo.
3. **Qué sigue funcionando.** La carpeta, las reglas y los comandos funcionan sin botones ni
   paneles. Dilo, para que pueda seguir trabajando.

## 4. Arregla o pasa el caso

- **Arréglalo tú** cuando el arreglo sea pequeño y solo toque archivos propios de este sistema: un
  archivo de configuración con un error de escritura, una ruta de la barra de estado que se movió,
  un conector que necesita iniciar sesión otra vez (guíala en el inicio de sesión).
- **No edites el código de un mod.** Si un mod falla tras una actualización, necesita una versión
  nueva de AI Sherpa.
- **Pasa el caso** en lo que no arreglaste: escribe un mensaje corto que pueda enviarle a Santiago
  (santiago@aisherpa.me), listo para copiar, con qué se rompió, cuándo, la versión de Claude Code
  y las líneas exactas de error de tus revisiones. Nada más alrededor.

## Reglas

- Nunca borres archivos para «reiniciar» algo.
- Nunca apagues los permisos para que algo funcione.
- Si todo está en orden, dilo con claridad y pídele que te muestre el problema mientras ocurre.
