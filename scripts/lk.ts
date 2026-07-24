/**
 * `lk` — the single entrypoint for every verb (lk-00-overview "Principles",
 * "Where things live"). Routes to `scripts/lk/cmd-<verb>.ts`; this file only
 * routes — packages B and C implement their verbs by replacing their own
 * stub files, never this dispatcher.
 *
 *     npm run lk -- <verb> [args...]      (body, where a verb takes one, via stdin)
 *
 * Workspace root: `LEKTORAT_WORKSPACE` env var, default `<cwd>/workspace`.
 * Output discipline (lk-00-overview): one line to stdout on success (exit
 * 0); on failure, `lk <verb>: <reason>` to stderr (exit 1), nothing on
 * stdout, no partial writes.
 */
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { cmdRead } from './lk/cmd-read';
import { cmdEdit } from './lk/cmd-edit';
import { cmdAgenda } from './lk/cmd-agenda';
import { cmdOrient } from './lk/cmd-orient';
import { runCheck } from './lk/cmd-check';
import { cmdCommit } from './lk/cmd-commit';
import { cmdReply } from './lk/cmd-reply';
import { cmdComment } from './lk/cmd-comment';
import { cmdResolve } from './lk/cmd-resolve';

type CmdFn = (ws: string, positional: string[], stdin: string) => Promise<string>;

const VERBS: Record<string, { fn: CmdFn; usage: string; needsStdin: boolean }> = {
  read: { fn: cmdRead, usage: 'read <doc> [section]', needsStdin: false },
  edit: { fn: cmdEdit, usage: 'edit <doc>@<ref>            (ops on stdin)', needsStdin: true },
  agenda: { fn: cmdAgenda, usage: 'agenda', needsStdin: false },
  orient: { fn: cmdOrient, usage: 'orient', needsStdin: false },
  commit: { fn: cmdCommit, usage: 'commit -m "<subject>"', needsStdin: false },
  reply: { fn: cmdReply, usage: 'reply <thread>               (body on stdin)', needsStdin: true },
  comment: { fn: cmdComment, usage: 'comment "<span>" [--doc <doc>] [--block <doc>@<ref>:<n>]  (body on stdin)', needsStdin: true },
  resolve: { fn: cmdResolve, usage: 'resolve <thread> [--note "<text>"]', needsStdin: false },
};

// `check` has its own output contract (issues print to stdout even on
// failure; see cmd-check.ts) — special-cased below rather than forced into
// the shared CmdFn shape. Listed here only so --help still names it.
const CHECK_USAGE = 'check';

function printHelp(): void {
  console.log('usage: lk <verb> [args...]');
  console.log(`  lk ${CHECK_USAGE}`);
  for (const { usage } of Object.values(VERBS)) console.log(`  lk ${usage}`);
}

/** Blocking stdin read (fd 0) — see scripts/thread.ts for why synchronous matters here. */
function readStdin(): string {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

async function main(): Promise<void> {
  const [verb, ...rest] = process.argv.slice(2);
  const ws = process.env.LEKTORAT_WORKSPACE ?? join(process.cwd(), 'workspace');

  if (!verb || verb === '--help' || verb === '-h') {
    printHelp();
    process.exit(0);
  }

  if (verb === 'check') {
    const { stdout, code } = await runCheck(ws);
    console.log(stdout);
    process.exit(code);
  }

  const entry = VERBS[verb];
  if (!entry) {
    console.error(`lk: unknown verb "${verb}" — usage: lk <verb> [args...]`);
    process.exit(1);
  }

  try {
    const stdin = entry.needsStdin ? readStdin() : '';
    const out = await entry.fn(ws, rest, stdin);
    console.log(out);
  } catch (err) {
    console.error(`lk ${verb}: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

await main();
