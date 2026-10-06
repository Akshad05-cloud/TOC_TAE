import React, { useState } from 'react';
import type { TestResult } from '../lib/grammarEngine';
import { CheckCircle2, XCircle, Plus, Trash2, FlaskConical } from 'lucide-react';

interface VerificationTableProps {
  results: TestResult[];
  onAddString: (s: string) => void;
  onRemoveString: (s: string) => void;
  customStrings: string[];
}

export const VerificationTable: React.FC<VerificationTableProps> = ({
  results, onAddString, onRemoveString, customStrings,
}) => {
  const [inputVal, setInputVal] = useState('');

  const allEquivalent = results.length > 0 && results.every(r => r.equivalent);

  const handleAdd = () => {
    const v = inputVal.trim();
    if (v && !customStrings.includes(v)) {
      onAddString(v);
      setInputVal('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Status banner */}
      <div className="animate-fade-in" style={{
        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
        padding: '0.875rem 1rem', borderRadius: '0.75rem',
        background: allEquivalent ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
        border: `1px solid ${allEquivalent ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
      }}>
        {allEquivalent
          ? <CheckCircle2 size={17} color="#34d399" style={{ flexShrink: 0, marginTop: 1 }} />
          : <XCircle     size={17} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
        }
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: allEquivalent ? '#34d399' : '#f87171' }}>
            {allEquivalent ? '✓ Language Preserved — Equivalent for all tested strings' : '✗ Discrepancy detected in tested strings'}
          </div>
          <div style={{ fontSize: '0.7rem', marginTop: 2, color: 'var(--text-secondary)' }}>
            This is finite sample verification, not a mathematical proof for infinite languages.
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <table className="verify-table">
          <thead>
            <tr>
              <th>Test String</th>
              <th style={{ textAlign: 'center' }}>LLG Accepts</th>
              <th style={{ textAlign: 'center' }}>RLG Accepts</th>
              <th style={{ textAlign: 'center' }}>Equivalent</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i} className="animate-fade-in" style={{ animationDelay: `${i * 45}ms` }}>
                <td>
                  <code style={{
                    fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
                    padding: '0.15rem 0.5rem', borderRadius: '0.35rem',
                    background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                  }}>
                    {r.string || 'ε'}
                  </code>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {r.acceptedByLLG
                    ? <span style={{ display:'inline-flex',alignItems:'center',gap:4,color:'#34d399',fontWeight:700,fontSize:'0.85rem' }}><CheckCircle2 size={13} /> ✓</span>
                    : <span style={{ display:'inline-flex',alignItems:'center',gap:4,color:'#f87171',fontWeight:700,fontSize:'0.85rem' }}><XCircle size={13} /> ✗</span>
                  }
                </td>
                <td style={{ textAlign: 'center' }}>
                  {r.acceptedByRLG
                    ? <span style={{ display:'inline-flex',alignItems:'center',gap:4,color:'#34d399',fontWeight:700,fontSize:'0.85rem' }}><CheckCircle2 size={13} /> ✓</span>
                    : <span style={{ display:'inline-flex',alignItems:'center',gap:4,color:'#f87171',fontWeight:700,fontSize:'0.85rem' }}><XCircle size={13} /> ✗</span>
                  }
                </td>
                <td style={{ textAlign: 'center' }}>
                  {r.equivalent
                    ? <span className="badge badge-success">≡ Equal</span>
                    : <span className="badge badge-error">≠ Differ</span>
                  }
                </td>
                <td style={{ textAlign: 'center' }}>
                  {customStrings.includes(r.string) ? (
                    <button
                      onClick={() => onRemoveString(r.string)}
                      title="Remove"
                      style={{ padding:'0.3rem', borderRadius:'0.4rem', border:'none', cursor:'pointer', background:'rgba(239,68,68,0.15)', color:'#f87171', display:'inline-flex', alignItems:'center' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : (
                    <span style={{ fontSize:'0.68rem', color:'var(--text-secondary)' }}>default</span>
                  )}
                </td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text-secondary)', padding:'1rem' }}>No test strings</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add custom test string */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 0.75rem', borderRadius: '0.75rem',
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        }}>
          <FlaskConical size={13} color="var(--text-secondary)" />
          <input
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Enter a test string (e.g. cba)"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <button className="btn-base btn-secondary" onClick={handleAdd} style={{ fontSize: '0.78rem', gap: '0.35rem' }}>
          <Plus size={13} /> Add Test
        </button>
      </div>

      {/* Formal note */}
      <div style={{
        padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.72rem', lineHeight: 1.65,
        background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
        color: 'var(--text-secondary)',
      }}>
        <strong style={{ color: 'var(--text-primary)' }}>ℹ Note:</strong> This tool performs finite test-string
        verification using the NFA constructed from the LLG.
        Full language equivalence L(G_LLG) = L(G_RLG) follows from the formal construction
        (LLG → NFA → RLG extraction), which is mathematically proven for all left-linear grammars.
      </div>
    </div>
  );
};
