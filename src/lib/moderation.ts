// Client-side checks for a better experience only. The database runs its own
// check (private.is_abusive) and flags messages whatever the app does.
// v1 replaces both word lists with a context-aware model.

const ABUSE = [
  /\bidiots?\b/,
  /\bstupid\b/,
  /\blosers?\b/,
  /\bshut up\b/,
  /\bhate (you|u)\b/,
  /\bdumb\b/,
  /\bkys\b/,
  /\bkill (yo)?urself\b/,
  /\bpathetic\b/,
];

// Phrases that suggest someone may be thinking about suicide or self-harm.
// Deliberately leaves out everyday sport talk like "I'm dying", "we're gonna
// die in this heat", "this run is killing me" or "5 kms", so the prompt only
// appears when it might matter.
const DISTRESS = [
  /\b(want|wanna|wanted) (to )?die\b/,
  /\bwant(ed)? to be dead\b/,
  /\bwish (i|i'd) (was|were|had) (dead|died|never been born)\b/,
  /\bbetter off (dead|without me)\b/,
  /\bkill(ing)? myself\b/,
  /(^|[a-z.!?,]\s+)kms\b/, // "kms" as slang, but not "5 kms"
  /\bend (it all|my life|things)\b/,
  /\btake my (own )?life\b/,
  /\bsuicid/,
  /\bunalive\b/,
  /\bself[- ]?harm/,
  /\b(hurt|hurting|cut|cutting) myself\b/,
  /\bno (reason|point) (to|in) (live|living|going on)\b/,
  /\b(don't|dont|do not) want to (be here|live|exist|wake up)\b/,
  /\b(can't|cant|cannot) go on\b/,
  /\b(life|living) (isn't|isnt|is not) worth\b/,
  /\bnot worth living\b/,
];

function normalise(text: string): string {
  return text.toLowerCase().replace(/[‘’ʼ]/g, "'").replace(/\s+/g, ' ');
}

export function looksAbusive(text: string): boolean {
  const t = normalise(text);
  return ABUSE.some((r) => r.test(t));
}

export function soundsLikeDistress(text: string): boolean {
  const t = normalise(text);
  return DISTRESS.some((r) => r.test(t));
}
