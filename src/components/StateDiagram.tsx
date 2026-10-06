import React, { useMemo, type ReactElement } from 'react';
import type { FiniteAutomaton } from '../lib/grammarEngine';

interface StateDiagramProps {
  automaton: FiniteAutomaton;
  title: string;
  accentColor: 'blue' | 'orange';
}

export const StateDiagram: React.FC<StateDiagramProps> = ({ automaton, title, accentColor }) => {
  const blue = accentColor === 'blue';

  const layout = useMemo(() => {
    const { states, transitions } = automaton;
    if (states.length === 0) return { statePositions: new Map(), width: 600, height: 200 };

    const RADIUS = 30;
    const H_GAP = 130;
    const V_CENTER = 100;
    const PADDING = 60;

    // Topological sort for nice layout
    const ordered: string[] = [];
    const inDeg = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const s of states) { inDeg.set(s.id, 0); adj.set(s.id, []); }
    for (const t of transitions) {
      if (t.from !== t.to) {
        adj.get(t.from)?.push(t.to);
        inDeg.set(t.to, (inDeg.get(t.to) ?? 0) + 1);
      }
    }

    const queue: string[] = [];
    // Start with start state
    const startId = automaton.startState;
    if (startId) queue.push(startId);
    for (const [id, deg] of inDeg.entries()) {
      if (deg === 0 && id !== startId) queue.push(id);
    }

    const visited = new Set<string>();
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      ordered.push(id);
      for (const next of (adj.get(id) ?? [])) {
        if (!visited.has(next)) queue.push(next);
      }
    }

    // Any remaining states
    for (const s of states) {
      if (!visited.has(s.id)) ordered.push(s.id);
    }

    const statePositions = new Map<string, { x: number; y: number }>();
    ordered.forEach((id, i) => {
      statePositions.set(id, { x: PADDING + i * H_GAP, y: V_CENTER });
    });

    const width = Math.max(600, PADDING * 2 + ordered.length * H_GAP);
    const height = V_CENTER * 2 + RADIUS;

    return { statePositions, width, height, RADIUS };
  }, [automaton]);

  const { statePositions, width, height, RADIUS = 30 } = layout;

  const accent = blue ? '#3b82f6' : '#f97316';
  const accentLight = blue ? 'rgba(59,130,246,0.15)' : 'rgba(249,115,22,0.15)';

  if (automaton.states.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 opacity-40">
        <span className="text-sm font-mono">No automaton to display</span>
      </div>
    );
  }

  // Group transitions by (from, to) pair to merge labels
  const edgeMap = new Map<string, string[]>();
  for (const tr of automaton.transitions) {
    const key = `${tr.from}||${tr.to}`;
    if (!edgeMap.has(key)) edgeMap.set(key, []);
    edgeMap.get(key)!.push(tr.symbol);
  }

  // Render edges
  const edges: ReactElement[] = [];
  let edgeIdx = 0;
  for (const [key, symbols] of edgeMap.entries()) {
    const [fromId, toId] = key.split('||');
    const from = statePositions.get(fromId);
    const to = statePositions.get(toId);
    if (!from || !to) continue;

    const label = symbols.join(',');

    if (fromId === toId) {
      // Self-loop
      const cx = from.x;
      const cy = from.y - RADIUS * 1.8;
      edges.push(
        <g key={`edge-${edgeIdx++}`}>
          <path
            d={`M ${cx - 10} ${from.y - RADIUS} Q ${cx} ${cy - 20} ${cx + 10} ${from.y - RADIUS}`}
            fill="none" stroke={accent} strokeWidth="1.5"
            markerEnd={`url(#arrow-${accentColor})`}
          />
          <text x={cx} y={cy - 25} textAnchor="middle" fill={accent} fontSize="11" fontFamily="JetBrains Mono">
            {label}
          </text>
        </g>
      );
    } else {
      // Calculate edge with slight curve
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / dist;
      const ny = dx / dist;
      const curve = 20;

      const mx = (from.x + to.x) / 2 + nx * curve;
      const my = (from.y + to.y) / 2 + ny * curve;

      // Start/end on circle boundary
      const angle1 = Math.atan2(my - from.y, mx - from.x);
      const angle2 = Math.atan2(to.y - my, to.x - mx);
      const sx = from.x + RADIUS * Math.cos(angle1);
      const sy = from.y + RADIUS * Math.sin(angle1);
      const ex = to.x - RADIUS * Math.cos(angle2);
      const ey = to.y - RADIUS * Math.sin(angle2);

      edges.push(
        <g key={`edge-${edgeIdx++}`}>
          <path
            d={`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`}
            fill="none" stroke={accent} strokeWidth="1.5"
            markerEnd={`url(#arrow-${accentColor})`}
          />
          <text
            x={mx} y={my - 8}
            textAnchor="middle" fill={accent} fontSize="11"
            fontFamily="JetBrains Mono" fontWeight="600"
          >
            {label}
          </text>
        </g>
      );
    }
  }

  return (
    <div className="w-full">
      <div className="section-label mb-2">{title}</div>
      <div className="rounded-xl overflow-x-auto" style={{ background: 'var(--bg-secondary)', border: `1px solid ${accentLight}` }}>
        <svg
          width={width}
          height={height + 20}
          viewBox={`0 0 ${width} ${height + 20}`}
          style={{ minWidth: '100%', display: 'block' }}
        >
          <defs>
            <marker id={`arrow-${accentColor}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M 0 0 L 6 3 L 0 6 Z" fill={accent} />
            </marker>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Draw arrow for start state */}
          {(() => {
            const startPos = statePositions.get(automaton.startState);
            if (!startPos) return null;
            return (
              <g>
                <line
                  x1={startPos.x - RADIUS - 30} y1={startPos.y}
                  x2={startPos.x - RADIUS - 2} y2={startPos.y}
                  stroke={accent} strokeWidth="1.5"
                  markerEnd={`url(#arrow-${accentColor})`}
                />
                <text
                  x={startPos.x - RADIUS - 32} y={startPos.y - 6}
                  textAnchor="end" fill="var(--text-secondary)" fontSize="10"
                  fontFamily="Inter"
                >
                  start
                </text>
              </g>
            );
          })()}

          {/* Draw edges */}
          {edges}

          {/* Draw states */}
          {automaton.states.map((state) => {
            const pos = statePositions.get(state.id);
            if (!pos) return null;

            const isStart = state.id === automaton.startState;
            const isFinal = automaton.finalStates.includes(state.id);

            return (
              <g key={state.id} transform={`translate(${pos.x},${pos.y})`}>
                {/* Outer ring for final states */}
                {isFinal && (
                  <circle r={RADIUS + 5} fill="none" stroke={accent} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />
                )}
                {/* State circle */}
                <circle
                  r={RADIUS}
                  fill={isStart ? accentLight : 'var(--bg-card)'}
                  stroke={accent}
                  strokeWidth={isStart ? 2.5 : 1.5}
                  filter={isStart ? 'url(#glow)' : undefined}
                />
                {/* State label */}
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isStart ? accent : 'var(--text-primary)'}
                  fontSize="13"
                  fontFamily="JetBrains Mono"
                  fontWeight={isStart ? '700' : '500'}
                >
                  {state.label}
                </text>
                {/* Type label below */}
                <text
                  y={RADIUS + 14}
                  textAnchor="middle"
                  fill={isFinal ? '#10b981' : 'var(--text-secondary)'}
                  fontSize="9"
                  fontFamily="Inter"
                >
                  {isStart && isFinal ? 'start/final' : isStart ? 'start' : isFinal ? 'final' : ''}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 px-1">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: accent, background: accentLight }}></div>
          <span>Start</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div className="w-4 h-4 rounded-full border border-dashed" style={{ borderColor: accent }}></div>
          <span>Final</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div className="w-5 h-0.5" style={{ background: accent }}></div>
          <span>Transition</span>
        </div>
      </div>
    </div>
  );
};
