// Pure logic of aios-spanish-accents: is this text clearly Spanish, and which common words in it lack their accent.
// No engine calls, so tests drive it directly.

export type Lang = 'en' | 'es'
export type Violation = { word: string; correct: string; line: number }

// Words that always need an accent (or ñ) when used in Spanish prose. Unaccented form -> correct form.
export const ACCENTS: Record<string, string> = {
  "inversion": "inversión",
  "evaluacion": "evaluación",
  "decision": "decisión",
  "atencion": "atención",
  "recomendacion": "recomendación",
  "informacion": "información",
  "documentacion": "documentación",
  "seccion": "sección",
  "funcion": "función",
  "posicion": "posición",
  "transaccion": "transacción",
  "seleccion": "selección",
  "investigacion": "investigación",
  "descripcion": "descripción",
  "presentacion": "presentación",
  "regulacion": "regulación",
  "proteccion": "protección",
  "leccion": "lección",
  "direccion": "dirección",
  "calibracion": "calibración",
  "iteracion": "iteración",
  "ejecucion": "ejecución",
  "operacion": "operación",
  "situacion": "situación",
  "institucion": "institución",
  "relacion": "relación",
  "construccion": "construcción",
  "comunicacion": "comunicación",
  "organizacion": "organización",
  "produccion": "producción",
  "configuracion": "configuración",
  "implementacion": "implementación",
  "integracion": "integración",
  "aplicacion": "aplicación",
  "explicacion": "explicación",
  "participacion": "participación",
  "negociacion": "negociación",
  "adquisicion": "adquisición",
  "motivacion": "motivación",
  "educacion": "educación",
  "innovacion": "innovación",
  "creacion": "creación",
  "simulacion": "simulación",
  "vision": "visión",
  "reunion": "reunión",
  "comision": "comisión",
  "oracion": "oración",
  "religion": "religión",
  "region": "región",
  "filosofia": "filosofía",
  "asesoria": "asesoría",
  "logistica": "logística",
  "hoteleria": "hotelería",
  "auditoria": "auditoría",
  "categoria": "categoría",
  "energia": "energía",
  "tecnologia": "tecnología",
  "metodologia": "metodología",
  "economia": "economía",
  "garantia": "garantía",
  "compania": "compañía",
  "suenos": "sueños",
  "diseno": "diseño",
  "disenado": "diseñado",
  "disenada": "diseñada",
  "tamano": "tamaño",
  "espanol": "español",
  "ensenanza": "enseñanza",
  "companero": "compañero",
  "companera": "compañera",
  "companeros": "compañeros",
  "empeno": "empeño",
  "pequeno": "pequeño",
  "pequena": "pequeña",
  "nino": "niño",
  "nina": "niña",
  "ninos": "niños",
  "ano": "año",
  "anos": "años",
  "portugues": "portugués",
  "interes": "interés",
  "frances": "francés",
  "ingles": "inglés",
  "despues": "después",
  "traves": "través",
  "reves": "revés",
  "analisis": "análisis",
  "numero": "número",
  "numeros": "números",
  "comite": "comité",
  "credito": "crédito",
  "dinamico": "dinámico",
  "dinamica": "dinámica",
  "especifico": "específico",
  "especifica": "específica",
  "generico": "genérico",
  "generica": "genérica",
  "sistematico": "sistemático",
  "sistematica": "sistemática",
  "automatico": "automático",
  "automatica": "automática",
  "minimo": "mínimo",
  "minima": "mínima",
  "maximo": "máximo",
  "maxima": "máxima",
  "optimo": "óptimo",
  "optima": "óptima",
  "logica": "lógica",
  "practica": "práctica",
  "practico": "práctico",
  "estrategica": "estratégica",
  "estrategico": "estratégico",
  "angulo": "ángulo",
  "solidos": "sólidos",
  "solido": "sólido",
  "util": "útil",
  "facil": "fácil",
  "dificil": "difícil",
  "agil": "ágil",
  "movil": "móvil",
  "debil": "débil",
  "habil": "hábil",
  "rapido": "rápido",
  "rapida": "rápida",
  "publico": "público",
  "publica": "pública",
  "unico": "único",
  "unica": "única",
  "basico": "básico",
  "basica": "básica",
  "tecnico": "técnico",
  "tecnica": "técnica",
  "critico": "crítico",
  "critica": "crítica",
  "historico": "histórico",
  "historica": "histórica",
  "biologico": "biológico",
  "psicologico": "psicológico",
  "psicologicos": "psicológicos",
  "periodico": "periódico",
  "psicologia": "psicología",
  "biologia": "biología",
  "fisica": "física",
  "matematicas": "matemáticas",
  "quimica": "química",
  "convirtio": "convirtió",
  "adquirio": "adquirió",
  "empezo": "empezó",
  "vendio": "vendió",
  "recompro": "recompró",
  "transformo": "transformó",
  "eligio": "eligió",
  "evaluo": "evaluó",
  "acerto": "acertó",
  "identifico": "identificó",
  "mostro": "mostró",
  "encontro": "encontró",
  "resulto": "resultó",
  "funciono": "funcionó",
  "podria": "podría",
  "seria": "sería",
  "serian": "serían",
  "dejaria": "dejaría",
  "haria": "haría",
  "tendria": "tendría",
  "deberia": "debería",
  "podra": "podrá",
  "sera": "será",
  "estara": "estará",
  "habra": "habrá",
  "habiamos": "habíamos",
  "teniamos": "teníamos",
  "podiamos": "podíamos",
  "evaluarian": "evaluarían",
  "harian": "harían",
  "tendrian": "tendrían",
  "todavia": "todavía",
  "tambien": "también",
  "simultaneamente": "simultáneamente",
  "sistematicamente": "sistemáticamente",
  "automaticamente": "automáticamente",
  "especificamente": "específicamente",
  "rapidamente": "rápidamente",
  "facilmente": "fácilmente",
  "Peru": "Perú",
  "America": "América",
  "Mexico": "México",
  "pagina": "página",
  "codigo": "código",
  "metodo": "método",
  "periodo": "período",
  "articulo": "artículo",
  "capitulo": "capítulo",
  "vehiculo": "vehículo",
  "calculo": "cálculo",
  "proposito": "propósito",
  "exito": "éxito",
  "limite": "límite",
  "regimen": "régimen",
  "caracter": "carácter",
  "deficit": "déficit",
  "superavit": "superávit",
  "indice": "índice",
  "grafico": "gráfico",
  "grafica": "gráfica",
  "telefono": "teléfono",}

