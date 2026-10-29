// The one scoring rule, used by judge() in the browser and on the server: drop every space
// (the same /\s/ the tokenizer skips), drop a leading "y=", and count what's left. It counts
// what the player typed, so LaTeX is accepted but never shorter than the plain form.
export function scoreEquation(input: string): number {
  const typed = input.replace(/\s/g, '');
  return (typed.startsWith('y=') ? typed.slice(2) : typed).length;
}
