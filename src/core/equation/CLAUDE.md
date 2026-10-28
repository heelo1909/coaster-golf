# src/core/equation: Equation Engine (Section 2)

Turns what the player types into a safe math function, and scores its length. This is the heart of the "shortest equation wins" idea. **Every rule here changes what counts as a clever solution, so treat the grammar like game design, not plumbing.**

## Files (target)

```
tokenizer.ts   string → tokens
parser.ts      tokens → Expr tree (recursive descent)
evaluate.ts    Expr + x → number
score.ts       scoreEquation()
errors.ts      friendly error messages
index.ts       public exports only
```

## Grammar (precedence low → high)

```
equation   := [ "y" "=" ] sum
sum        := product ( ("+" | "-") product )*
product    := unary ( ("*" | "/") unary | IMPLICIT unary )*
unary      := "-" unary | power
power      := atom [ "^" unary ]           // right-associative: 2^3^2 = 2^9
atom       := NUMBER | "x" | CONST | FUNC "(" sum ( "," sum )* ")" | "(" sum ")" | "|" sum "|"
CONST      := "pi" | "e"
FUNC       := sin cos tan abs sqrt log ln exp min max floor
```

- `-x^2` means `-(x^2)`. `2^-x` is allowed (the exponent is a `unary`).
- **Implicit multiplication** happens when two atoms sit next to each other: `2x`, `3(x+1)`, `(x-1)(x+2)`, `2sin(x)`, `xpi`, `pix`. It binds the same as `*`, so `1/2x` = `(1/2)*x`. Write a test that pins this down.
- **Words are matched longest-first** against the known list (`pi`, `e`, `x`, and the function names). `pix` → `pi`·`x`. `ex` → `e`·`x`. `exp` is the function, not `e`·`x`·`p`.
- **Functions need parentheses.** `sinx` → error: "sin needs parentheses, like sin(x)".
- `|x-2|` is allowed as absolute value, because it's shorter than `abs(x-2)`. That's intentional for golfing. Nested bars like `||x|-1|` must parse; add tests.
- `log` = base 10, `ln` = natural log.
- Numbers: `3`, `3.5`, `.5`. No `1e3` notation, because it clashes with the constant `e`.
- Only lowercase. Spaces are ignored everywhere.

## LaTeX Input (also accepted)

Players may type LaTeX instead of plain math. The tokenizer recognizes this subset and maps it to the same tree:

| LaTeX | Means |
|---|---|
| `\frac{a}{b}` | `(a)/(b)` |
| `\sqrt{a}` | `sqrt(a)` |
| `a^{b}` | `a^(b)`; `{}` works as grouping anywhere |
| `\sin \cos \tan \ln \log \exp` | the same functions; parentheses **or** braces after them |
| `\left( … \right)`, `\left| … \right|` | plain parens / abs bars |
| `\cdot`, `\times` | `*` |
| `\pi` | `pi` |

- Plain and LaTeX can mix: `\frac{x}{2}+sin(x)` is fine.
- An unknown command gives a friendly error: `unknown command "\alpha"`.
- The 200-character limit still applies to what was typed.
- Tests: every row above, mixing, nested `\frac`, and an unknown command.

## Pretty Display: `toLatex(expr)`

`toLatex(expr: Expr): string` turns a parsed tree into LaTeX for **display only**. It's pure, with no dependencies; the UI renders the string (see `src/game/ui/CLAUDE.md`). So typing `sqrt(x)` previews as √x, `x^2` as x², and `(x-3)/2` as a stacked fraction.
- Add only the parentheses that precedence needs, so the display looks clean.
- Tests: round-trip sanity. For 30 sample equations, parse(input) and parse(toLatex(parse(input))) evaluate the same at several x values.

## Scoring Rule

`scoreEquation(input)` = remove all whitespace, remove a leading `y=`, then count the remaining characters (`length` of the string). So `y = (x-3)^2/2` scores 11. This is the **only** scoring function; the UI and the server both use it through `judge()`.

The score counts **what the player typed**, not the pretty display. LaTeX is accepted for comfort but is usually longer (`\frac{x}{2}` = 11 vs `x/2` = 3), so it never gives an advantage.

## Safety Limits

- Reject input longer than **200 characters** before tokenizing.
- Max nesting depth **50** (parens, bars and function calls combined).
- Max **500 nodes** in the tree.
- The evaluator is a plain recursive switch over node types. **No `eval`, no `Function`, no string building of JS.**

## Error Messages

Short, friendly, with a 0-based `position` the UI can underline. Examples:
- `unknown word "sn" at 0`
- `missing ")"`
- `"sin" needs parentheses, like sin(x)`
- `nothing after "^"`
- `equation is too long (max 200 characters)`

## Tests Required

- Precedence and associativity table (at least 20 cases, checked by evaluating at a few x values)
- Implicit multiplication cases, including `1/2x`, `2(x)(x)`, `pix`, `ex`, `exp(x)`
- Absolute value bars, including nested ones
- Every error message above, with the right position
- Scoring examples (whitespace, a leading `y=`, no `y=`)
- A fuzz test: 10,000 random strings from the allowed alphabet; nothing throws, nothing takes longer than 5 ms

## Gotchas

- `|` is both the opening and closing bar. Decide by context: a bar opens where an atom is expected, and closes otherwise. After a finished factor, a bar opens (implicit multiplication) only if no bar is waiting to close, so `2|x|` and `|x||x|` work while `||x|-1|` closes where expected. Parentheses reset this count, because a bar can't close across a `(`: `|(2|x|)|` parses.
- Spaces are stripped before tokenizing (like scoring), so `s in(x)` is `sin(x)` and `1 2` is `12`.
- `1e3` is `1·e·3` (two atoms side by side), not 1000. Tested so it can't change silently.
- Unary minus versus implicit multiplication: `2-x` is subtraction, never `2·(-x)`.
- Keep the original `source` string; the leaderboard shows exactly what the player typed (minus whitespace).
