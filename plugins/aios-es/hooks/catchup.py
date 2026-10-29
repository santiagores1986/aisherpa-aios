#!/usr/bin/env python3
"""AIOS catch-up list (AI Sherpa). Brings an installed Mac up to what today's installer gives a new one,
without a new installer: the plugins update themselves, this list travels with them.

  catchup.py run <en|es>      the runner: check each item, fix what is missing, re-check, record (detached)
  catchup.py report <en|es>   what the start hook tells the assistant: items added or given up, said once

Rules (Santiago, 2026-10-29; reviewers Astra and Sol, items 2 and 5):
- Only items in catchup.json, shipped inside this plugin, ever run. Nothing from chat, email or files.
- Deterministic: this script runs the check and the fix itself; the assistant only reports one line.
- Check exit codes: 0 = present, 1 = missing (run the fix), 2 = not for this Mac (skip, not counted);
  anything else, or a timeout, = the check failed (no fix, counted as an attempt).
- Done is recorded only after the re-check passes. Three failed attempts: one notice, then never again.
- An item with "recheck" is checked again at every start (fast, local) and fixed again only if missing.
- One runner at a time (a lock in ~/.aios), so two open chats never run the same fix.
- State: ~/.aios/catchup-state.json. No network unless a fix runs; no dependencies beyond Python."""
import json, os, pathlib, subprocess, sys, time, datetime

HERE = pathlib.Path(__file__).resolve().parent
HOME = pathlib.Path(os.environ.get('AIOS_CATCHUP_HOME') or (pathlib.Path.home() / '.aios'))  # override for tests only
LIST = pathlib.Path(os.environ.get('AIOS_CATCHUP_LIST') or (HERE / 'catchup.json'))
STATE = HOME / 'catchup-state.json'
LOCK = HOME / 'catchup.lock'
MAX_ATTEMPTS = 3
STALE_LOCK_S = 15 * 60

MSG = {
    'en': dict(added='Catch-up (for you, not the greeting): {msg} Tell the person in one plain line, after the greeting, and nothing more.',
               gave_up='Catch-up (for you, not the greeting): this could not be added after {n} tries: {msg} Tell the person in one plain line that it did not install and that Santiago can help; do not try it yourself.'),
    'es': dict(added='Puesta al día (para ti, no para el saludo): {msg} Díselo a la persona en una línea sencilla, después del saludo, y nada más.',
               gave_up='Puesta al día (para ti, no para el saludo): esto no se pudo agregar tras {n} intentos: {msg} Dile a la persona en una línea sencilla que no se instaló y que Santiago puede ayudar; no lo intentes tú.'),
}


def now():
    return datetime.datetime.now().isoformat(timespec='seconds')


def load_items():
    try:
        return json.loads(LIST.read_text(encoding='utf-8')).get('items', [])
    except Exception:
        return []


def applies(item, lang):
    return lang in item.get('langs', [lang]) and sys.platform in item.get('os', [sys.platform])


def load_state():
    try:
        return json.loads(STATE.read_text(encoding='utf-8'))
    except Exception:
        return {}


def save_state(st):
    HOME.mkdir(parents=True, exist_ok=True)
    tmp = STATE.with_suffix('.tmp')
    tmp.write_text(json.dumps(st, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    os.replace(tmp, STATE)


def pending(lang):
    """Items that need the runner: applicable and not given up; not done, or done with "recheck"
    (its fix can be undone later, e.g. a Homebrew upgrade drops data added inside tesseract's folder)."""
    st = load_state()
    out = []
    for i in load_items():
        status = st.get(i['id'], {}).get('status')
        if applies(i, lang) and status != 'gave_up' and (status != 'done' or i.get('recheck')):
            out.append(i)
    return out


def take_lock():
    HOME.mkdir(parents=True, exist_ok=True)
    try:
        if LOCK.exists() and time.time() - LOCK.stat().st_mtime > STALE_LOCK_S:
            LOCK.unlink()  # a runner that died; its fix gets checked again
        fd = os.open(LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, f'{os.getpid()} {now()}\n'.encode())
        os.close(fd)
        return True
    except FileExistsError:
        return False


def step(cmd, timeout):
    """Run one check or fix. Returns its exit code, or None when it could not run or ran out of time."""
    try:
        return subprocess.run(cmd, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                              timeout=timeout).returncode
    except Exception:
        return None


def run(lang):
    if not pending(lang) or not take_lock():
        return 0
    try:
        for item in pending(lang):
            st = load_state()
            rec = st.get(item['id'], {})
            check, fix = item['check'], item['fix']
            ct, ft = item.get('check_timeout', 10), item.get('fix_timeout', 300)
            code = step(check, ct)
            if code == 2:
                continue  # not for this Mac (the tool isn't installed): nothing to do, nothing counted
            if code == 0:
                if rec.get('status') != 'done':
                    rec.update(status='done', at=now(), added=False, reported=True)  # already there: say nothing
            elif code == 1:
                if rec.get('status') == 'done':
                    rec = {}  # it went missing again: a fresh item, fixed and reported once more
                step(fix, ft)
                if step(check, ct) == 0:
                    rec.update(status='done', at=now(), added=True, reported=False)
                else:
                    rec['attempts'] = rec.get('attempts', 0) + 1
                    rec.update(last='fix did not take', at=now())
            else:
                rec['attempts'] = rec.get('attempts', 0) + 1
                rec.update(last='check failed', at=now())
            if rec.get('status') != 'done' and rec.get('attempts', 0) >= MAX_ATTEMPTS:
                rec.update(status='gave_up', reported=False)
            st[item['id']] = rec
            save_state(st)
    finally:
        try:
            LOCK.unlink()
        except FileNotFoundError:
            pass
    return 0


def report(lang):
    """Lines for the assistant: each item added or given up, once."""
    st, lines = load_state(), []
    t = MSG.get(lang, MSG['en'])
    for item in load_items():
        rec = st.get(item['id'])
        if not rec or rec.get('reported', True):
            continue
        msg = item.get('msg', {}).get(lang) or item.get('msg', {}).get('en', item['id'])
        if rec.get('status') == 'done' and rec.get('added'):
            lines.append(t['added'].format(msg=msg))
        elif rec.get('status') == 'gave_up':
            lines.append(t['gave_up'].format(msg=msg, n=rec.get('attempts', MAX_ATTEMPTS)))
        rec['reported'] = True
    if lines:
        save_state(st)
    return lines


def start(lang, wait_s=float(os.environ.get('AIOS_CATCHUP_WAIT', 20))):  # the override is for tests only
    """For the start hook: lines owed from earlier runs, then a detached runner if anything is pending,
    waited on for up to wait_s seconds; a slower fix is reported at the next start."""
    lines = report(lang)
    if pending(lang) and not LOCK.exists():
        try:
            p = subprocess.Popen([sys.executable, str(pathlib.Path(__file__).resolve()), 'run', lang],
                                 stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                 start_new_session=True)
            try:
                p.wait(timeout=wait_s)
            except subprocess.TimeoutExpired:
                return lines  # still working: it reports at the next start
            lines += report(lang)
        except Exception:
            pass
    return lines


if __name__ == '__main__':
    job, lang = (sys.argv[1:3] + ['', 'en'])[:2]
    if job == 'run':
        sys.exit(run(lang))
    if job == 'report':
        print('\n'.join(report(lang)))
    sys.exit(0)
