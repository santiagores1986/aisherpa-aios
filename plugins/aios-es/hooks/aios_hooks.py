#!/usr/bin/env python3
"""AIOS hooks (AI Sherpa). One file, two jobs, chosen by the first argument:
  state    SessionStart: hand the AI where everything stands before its first word
  log      Stop: if a project changed after its log, send the AI back once to write the entry
Second argument: language, en or es. The hooks act only inside an AIOS folder
(one with a .aios/ folder at its root); anywhere else they stay silent.
Deterministic: they read files and print. They decide nothing else."""
import json, os, re, sys, datetime, pathlib

L = {
 'en': dict(ctx='context', pri='priorities.md', where=r'Where we are|Active projects', areas=['work','personal'],
   proj='projects', archive='archive', logf='log.md', mem='memory/MEMORY.md', other='other-areas',
   head='WHERE THINGS STAND (generated when the session opened, {t})', lastlog='## Last entry in each active project log',
   nolog='- (no project with a log yet)', memn='Memory: {n} memories in memory/MEMORY.md (already loaded).', mem0='Memory: empty so far.',
   greet='Greet with this state in two lines and ask where we pick up. Claim nothing that is not here or in the files.',
   logmsg='Before you finish: {p} changed and its log.md is older than those changes. Add one dated line: what was done and what was decided. If log.md does not exist, create it.',),
 'es': dict(ctx='contexto', pri='prioridades.md', where=r'Dónde estamos|Proyectos activos', areas=['trabajo','personal'],
   proj='proyectos', archive='archivo', logf='bitacora.md', mem='memoria/MEMORY.md', other='otras-areas',
   head='ESTADO DEL ENTORNO (generado al abrir la sesión, {t})', lastlog='## Última entrada de cada bitácora activa',
   nolog='- (ningún proyecto con bitácora todavía)', memn='Memoria automática: {n} recuerdos en memoria/MEMORY.md (ya cargados).', mem0='Memoria automática: vacía todavía.',
   greet='Saluda con este estado en dos líneas y pregunta por dónde seguimos. No afirmes nada que no esté aquí o en los archivos.',
   logmsg='Antes de cerrar: hubo cambios en {p} y su bitacora.md es más antigua que esos cambios. Añade una línea con fecha: qué se hizo y qué se decidió. Si bitacora.md no existe, créala.',),
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

def main():
    job = sys.argv[1] if len(sys.argv) > 1 else ''
    t = L.get(sys.argv[2] if len(sys.argv) > 2 else 'en', L['en'])
    inp = read_input()
    root = aios_root(inp)
    if root is None: return 0
    try:
        return {'state': state, 'log': log}[job](root, t, inp)
    except KeyError:
        return 0
    except Exception:
        return 0  # a broken hook must never block the person's work

if __name__ == '__main__':
    sys.exit(main())
