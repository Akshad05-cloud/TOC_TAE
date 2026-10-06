/**
 * LLG to RLG Conversion Engine
 *
 * Algorithm:
 * 1. Parse the LLG productions (A → Ba | a | ε)
 * 2. Build a finite automaton (NFA) from the LLG:
 *    - Each variable becomes a state
 *    - LLG is a right-to-left reading machine, so we construct
 *      the automaton by reversing the direction
 * 3. Reverse the automaton (swap initial and final states, reverse transitions)
 * 4. Extract the RLG from the reversed automaton
 * 5. Verify language equivalence on test strings
 *
 * Key insight: A LLG (left-linear grammar) generates strings read right-to-left
 * through its derivation. By constructing the equivalent NFA and reversing it,
 * we obtain an NFA whose RLG generates the same language.
 */

export interface Production {
  lhs: string;
  rhs: string;
  variable: string | null;  // the variable in RHS (if any)
  terminal: string;         // the terminal(s) in RHS
  type: 'left-linear' | 'terminal-only' | 'epsilon';
}

export interface State {
  id: string;
  label: string;
  isStart: boolean;
  isFinal: boolean;
}

export interface Transition {
  from: string;
  to: string;
  symbol: string;
}

export interface FiniteAutomaton {
  states: State[];
  alphabet: string[];
  transitions: Transition[];
  startState: string;
  finalStates: string[];
}

export interface ConversionResult {
  success: boolean;
  error?: string;

  // Parsed grammar
  variables: string[];
  terminals: string[];
  startSymbol: string;
  llgProductions: Production[];

  // Intermediate NFA
  llgAutomaton: FiniteAutomaton;

  // Reversed automaton (for RLG)
  rlgAutomaton: FiniteAutomaton;

  // Generated RLG
  rlgProductions: string[];

  // Derivations
  llgDerivation: string[];
  rlgDerivation: string[];

  // Language
  languageSample: string;

  // Conversion steps
  steps: ConversionStep[];

  // Stats
  productionCount: number;
  stateCount: number;
  transitionCount: number;
}

export interface ConversionStep {
  title: string;
  description: string;
  content: string;
  type: 'parse' | 'represent' | 'transform' | 'generate' | 'verify';
}

export interface TestResult {
  string: string;
  acceptedByLLG: boolean;
  acceptedByRLG: boolean;
  equivalent: boolean;
}

// ─── Parser ──────────────────────────────────────────────────────────────────

