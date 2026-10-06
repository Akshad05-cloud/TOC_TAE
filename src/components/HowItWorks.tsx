import React from 'react';
import { Search, Network, ArrowLeftRight, Code2, CheckCircle } from 'lucide-react';

const HOW_IT_WORKS = [
  {
    icon: Search, step: '1', title: 'Parse',
    description: 'Read and validate LLG productions of the form A → Ba or A → a or A → ε. Identify variables, terminals, and the start symbol.',
    color: '#818cf8', bg: 'rgba(129,140,248,0.1)',
  },
  {
    icon: Network, step: '2', title: 'Represent',
    description: 'Convert grammar relationships into a finite-state automaton (NFA). Each variable maps to a state; each production maps to a transition.',
    color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',
  },
  {
    icon: ArrowLeftRight, step: '3', title: 'Transform',
    description: 'Reorient the NFA transitions to extract a right-linear structure. The same automaton is read: δ(p, a) = q → production p → aq.',
    color: '#fb923c', bg: 'rgba(251,146,60,0.1)',
  },
  {
    icon: Code2, step: '4', title: 'Generate',
    description: 'Produce the RLG productions from the automaton. Final states yield ε-productions (termination rules) in the RLG.',
    color: '#f97316', bg: 'rgba(249,115,22,0.1)',
  },
  {
    icon: CheckCircle, step: '5', title: 'Verify',
    description: 'Check that generated language is preserved via test-string NFA simulation. L(G_LLG) = L(G_RLG) is guaranteed by construction.',
    color: '#34d399', bg: 'rgba(52,211,153,0.1)',
  },
];

const PIPELINE = ['LLG Input','Parser','NFA Builder','Transition Map','RLG Generator','Verifier'];

export const HowItWorks: React.FC = () => {
  return (
    <div>
      {/* Step cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '0.75rem' }}>
        {HOW_IT_WORKS.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                padding: '1rem', borderRadius: '0.75rem',
                background: item.bg, border: `1px solid ${item.color}30`,
                transition: 'transform 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '0.625rem', marginBottom: '0.625rem',
                background: item.bg, border: `1px solid ${item.color}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={18} color={item.color} />
              </div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: item.color, marginBottom: 2 }}>Step {item.step}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{item.title}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{item.description}</div>
            </div>
          );
        })}
      </div>

      {/* Pipeline flow */}
      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap', padding: '0.5rem 0' }}>
        {PIPELINE.map((label, i) => (
          <React.Fragment key={i}>
            <div style={{
              padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)',
            }}>
              {label}
            </div>
            {i < PIPELINE.length - 1 && (
              <span style={{ color: '#818cf8', fontSize: '0.85rem', flexShrink: 0 }}>→</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Formal basis note */}
      <div style={{
        marginTop: '1rem', padding: '0.875rem 1rem', borderRadius: '0.75rem',
        fontSize: '0.72rem', lineHeight: 1.65,
        background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
        color: 'var(--text-secondary)',
      }}>
        <strong style={{ color: 'var(--text-primary)' }}>📐 Formal Basis:</strong>{' '}
        Every left-linear grammar generates a regular language (it corresponds to a finite automaton).
        Every right-linear grammar also generates a regular language. The conversion exploits the fact
        that the same NFA can be described either by a LLG (reverse transitions) or by a RLG (forward
        transitions). Therefore L(G_LLG) = L(NFA) = L(G_RLG).
      </div>
    </div>
  );
};
