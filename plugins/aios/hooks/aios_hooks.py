#!/usr/bin/env python3
"""AIOS hooks (AI Sherpa). One file, four jobs, chosen by the first argument:
  state    SessionStart: hand the AI where everything stands before its first word
  log      Stop: if a project changed after its log, send the AI back once to write the entry
  delete   PreToolUse(Bash): block folder and mass deletes
  place    PreToolUse(Write|Edit): keep every file inside the folder map
Second argument: language, en or es. The hooks act only inside an AIOS folder
(one with a .aios/ folder at its root); anywhere else they stay silent.
Deterministic: they read files and print. They decide nothing else."""
import json, os, re, sys, datetime, pathlib

L = {
 'en': dict(ctx='context', pri='priorities.md', where=r'Where we are|Active projects', areas=['work','personal'],
   proj='projects', archive='archive', logf='log.md', mem='memory/MEMORY.md', other='other-areas',
   subs=['knowledge','projects','outputs'], tops=['context','work','personal','other-areas','memory','.claude','.aios'],
   rootok=['AGENTS.md','CLAUDE.md','START-HERE.html','.mcp.json'],
   head='WHERE THINGS STAND (generated when the session opened, {t})', lastlog='## Last entry in each active project log',
   nolog='- (no project with a log yet)', memn='Memory: {n} memories in memory/MEMORY.md (already loaded).', mem0='Memory: empty so far.',
   greet='Greet with this state in two lines and ask where we pick up. Claim nothing that is not here or in the files.',
   logmsg='Before you finish: {p} changed and its log.md is older than those changes. Add one dated line: what was done and what was decided. If log.md does not exist, create it.',
   delmsg='Blocked: this system does not delete folders or delete in bulk. If a project is finished, move it to <area>/projects/archive/. If something must be deleted, tell the person what and why, and let them do it in Finder.',
   outside='Blocked: that file would land outside this folder. Everything lives inside it. Save it in work/projects/<project>/ or work/outputs/.',
   root='Blocked: only AGENTS.md, CLAUDE.md, START-HERE.html and .mcp.json go at the top of the folder. Work files go in work/projects/<project>/ (or work/outputs/ if they belong to no project).',
   top="Blocked: the folder '{f}' is not on the map. The areas are work/, personal/ and other-areas/; context goes in context/. If the person wants a new top folder, they create it and note it in AGENTS.md.",
   arearoot='Blocked: only the file that describes the area (.md) goes at the top of {a}. Work goes in {a}projects/<project>/, references in knowledge/, loose files in outputs/.',
   areasub="Blocked: '{f}' is not a place in {a}. A new project goes in {a}projects/<name>/ (use /aios:new-project); a reference in knowledge/; a loose file in outputs/.",
   name="Note: the project folder '{n}' doesn't follow the suggested convention (lowercase, hyphens, no accents). If the person named it that way on purpose, carry on; if you are creating it, use the convention."),
 'es': dict(ctx='contexto', pri='prioridades.md', where=r'Dónde estamos|Proyectos activos', areas=['trabajo','personal'],
   proj='proyectos', archive='archivo', logf='bitacora.md', mem='memoria/MEMORY.md', other='otras-areas',
   subs=['conocimiento','proyectos','salidas'], tops=['contexto','trabajo','personal','otras-areas','memoria','.claude','.aios'],
   rootok=['AGENTS.md','CLAUDE.md','EMPIEZA-AQUI.html','.mcp.json'],
   head='ESTADO DEL ENTORNO (generado al abrir la sesión, {t})', lastlog='## Última entrada de cada bitácora activa',
   nolog='- (ningún proyecto con bitácora todavía)', memn='Memoria automática: {n} recuerdos en memoria/MEMORY.md (ya cargados).', mem0='Memoria automática: vacía todavía.',
   greet='Saluda con este estado en dos líneas y pregunta por dónde seguimos. No afirmes nada que no esté aquí o en los archivos.',
   logmsg='Antes de cerrar: hubo cambios en {p} y su bitacora.md es más antigua que esos cambios. Añade una línea con fecha: qué se hizo y qué se decidió. Si bitacora.md no existe, créala.',
   delmsg='Bloqueado: este entorno no borra carpetas ni borra en masa. Si un proyecto terminó, muévelo a <área>/proyectos/archivo/. Si hay que borrar algo, dile a la persona qué y por qué, y que lo haga ella desde el Finder.',
   outside='Bloqueado: ese archivo quedaría fuera de esta carpeta. Todo vive dentro de ella. Guárdalo en trabajo/proyectos/<proyecto>/ o en trabajo/salidas/.',
   root='Bloqueado: en la raíz de la carpeta solo van AGENTS.md, CLAUDE.md, EMPIEZA-AQUI.html y .mcp.json. Un archivo de trabajo va en trabajo/proyectos/<proyecto>/ (o en trabajo/salidas/ si no pertenece a ningún proyecto).',
   top="Bloqueado: la carpeta '{f}' no existe en el mapa. Las áreas son trabajo/, personal/ y otras-areas/; el contexto va en contexto/. Si la persona quiere una carpeta nueva en la raíz, que la cree ella y la anote en AGENTS.md.",
   arearoot='Bloqueado: en la raíz de {a} solo va el archivo que describe el área (.md). El trabajo va en {a}proyectos/<proyecto>/, las referencias en conocimiento/, lo suelto en salidas/.',
   areasub="Bloqueado: '{f}' no es un lugar de {a}. Un proyecto nuevo va en {a}proyectos/<nombre>/ (usa /aios-es:nuevo-proyecto); una referencia en conocimiento/; un archivo suelto en salidas/.",
   name="Aviso: la carpeta de proyecto '{n}' no sigue la convención sugerida (minúsculas, guiones, sin acentos). Si la persona la nombró así a propósito, sigue; si la estás creando tú, usa la convención."),
}