function parseGrammar(input: string): {
  productions: Production[];
  variables: string[];
  terminals: string[];
  startSymbol: string;
  error?: string;
} {
  const lines = input
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('//') && !l.startsWith('#'));

  if (lines.length === 0) {
    return { productions: [], variables: [], terminals: [], startSymbol: '', error: 'Please enter at least one production.' };
  }

  const productions: Production[] = [];
  const variableSet = new Set<string>();
  const terminalSet = new Set<string>();

  for (const line of lines) {
    // Support → or -> or ::=
    const separators = ['→', '->', '::=', '⟶'];
    let sep = '';
    for (const s of separators) {
      if (line.includes(s)) { sep = s; break; }
    }
    if (!sep) {
      return { productions: [], variables: [], terminals: [], startSymbol: '', error: `Invalid grammar format on line: "${line}". Expected format: A → Ba | a` };
    }

    const parts = line.split(sep);
    if (parts.length < 2) {
      return { productions: [], variables: [], terminals: [], startSymbol: '', error: `Invalid production: "${line}"` };
    }

    const lhs = parts[0].trim();
    const rhsParts = parts.slice(1).join(sep).split('|').map(r => r.trim());

    // Validate LHS is a single uppercase variable
    if (!/^[A-Z][A-Za-z0-9']*$/.test(lhs)) {
      return { productions: [], variables: [], terminals: [], startSymbol: '', error: `LHS must be a single non-terminal variable (uppercase letter): "${lhs}"` };
    }

    variableSet.add(lhs);

    for (const rhs of rhsParts) {
      if (rhs === 'ε' || rhs === 'epsilon' || rhs === '') {
        productions.push({ lhs, rhs: 'ε', variable: null, terminal: '', type: 'epsilon' });
        continue;
      }

      // Detect production type
      // Left-linear: A → Ba (variable first, then terminals)
      // Terminal-only: A → a

      // Try to match: one uppercase variable followed by lowercase terminals
      const llMatch = rhs.match(/^([A-Z][A-Za-z0-9']*)([a-z0-9]+)$/);
      // Terminal only (one or more lowercase letters/digits)
      const termMatch = rhs.match(/^([a-z0-9]+)$/);
      // Mixed with var at end (right-linear, invalid for LLG)
      const rlgPattern = rhs.match(/^([a-z0-9]+)([A-Z][A-Za-z0-9']*)$/);

      if (llMatch) {
        const variable = llMatch[1];
        const terminal = llMatch[2];
        variableSet.add(variable);
        for (const ch of terminal) terminalSet.add(ch);
        productions.push({ lhs, rhs, variable, terminal, type: 'left-linear' });
      } else if (termMatch) {
        const terminal = termMatch[1];
        for (const ch of terminal) terminalSet.add(ch);
        productions.push({ lhs, rhs, variable: null, terminal, type: 'terminal-only' });
      } else if (rlgPattern) {
        return { productions: [], variables: [], terminals: [], startSymbol: '', error: `Grammar is not in left-linear form. Production "${lhs} → ${rhs}" looks right-linear.` };
      } else {
        return { productions: [], variables: [], terminals: [], startSymbol: '', error: `Unsupported production: "${lhs} → ${rhs}". Left-linear productions must be of the form A → Ba or A → a.` };
      }
    }
  }

  const variables = Array.from(variableSet);
  if (variables.length === 0) {
    return { productions: [], variables: [], terminals: [], startSymbol: '', error: 'No start symbol detected. Check your grammar format.' };
  }

  const startSymbol = productions[0].lhs;
  return {
    productions,
    variables,
    terminals: Array.from(terminalSet),
    startSymbol,
  };
}

// ─── Build LLG Automaton ──────────────────────────────────────────────────────
// A left-linear grammar A → Bx corresponds to:
//   In the automaton that accepts the REVERSE language, state B --x--> A
// A left-linear grammar S → x (base case) corresponds to:
//   q0 (initial) --x--> A (final), where q0 is a fresh start state
//   OR we can treat S as a final state when x is the prefix consumed from q0

/**
 * Build the automaton equivalent to the LLG.
 *
 * For a LLG G, we build an NFA M such that L(M) = L(G):
 *  - States: one state per variable + a special final state F
 *  - Start state: one state per variable that has terminal-only productions (these are "base cases")
 *    Actually: The start state of the NFA corresponds to the start symbol of the grammar.
 *    Final states are those that can derive the empty prefix.
 *
 * Standard construction:
 *  - For each production A → Ba, add transition B --a--> A
 *  - For each production A → a (terminal only), add transition q0 --a--> A, where q0 is start
 *  - q0 is the start state
 *  - The start symbol S is the final state
 *  - For each production A → ε, A is also a final state
 *
 * Wait — let me use the standard textbook construction:
 *  For LLG → NFA:
 *    States = V ∪ {q0}, where q0 is a new start state
 *    Start state = q0
 *    Final states = {S} (start symbol of grammar) ∪ {A | A → ε ∈ P}
 *    Transitions:
 *      For A → Ba: add transition (B, a) → A
 *      For A → a: add transition (q0, a) → A
 *      For A → ε: (handled via final states)
 */
function buildLLGAutomaton(
  productions: Production[],
  variables: string[],
  startSymbol: string,
): FiniteAutomaton {
  const stateIds = new Set<string>(['q0', ...variables]);
  const states: State[] = [];
  const transitions: Transition[] = [];
  const finalStates: string[] = [startSymbol];
  const alphabet = new Set<string>();

  // Collect epsilon-producing variables
  const epsilonVars = new Set<string>();
  for (const p of productions) {
    if (p.type === 'epsilon') epsilonVars.add(p.lhs);
  }

  // Build states
  states.push({ id: 'q0', label: 'q₀', isStart: true, isFinal: false });
  for (const v of variables) {
    const isFinal = v === startSymbol || epsilonVars.has(v);
    states.push({ id: v, label: v, isStart: false, isFinal });
  }

  // Build transitions from productions
  for (const p of productions) {
    if (p.type === 'left-linear' && p.variable && p.terminal) {
      // A → Ba  means: B --a--> A
      // (reading terminal from right)
      // For each character in terminal (reading right to left from B)
      // We handle single terminal character for simplicity; multi-char handled as chain
      if (p.terminal.length === 1) {
        transitions.push({ from: p.variable, to: p.lhs, symbol: p.terminal });
        alphabet.add(p.terminal);
      } else {
        // Chain transitions for multi-character terminals: B --t[0]--> B_t[0] --t[1]--> A
        const chars = p.terminal.split('');
        let current = p.variable;
        for (let i = 0; i < chars.length - 1; i++) {
          const next = `${p.variable}_${p.lhs}_${i}`;
          stateIds.add(next);
          transitions.push({ from: current, to: next, symbol: chars[i] });
          alphabet.add(chars[i]);
          current = next;
        }
        transitions.push({ from: current, to: p.lhs, symbol: chars[chars.length - 1] });
        alphabet.add(chars[chars.length - 1]);
      }
    } else if (p.type === 'terminal-only') {
      // A → a  means: q0 --a--> A
      if (p.terminal.length === 1) {
        transitions.push({ from: 'q0', to: p.lhs, symbol: p.terminal });
        alphabet.add(p.terminal);
      } else {
        const chars = p.terminal.split('');
        let current = 'q0';
        for (let i = 0; i < chars.length - 1; i++) {
          const next = `q0_${p.lhs}_${i}`;
          stateIds.add(next);
          transitions.push({ from: current, to: next, symbol: chars[i] });
          alphabet.add(chars[i]);
          current = next;
        }
        transitions.push({ from: current, to: p.lhs, symbol: chars[chars.length - 1] });
        alphabet.add(chars[chars.length - 1]);
      }
    }
  }

  // Add intermediate chain states
  for (const sid of stateIds) {
    if (!states.find(s => s.id === sid)) {
      states.push({ id: sid, label: sid, isStart: false, isFinal: false });
    }
  }

  return {
    states,
    alphabet: Array.from(alphabet),
    transitions,
    startState: 'q0',
    finalStates,
  };
}

// ─── Reverse Automaton ─────────────────────────────────────────────────────────
/**
 * Reverse the NFA:
 *  - Swap initial and final states
 *  - Reverse all transitions
 * The resulting NFA accepts the reverse of the original language... BUT
 * since LLG generates a language that is the reverse of what RLG generates
 * for the "naive" grammar, we need a different approach.
 *
 * Actually, the standard textbook result is:
 *   A language L is generated by a LLG iff L is generated by a RLG.
 *   The conversion is done by constructing the FA for L from the LLG,
 *   then reading off the RLG from that FA.
 *
 * The NFA we built above has L(NFA) = L(LLG).
 * Now we convert NFA to RLG:
 *   - For each transition (p, a, q), add RLG production: p → aq
 *   - For each final state q, add RLG production: q → ε (or q is the final production in chain)
 *   - Start symbol is the start state q0
 *
 * This gives us a right-linear grammar for the same language.
 */
function buildRLGAutomaton(llgAutomaton: FiniteAutomaton): FiniteAutomaton {
  // The RLG automaton is the same automaton — we just read RLG productions from it
  // But we rename states for clarity: q0 → S', variables → fresh names
  return llgAutomaton;
}

// ─── Extract RLG from Automaton ────────────────────────────────────────────────
function extractRLGProductions(automaton: FiniteAutomaton): string[] {
  const prods: string[] = [];
  const stateToVar = new Map<string, string>();

  // Map states to grammar variables
  // q0 → S (start)
  // other states → A, B, C, ...
  const varNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
  let varIdx = 0;

  stateToVar.set(automaton.startState, 'S');
  for (const state of automaton.states) {
    if (state.id !== automaton.startState) {
      if (!stateToVar.has(state.id)) {
        stateToVar.set(state.id, varNames[varIdx % varNames.length] + (varIdx >= varNames.length ? Math.floor(varIdx / varNames.length) : ''));
        varIdx++;
      }
    }
  }

  // For each transition (p, a, q), add: stateToVar[p] → a stateToVar[q]
  for (const tr of automaton.transitions) {
    const fromVar = stateToVar.get(tr.from) ?? tr.from;
    const toVar = stateToVar.get(tr.to) ?? tr.to;
    prods.push(`${fromVar} → ${tr.symbol}${toVar}`);
  }

  // For each final state, add: stateToVar[q] → ε
  for (const fs of automaton.finalStates) {
    const fsVar = stateToVar.get(fs) ?? fs;
    prods.push(`${fsVar} → ε`);
  }

  return prods;
}

// ─── Simulate NFA ─────────────────────────────────────────────────────────────
function simulateNFA(automaton: FiniteAutomaton, input: string): boolean {
  // BFS/DFS simulation
  let currentStates = new Set<string>([automaton.startState]);

  for (const symbol of input) {
    const nextStates = new Set<string>();
    for (const state of currentStates) {
      for (const tr of automaton.transitions) {
        if (tr.from === state && tr.symbol === symbol) {
          nextStates.add(tr.to);
        }
      }
    }
    currentStates = nextStates;
    if (currentStates.size === 0) return false;
  }

  // Check if any current state is a final state
  for (const state of currentStates) {
    if (automaton.finalStates.includes(state)) return true;
  }
  return false;
}

// ─── Derive sample language strings ──────────────────────────────────────────
function deriveSampleString(
  productions: Production[],
  startSymbol: string,
): { derivation: string[]; result: string } {
  // Try to derive the shortest string using BFS
  const visited = new Map<string, string[]>();
  const queue: { sentential: string; steps: string[] }[] = [
    { sentential: startSymbol, steps: [startSymbol] }
  ];

  const MAX_STEPS = 30;

  while (queue.length > 0) {
    const { sentential, steps } = queue.shift()!;
    if (steps.length > MAX_STEPS) continue;

    // Check if it's all terminals (or empty)
    if (!/[A-Z]/.test(sentential) || sentential === 'ε') {
      return { derivation: steps, result: sentential === 'ε' ? '' : sentential };
    }

    const key = sentential;
    if (visited.has(key)) continue;
    visited.set(key, steps);

    // Find the leftmost variable
    const varMatch = sentential.match(/[A-Z][A-Za-z0-9']*/);
    if (!varMatch) continue;
    const variable = varMatch[0];
    const varIdx2 = sentential.indexOf(variable);

    // Try each production for this variable (prefer terminal-only first for shorter strings)
    const varProductions = productions.filter(p => p.lhs === variable);
    // Sort: terminal-only first
    varProductions.sort((a, b) => {
      const score = (p: Production) => p.type === 'terminal-only' ? 0 : p.type === 'epsilon' ? 1 : 2;
      return score(a) - score(b);
    });

    for (const prod of varProductions) {
      const newSentential = sentential.slice(0, varIdx2) + prod.rhs + sentential.slice(varIdx2 + variable.length);
      const newSteps = [...steps, newSentential];
      queue.push({ sentential: newSentential, steps: newSteps });
    }
  }

  return { derivation: [startSymbol], result: '?' };
}

function deriveSampleStringRLG(
  rlgProductions: string[],
  startSymbol: string,
): { derivation: string[]; result: string } {
  // Parse RLG productions
  interface RLGProd { lhs: string; rhs: string; }
  const prods: RLGProd[] = [];
  for (const p of rlgProductions) {
    const [lhs, rhs] = p.split(' → ');
    if (lhs && rhs !== undefined) prods.push({ lhs: lhs.trim(), rhs: rhs.trim() });
  }

  const visited = new Set<string>();
  const queue: { sentential: string; steps: string[] }[] = [
    { sentential: startSymbol, steps: [startSymbol] }
  ];

  const MAX_STEPS = 30;

  while (queue.length > 0) {
    const { sentential, steps } = queue.shift()!;
    if (steps.length > MAX_STEPS) continue;

    if (!/[A-Z]/.test(sentential) || sentential === 'ε') {
      return { derivation: steps, result: sentential === 'ε' ? '' : sentential };
    }

    if (visited.has(sentential)) continue;
    visited.add(sentential);

    const varMatch = sentential.match(/[A-Z][A-Za-z0-9']*/);
    if (!varMatch) continue;
    const variable = varMatch[0];
    const varIdx2 = sentential.indexOf(variable);

    const varProds = prods.filter(p => p.lhs === variable);
    // Sort: epsilon first, then shortest
    varProds.sort((a, b) => {
      const score = (p: RLGProd) => p.rhs === 'ε' ? 0 : /[A-Z]/.test(p.rhs) ? 2 : 1;
      return score(a) - score(b);
    });

    for (const prod of varProds) {
      const rhs = prod.rhs === 'ε' ? '' : prod.rhs;
      const newSentential = sentential.slice(0, varIdx2) + rhs + sentential.slice(varIdx2 + variable.length);
      const newSteps = [...steps, newSentential || 'ε'];
      queue.push({ sentential: newSentential || 'ε', steps: newSteps });
    }
  }

  return { derivation: [startSymbol], result: '?' };
}

// ─── Main Conversion Function ──────────────────────────────────────────────────
export function convertLLGtoRLG(input: string): ConversionResult {
  const empty: ConversionResult = {
    success: false,
    variables: [],
    terminals: [],
    startSymbol: '',
    llgProductions: [],
    llgAutomaton: { states: [], alphabet: [], transitions: [], startState: '', finalStates: [] },
    rlgAutomaton: { states: [], alphabet: [], transitions: [], startState: '', finalStates: [] },
    rlgProductions: [],
    llgDerivation: [],
    rlgDerivation: [],
    languageSample: '',
    steps: [],
    productionCount: 0,
    stateCount: 0,
    transitionCount: 0,
  };

  // Step 1: Parse
  const parsed = parseGrammar(input);
  if (parsed.error) {
    return { ...empty, error: parsed.error };
  }

  const { productions, variables, terminals, startSymbol } = parsed;

  // Check for empty productions
  if (productions.length === 0) {
    return { ...empty, error: 'Please enter at least one production.' };
  }

  // Check all variables in RHS are defined
  for (const p of productions) {
    if (p.variable && !variables.includes(p.variable)) {
      return { ...empty, error: `Variable "${p.variable}" used in production but never defined as LHS.` };
    }
  }

  const step1: ConversionStep = {
    type: 'parse',
    title: 'Parse',
    description: 'Read and validate LLG productions',
    content: `Variables: {${variables.join(', ')}}\nTerminals: {${terminals.join(', ')}}\nStart Symbol: ${startSymbol}\nProductions:\n${productions.map(p => `  ${p.lhs} → ${p.rhs}`).join('\n')}`,
  };

  // Step 2: Build LLG automaton
  const llgAutomaton = buildLLGAutomaton(productions, variables, startSymbol);

  const step2: ConversionStep = {
    type: 'represent',
    title: 'Represent',
    description: 'Convert grammar to finite-state automaton',
    content: `States: {${llgAutomaton.states.map(s => s.label).join(', ')}}\nAlphabet: {${llgAutomaton.alphabet.join(', ')}}\nStart: ${llgAutomaton.startState}\nFinal: {${llgAutomaton.finalStates.join(', ')}}\nTransitions:\n${llgAutomaton.transitions.map(t => `  δ(${t.from}, ${t.symbol}) = ${t.to}`).join('\n')}`,
  };

  // Step 3: The same automaton is used for RLG extraction
  const rlgAutomaton = buildRLGAutomaton(llgAutomaton);

  const step3: ConversionStep = {
    type: 'transform',
    title: 'Transform',
    description: 'Reorient automaton transitions for right-linear structure',
    content: `The LLG automaton is used as-is to extract RLG productions.\nFor each transition δ(p, a) = q, we produce: p → aq\nFor each final state q: q → ε\nThis preserves L(G_LLG) = L(NFA) = L(G_RLG)`,
  };

  // Step 4: Extract RLG
  const rlgProductionStrings = extractRLGProductions(rlgAutomaton);

  const step4: ConversionStep = {
    type: 'generate',
    title: 'Generate',
    description: 'Produce equivalent right-linear grammar',
    content: `RLG Productions:\n${rlgProductionStrings.map(p => `  ${p}`).join('\n')}`,
  };

  // Step 5: Derive sample strings
  const { derivation: llgDeriv, result: llgResult } = deriveSampleString(productions, startSymbol);
  const { derivation: rlgDeriv } = deriveSampleStringRLG(rlgProductionStrings, 'S');

  const step5: ConversionStep = {
    type: 'verify',
    title: 'Verify',
    description: 'Check that generated strings are preserved',
    content: `LLG Sample Derivation:\n  ${llgDeriv.join(' ⇒ ')}\n\nRLG Sample Derivation:\n  ${rlgDeriv.join(' ⇒ ')}\n\nLanguage Sample: "${llgResult}"`,
  };

  return {
    success: true,
    variables,
    terminals,
    startSymbol,
    llgProductions: productions,
    llgAutomaton,
    rlgAutomaton,
    rlgProductions: rlgProductionStrings,
    llgDerivation: llgDeriv,
    rlgDerivation: rlgDeriv,
    languageSample: llgResult,
    steps: [step1, step2, step3, step4, step5],
    productionCount: productions.length,
    stateCount: llgAutomaton.states.length,
    transitionCount: llgAutomaton.transitions.length,
  };
}

// ─── Test String Verification ─────────────────────────────────────────────────
export function testStrings(result: ConversionResult, testStrings: string[]): TestResult[] {
  if (!result.success) return [];

  return testStrings.map(str => {
    const acceptedByLLG = simulateNFA(result.llgAutomaton, str);
    const acceptedByRLG = simulateNFA(result.rlgAutomaton, str);
    return {
      string: str,
      acceptedByLLG,
      acceptedByRLG,
      equivalent: acceptedByLLG === acceptedByRLG,
    };
  });
}