// Clearly Spanish: at least 40 words and at least 4 common Spanish function words
const HINT = /\b(que|para|con|los|las|una|por|del|este|esta|como|también|pero|porque|sobre)\b/gi
export const MIN_WORDS = 40
export const MIN_HINTS = 4

export function isClearlySpanish(text: string): boolean {
  return text.split(/\s+/).filter(Boolean).length >= MIN_WORDS && (text.match(HINT) ?? []).length >= MIN_HINTS
}

// A line is only checked when it reads as Spanish itself, after stripping code spans, URLs, paths and filenames,
// so English lines in a mixed document are never flagged ("decision", "Mexico").
const LINE_HINT = /\b(que|como|donde|esta|para|pero|tiene|hace|puede|cada|todo|esto|cuando|entre|sobre|desde|hasta|hacia|siendo|fueron|tienen|porque|también|después|según)\b/i
const ACCENTED = /[áéíóúñüÁÉÍÓÚÑÜ¿¡]/

function cleanLine(line: string): string {
  return line
    .replace(/`[^`]*`/g, ' ') // inline code spans
    .replace(/\]\([^)]*\)/g, ']') // markdown link targets
    .replace(/https?:\/\/\S+/g, ' ') // URLs
    .replace(/\S*[\/\\]\S*/g, ' ') // file paths
    .replace(/\S+\.(md|ts|js|mjs|tsx|html|json|pdf|png|jpg|txt|yaml|yml|typ|csv)\b/gi, ' ') // filenames
}

const lineReadsSpanish = (cleaned: string) => LINE_HINT.test(cleaned) || ACCENTED.test(cleaned)

const RULES = Object.entries(ACCENTS).map(([wrong, right]) => ({
  wrong, right,
  // Unicode-aware boundaries: plain \b treats accented letters as non-word, so "Travesías" would match "traves"
  re: new RegExp(`(?<![\\p{L}\\p{N}_])${wrong}(?![\\p{L}\\p{N}_])`, 'giu'),
}))

/** Every unaccented common Spanish word in the Spanish lines of the text. */
export function findMissingAccents(text: string): Violation[] {
  const found: Violation[] = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trimStart()
    if (t.startsWith('//') || t.startsWith('#let ') || t.startsWith('#set ') || t.startsWith('#import ')) continue
    const line = cleanLine(lines[i])
    if (!lineReadsSpanish(line)) continue
    for (const { right, re } of RULES) {
      re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(line)) !== null) {
        const before = line.slice(Math.max(0, m.index - 5), m.index)
        if (before.includes('#') || before.includes('(') || before.endsWith('-')) continue
        const capital = m[0][0] !== m[0][0].toLowerCase()
        found.push({ word: m[0], correct: capital ? right[0].toUpperCase() + right.slice(1) : right, line: i + 1 })
      }
    }
  }
  return found
}

const WORDS = {
  en: (n: number) => `nothing was written: ${n} Spanish word${n === 1 ? '' : 's'} missing an accent.`,
  es: (n: number) => `no se escribió nada: ${n} palabra${n === 1 ? '' : 's'} en español sin tilde.`,
}

/** The refusal sent to the AI, in the person's language. */
export function refusal(found: Violation[], lang: Lang): string {
  const unique = new Map<string, string>()
  for (const v of found) unique.set(v.word.toLowerCase(), v.correct)
  const list = [...unique].map(([w, r]) => `${w} → ${r}`).join(', ')
  const n = found.length
  return lang === 'es'
    ? `aios-spanish-accents: ${WORDS.es(n)} ${list}. Corrige todas las tildes (á, é, í, ó, ú, ñ, ü) y vuelve a escribir.`
    : `aios-spanish-accents: ${WORDS.en(n)} ${list}. Fix every accent (á, é, í, ó, ú, ñ, ü) and write again.`
}
