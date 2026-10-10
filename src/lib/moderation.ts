// Client-side checks for a better experience only. The database runs its own
// check (private.is_abusive) and flags messages whatever the app does.
// v1 replaces both word lists with a context-aware model.

const ABUSE = [
  /\bidiots?\b/i,
  /\bstupid\b/i,
  /\blosers?\b/i,
  /\bshut up\b/i,
  /\bhate you\b/i,
  /\bdumb\b/i,
  /\bkys\b/i,
  /\bkill yourself\b/i,
  /\bpathetic\b/i,
];

const DISTRESS = [
  /\bkill myself\b/i,
  /\bwant to die\b/i,
  /\bend it all\b/i,
  /\bsuicid/i,
  /\bhurt(ing)? myself\b/i,
  /\bno reason to live\b/i,
  /\bdon'?t want to be here\b/i,
  /\bself[- ]?harm/i,
];

export function looksAbusive(text: string): boolean {
  return ABUSE.some((r) => r.test(text));
}

export function soundsLikeDistress(text: string): boolean {
  return DISTRESS.some((r) => r.test(text));
}
