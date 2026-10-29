#!/usr/bin/env python3
"""Tests for the catch-up runner (catchup.py) and its place in the start hook.
Run: python3 -I tests/test_catchup.py   (no network: the items here are fakes that touch files in a temp folder)"""
import json, os, pathlib, subprocess, sys, tempfile, time, unittest

HOOKS = pathlib.Path(__file__).resolve().parent.parent / 'hooks'
PY = sys.executable


def item(tmp, iid='t1', check=None, fix=None, **kw):
    """A fake item: 'present' exists = check 0; fixes count their runs in fix-runs."""
    present = tmp / f'{iid}-present'
    runs = tmp / f'{iid}-fix-runs'
    it = {'id': iid, 'langs': ['es'], 'os': [sys.platform],
          'check': check or ['/bin/sh', '-c', f'[ -e "{present}" ] && exit 0 || exit 1'],
          'fix': fix or ['/bin/sh', '-c', f'echo x >> "{runs}"; touch "{present}"'],
          'msg': {'en': 'Added the thing.', 'es': 'Se agregó la cosa.'}}
    it.update(kw)
    return it, present, runs


class Runner(unittest.TestCase):
    def setUp(self):
        self.tmp = pathlib.Path(tempfile.mkdtemp())
        self.env = dict(os.environ, AIOS_CATCHUP_HOME=str(self.tmp / 'home'), AIOS_CATCHUP_LIST=str(self.tmp / 'list.json'))

    def write(self, *items):
        (self.tmp / 'list.json').write_text(json.dumps({'items': list(items)}))

    def run_(self, job='run', lang='es'):
        r = subprocess.run([PY, '-I', str(HOOKS / 'catchup.py'), job, lang], env=self.env, capture_output=True, text=True, timeout=60)
        return r.stdout.strip()

    def state(self):
        p = self.tmp / 'home' / 'catchup-state.json'
        return json.loads(p.read_text()) if p.exists() else {}

    def fix_runs(self, runs):
        return len(runs.read_text().splitlines()) if runs.exists() else 0

    def test_missing_then_fixed_once_recorded_reported_once(self):
        it, present, runs = item(self.tmp); self.write(it)
        self.run_()
        self.assertEqual(self.fix_runs(runs), 1)
        self.assertEqual(self.state()['t1']['status'], 'done')
        self.assertIn('Se agregó la cosa.', self.run_('report'))
        self.assertEqual(self.run_('report'), '')           # said once
        self.run_()
        self.assertEqual(self.fix_runs(runs), 1)              # never repeats

    def test_check_passes_nothing_happens(self):
        it, present, runs = item(self.tmp); present.touch(); self.write(it)
        self.run_()
        self.assertEqual(self.fix_runs(runs), 0)
        self.assertEqual(self.state()['t1']['status'], 'done')
        self.assertEqual(self.run_('report'), '')

    def test_fix_that_does_not_take_gives_up_after_three_with_one_notice(self):
        it, present, runs = item(self.tmp, fix=['/bin/sh', '-c', f'echo x >> "{self.tmp}/t1-fix-runs"']); self.write(it)
        for _ in range(3): self.run_()
        self.assertEqual(self.state()['t1']['status'], 'gave_up')
        self.assertEqual(self.state()['t1']['attempts'], 3)
        self.assertIn('3 intentos', self.run_('report'))
        self.assertEqual(self.run_('report'), '')
        self.run_()
        self.assertEqual(self.fix_runs(self.tmp / 't1-fix-runs'), 3)   # stopped retrying

    def test_check_failed_is_not_missing_no_fix(self):
        it, present, runs = item(self.tmp, check=['/bin/sh', '-c', 'exit 3']); self.write(it)
        self.run_()
        self.assertEqual(self.fix_runs(runs), 0)
        self.assertEqual(self.state()['t1']['last'], 'check failed')
        self.assertEqual(self.state()['t1']['attempts'], 1)

    def test_check_timeout_counts_as_check_failed(self):
        it, present, runs = item(self.tmp, check=['/bin/sh', '-c', 'sleep 5'], check_timeout=1); self.write(it)
        self.run_()
        self.assertEqual(self.fix_runs(runs), 0)
        self.assertEqual(self.state()['t1']['last'], 'check failed')

    def test_not_for_this_mac_is_skipped_and_not_counted(self):
        it, present, runs = item(self.tmp, check=['/bin/sh', '-c', 'exit 2']); self.write(it)
        self.run_()
        self.assertEqual(self.fix_runs(runs), 0)
        self.assertEqual(self.state(), {})

    def test_english_install_ignores_a_spanish_item(self):
        it, present, runs = item(self.tmp); self.write(it)
        self.run_(lang='en')
        self.assertEqual(self.fix_runs(runs), 0)
        self.assertEqual(self.state(), {})

    def test_lock_held_by_another_chat_runs_nothing(self):
        it, present, runs = item(self.tmp); self.write(it)
        (self.tmp / 'home').mkdir(); (self.tmp / 'home' / 'catchup.lock').write_text('123 x\n')
        self.run_()
        self.assertEqual(self.fix_runs(runs), 0)

    def test_stale_lock_is_cleared(self):
        it, present, runs = item(self.tmp); self.write(it)
        (self.tmp / 'home').mkdir(); lock = self.tmp / 'home' / 'catchup.lock'; lock.write_text('1 x\n')
        old = time.time() - 3600; os.utime(lock, (old, old))
        self.run_()
        self.assertEqual(self.fix_runs(runs), 1)

    def test_recheck_item_fixed_again_when_it_went_missing(self):
        it, present, runs = item(self.tmp, recheck=True); self.write(it)
        self.run_(); self.run_('report')
        self.run_()
        self.assertEqual(self.fix_runs(runs), 1)              # still there: check only
        present.unlink()
        self.run_()
        self.assertEqual(self.fix_runs(runs), 2)
        self.assertIn('Se agregó la cosa.', self.run_('report'))

    def test_only_the_shipped_list_runs(self):
        # The runner takes no command from its arguments or input: an extra argument is ignored
        it, present, runs = item(self.tmp); self.write(it)
        r = subprocess.run([PY, '-I', str(HOOKS / 'catchup.py'), 'run', 'es', 'touch', str(self.tmp / 'injected')],
                           env=self.env, capture_output=True, text=True, timeout=60)
        self.assertFalse((self.tmp / 'injected').exists())