def read_input():
    try:
        raw = sys.stdin.read()
        return json.loads(raw) if raw.strip() else {}
    except Exception:
        return {}

def aios_root(inp):
    root = os.environ.get('CLAUDE_PROJECT_DIR') or inp.get('cwd')
    if not root: return None
    root = pathlib.Path(root).resolve()
    return root if (root/'.aios').is_dir() else None

def projects(root, t):
    dirs = []
    for area in t['areas']:
        pr = root/area/t['proj']
        if pr.is_dir(): dirs += [(f'{area}/{t["proj"]}/{d.name}', d) for d in sorted(pr.iterdir()) if d.is_dir() and d.name != t['archive']]
    oa = root/t['other']
    if oa.is_dir():
        for a in sorted(oa.iterdir()):
            pr = a/t['proj']
            if pr.is_dir(): dirs += [(f'{t["other"]}/{a.name}/{t["proj"]}/{d.name}', d) for d in sorted(pr.iterdir()) if d.is_dir() and d.name != t['archive']]
    return dirs

def state(root, t, inp):
    out = [t['head'].format(t=datetime.datetime.now().strftime('%Y-%m-%d %H:%M'))]
    pri = root/t['ctx']/t['pri']
    if pri.is_file():
        grab = False
        for l in pri.read_text(encoding='utf-8').splitlines():
            if l.startswith('## '):
                grab = bool(re.search(t['where'], l))
                if grab: out += ['', l]
                continue
            if grab and l.strip(): out.append(l)
    out += ['', t['lastlog']]
    anyl = False
    for label, d in projects(root, t):
        lf = d/t['logf']
        if lf.is_file():
            last = [l for l in lf.read_text(encoding='utf-8').splitlines() if l.startswith('- ')]
            if last: out.append(f'- {label}: {last[-1][2:]}'); anyl = True
    if not anyl: out.append(t['nolog'])
    mem = root/t['mem']
    out.append('')
    if mem.is_file():
        n = sum(1 for l in mem.read_text(encoding='utf-8').splitlines() if l.startswith('- '))
        out.append(t['memn'].format(n=n))
    else: out.append(t['mem0'])
    out += ['', t['greet']]
    print('\n'.join(out))
    return 0

def log(root, t, inp):
    if inp.get('stop_hook_active'): return 0
    pending = []
    for label, d in projects(root, t):
        files = [f for f in d.rglob('*') if f.is_file() and f.name not in (t['logf'], '.keep', '.DS_Store')]
        if not files: continue
        newest = max(f.stat().st_mtime for f in files)
        lf = d/t['logf']
        lt = lf.stat().st_mtime if lf.is_file() else 0
        if newest > lt + 5: pending.append(label)
    if pending:
        sys.stderr.write(t['logmsg'].format(p=', '.join(pending)))
        return 2
    return 0

def deny(reason):
    print(json.dumps({'hookSpecificOutput': {'hookEventName': 'PreToolUse', 'permissionDecision': 'deny', 'permissionDecisionReason': reason}}, ensure_ascii=False))
    return 0

DELETE = [r'\brm\s+-[a-zA-Z]*[rR]', r'\brm\s+--recursive', r'\brmdir\b', r'\bfind\b[^|;]*-delete', r'\bgit\s+clean\s+-[a-zA-Z]*f',
          r'\brm\s+[^|;]*\*', r'\bdiskutil\s+erase', r'\bsrm\b']

# rm with two or more targets (rm a b), counted per command segment
MULTI_RM = re.compile(r'(?:^|[;&|(]\s*)rm\s+(?:-[a-zA-Z]+\s+)*(?:"[^"]*"|\'[^\']*\'|[^\s;&|>-][^\s;&|>]*)\s+(?:"[^"]*"|\'[^\']*\'|[^\s;&|>-][^\s;&|>]*)')
# where a shell command may write outside the folder: scratch places and Claude's own folders
SCRATCH = ('/tmp/', '/private/tmp/', '/dev/', '/var/folders/', '/private/var/folders/')
WRITE_TARGET = re.compile(r'(?:\d?>>?\s*|\btee\s+(?:-a\s+)?|\b(?:cp|mv|install)\s+(?:-[a-zA-Z]+\s+)*(?:"[^"]*"|\'[^\']*\'|\S+)\s+)("[^"]+"|\'[^\']+\'|[^\s;&|)]+)')

def outside(root, target):
    target = target.strip('"\'')
    if not target or target.startswith('&') or target.startswith('$('): return False
    full = pathlib.Path(os.path.expanduser(target.replace('$HOME', str(pathlib.Path.home()))))
    if not full.is_absolute(): return False          # relative paths stay inside the folder the session runs in
    s = str(full)
    if s.startswith(SCRATCH) or s in ('/dev/null',): return False
    try:
        full.resolve().relative_to(root); return False
    except ValueError: pass
    try:
        full.resolve().relative_to(pathlib.Path.home()/'.claude'); return False
    except ValueError: return True

def delete(root, t, inp):
    cmd = (inp.get('tool_input') or {}).get('command') or ''
    for p in DELETE:
        if re.search(p, cmd): return deny(t['delmsg'])
    if MULTI_RM.search(cmd): return deny(t['delmsg'])
    for m in WRITE_TARGET.finditer(cmd):
        if outside(root, m.group(1)): return deny(t['outside'])
    return 0

def place(root, t, inp):
    ti = inp.get('tool_input') or {}
    fp = ti.get('file_path') or ti.get('notebook_path')
    if not fp: return 0
    full = pathlib.Path(fp if os.path.isabs(fp) else root/fp).resolve()
    try: rel = full.relative_to(root)
    except ValueError:
        # Claude's own memory and plans live outside the folder; let those through.
        try:
            full.relative_to((pathlib.Path.home()/'.claude').resolve()); return 0
        except ValueError:
            return deny(t['outside'])
    parts = rel.parts
    if len(parts) == 1:
        return 0 if parts[0] in t['rootok'] else deny(t['root'])
    if parts[0].lower() not in t['tops']: return deny(t['top'].format(f=parts[0]))
    def area(sub, label):
        if len(sub) == 1:
            return None if sub[0].endswith('.md') else deny(t['arearoot'].format(a=label))
        if sub[0].lower() not in t['subs']: return deny(t['areasub'].format(f=sub[0], a=label))
        return None
    top = parts[0].lower()
    if top in t['areas']:
        r = area(parts[1:], parts[0] + '/')
        if r is not None: return r
    if top == t['other'] and len(parts) >= 3:
        r = area(parts[2:], f'{t["other"]}/{parts[1]}/')
        if r is not None: return r
    if len(parts) >= 3 and parts[1].lower() == t['proj'] and parts[2].lower() != t['archive']:
        if re.search(r'[\sA-ZÁÉÍÓÚÑáéíóúñ]', parts[2]):
            print(json.dumps({'hookSpecificOutput': {'hookEventName': 'PreToolUse', 'additionalContext': t['name'].format(n=parts[2])}}, ensure_ascii=False))
    return 0

def main():
    job = sys.argv[1] if len(sys.argv) > 1 else ''
    t = L.get(sys.argv[2] if len(sys.argv) > 2 else 'en', L['en'])
    inp = read_input()
    root = aios_root(inp)
    if root is None: return 0
    try:
        return {'state': state, 'log': log, 'delete': delete, 'place': place}[job](root, t, inp)
    except KeyError:
        return 0
    except Exception:
        return 0  # a broken hook must never block the person's work

if __name__ == '__main__':
    sys.exit(main())