class StartHook(unittest.TestCase):
    """The SessionStart hook prints the one line, and a slow fix reports at the next start."""
    def setUp(self):
        self.tmp = pathlib.Path(tempfile.mkdtemp())
        self.root = self.tmp / 'AIOS'; (self.root / '.aios').mkdir(parents=True)
        self.env = dict(os.environ, AIOS_CATCHUP_HOME=str(self.tmp / 'home'), AIOS_CATCHUP_LIST=str(self.tmp / 'list.json'),
                        CLAUDE_PROJECT_DIR=str(self.root))

    def hook(self):
        r = subprocess.run([PY, '-I', str(HOOKS / 'aios_hooks.py'), 'state', 'es'], env=self.env, input='{}',
                           capture_output=True, text=True, timeout=90)
        self.assertEqual(r.returncode, 0)
        return r.stdout

    def test_first_start_adds_and_says_it_second_start_silent(self):
        it, present, runs = item(self.tmp)
        (self.tmp / 'list.json').write_text(json.dumps({'items': [it]}))
        out1 = self.hook()
        self.assertIn('Puesta al día', out1)
        self.assertIn('Se agregó la cosa.', out1)
        self.assertNotIn('Puesta al día', self.hook())
        self.assertEqual(len(runs.read_text().splitlines()), 1)

    def test_slow_fix_runs_detached_and_reports_at_the_next_start(self):
        it, present, runs = item(self.tmp, fix=['/bin/sh', '-c', f'sleep 3; touch "{self.tmp}/t1-present"'])
        (self.tmp / 'list.json').write_text(json.dumps({'items': [it]}))
        self.env['AIOS_CATCHUP_WAIT'] = '0.5'
        self.assertNotIn('Puesta al día', self.hook())     # the hook did not wait for it
        self.assertNotIn('Puesta al día', self.hook())     # still running: the lock keeps a second runner out
        time.sleep(5)
        self.assertIn('Se agregó la cosa.', self.hook())

    def test_no_items_no_line(self):
        (self.tmp / 'list.json').write_text(json.dumps({'items': []}))
        self.assertNotIn('Puesta al día', self.hook())


if __name__ == '__main__':
    unittest.main(verbosity=2)
