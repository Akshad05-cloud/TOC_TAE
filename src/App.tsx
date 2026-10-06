import React, { useState, useCallback, useEffect } from 'react';
import {
  Cpu, Moon, Sun, Play, Trash2, BookOpen, Copy, Download,
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Zap,
  ArrowRight, Layers, GitBranch, BarChart3, RefreshCw, Code2,
  AppWindow
} from 'lucide-react';
import { convertLLGtoRLG, testStrings as runTestStrings, type ConversionResult } from './lib/grammarEngine';
import { StateDiagram } from './components/StateDiagram';
import { StepsDisplay } from './components/StepsDisplay';
import { VerificationTable } from './components/VerificationTable';
import { HowItWorks } from './components/HowItWorks';

// ── Types ──────────────────────────────────────────────────────────────────────
type TabId = 'output' | 'steps' | 'diagram' | 'verify';

// ── Constants ──────────────────────────────────────────────────────────────────
const EXAMPLE_GRAMMARS = [
  { name: 'Classic Example',      grammar: 'S → Aa\nA → Bb\nB → c',           description: 'Generates: {cba}' },
  { name: 'Multiple Strings',     grammar: 'S → Aa | Ab\nA → c',              description: 'Generates: {ca, cb}' },
  { name: 'With Epsilon',         grammar: 'S → Aa | ε\nA → b',               description: 'Generates: {ε, ba}' },
  { name: 'Chained Productions',  grammar: 'S → Aa\nA → Bb\nB → Cc\nC → d',  description: 'Generates: {dcba}' },
  { name: 'Multiple Alts',        grammar: 'S → Aa | Ba | a\nA → b\nB → c',  description: 'Generates: {ba, ca, a}' },
];

const DEFAULT_TEST = ['cba', 'cb', 'abc', 'cbaa'];

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'output',  label: 'RLG Output',   icon: Code2 },
  { id: 'steps',   label: 'Steps',        icon: Layers },
  { id: 'diagram', label: 'Automaton',    icon: GitBranch },
  { id: 'verify',  label: 'Verification', icon: CheckCircle2 },
];

// ── Component ──────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark]         = useState(true);
  const [input, setInput]       = useState('S → Aa\nA → Bb\nB → c');
  const [result, setResult]     = useState<ConversionResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [tab, setTab]           = useState<TabId>('output');
  const [customs, setCustoms]   = useState<string[]>([]);
  const [showEg, setShowEg]     = useState(false);
  const [showHow, setShowHow]   = useState(false);
  const [copied, setCopied]     = useState('');
  const [converted, setConverted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // PWA Install prompt listener
  useEffect(() => {
    // Check if already running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("To install, open this site in Google Chrome, Microsoft Edge, or Safari, and click 'Install' in your browser address bar.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  // Apply theme class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark);
  }, [dark]);

  const allTests   = [...DEFAULT_TEST, ...customs];
  const testResults = result?.success ? runTestStrings(result, allTests) : [];

  // Convert handler
  const handleConvert = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      const res = convertLLGtoRLG(input);
      setResult(res);
      setConverted(true);
      setLoading(false);
      if (res.success) setTab('output');
    }, 350);
  }, [input]);

  const handleClear = () => { setInput(''); setResult(null); setConverted(false); setCustoms([]); };

  const handleLoadExample = (g: string) => { setInput(g); setResult(null); setConverted(false); setShowEg(false); };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const handleDownload = () => {
    if (!result?.success) return;
    const lines = [
      '===== LLG → RLG Inter-Converter =====', '',
      '--- Input LLG ---', input, '',
      '--- Variables ---', result.variables.join(', '), '',
      '--- Terminals ---', result.terminals.join(', '), '',
      '--- LLG Derivation ---', result.llgDerivation.join(' ⇒ '), '',
      '--- Equivalent RLG ---', result.rlgProductions.join('\n'), '',
      '--- RLG Derivation ---', result.rlgDerivation.join(' ⇒ '), '',
      '--- Statistics ---',
      `Productions: ${result.productionCount}`,
      `States: ${result.stateCount}`,
      `Transitions: ${result.transitionCount}`, '',
      '--- Test Verification ---',
      ...testResults.map(r => `"${r.string}": LLG=${r.acceptedByLLG?'✓':'✗'}, RLG=${r.acceptedByRLG?'✓':'✗'}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'llg-rlg-conversion.txt';
    a.click();
  };

  const rlgText = result?.success ? result.rlgProductions.join('\n') : '';

  return (
    <div className="bg-grid" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(16px)',
        backgroundColor: 'color-mix(in srgb, var(--bg-primary) 90%, transparent)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '0.75rem',
              background: 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(249,115,22,0.2))',
              border: '1px solid rgba(99,102,241,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Cpu size={20} color="#818cf8" />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, lineHeight: 1.2 }}>
                <span className="text-gradient-main">LLG → RLG</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 400, marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>Inter-Converter</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Language-Preserving Grammar Conversion · FLAT Educational Tool
              </div>
            </div>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.375rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.7rem',
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399',
            }}>
              <div className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
              L(G_LLG) = L(G_RLG)
            </div>

            {!isInstalled && (
              <button
                className="btn-base"
                onClick={handleInstallClick}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
                  border: '1px solid rgba(99,102,241,0.4)',
                  color: '#818cf8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                title="Install this tool as a standalone Desktop / Mobile app"
                id="install-pwa-btn"
              >
                <AppWindow size={14} />
                <span>Install App</span>
              </button>
            )}

            <button
              className="btn-base btn-secondary"
              onClick={() => setDark(d => !d)}
              style={{ width: 36, height: 36, padding: 0, justifyContent: 'center', borderRadius: '0.75rem' }}
              title="Toggle theme"
              id="theme-toggle"
            >
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div style={{
        background: dark
          ? 'linear-gradient(135deg,rgba(99,102,241,0.12) 0%,rgba(249,115,22,0.06) 100%)'
          : 'linear-gradient(135deg,rgba(99,102,241,0.06) 0%,rgba(249,115,22,0.03) 100%)',
        borderBottom: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
          <div style={{ maxWidth: 680 }}>
            {/* Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span className="badge badge-llg">LLG</span>
              <ArrowRight size={13} color="#818cf8" />
              <span className="badge badge-rlg">RLG</span>
              <span className="badge badge-success">✓ Language Preserved</span>
            </div>

            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.4rem)', fontWeight: 900, lineHeight: 1.2, marginBottom: '0.75rem' }}>
              Convert Left-Linear Grammar into an{' '}
              <span className="text-gradient-main">Equivalent Right-Linear Grammar</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem', maxWidth: 520 }}>
              Without Changing the Language. Built on finite-automaton theory —
              not naive symbol rearrangement. Suitable for demonstrating FLAT concepts to faculty and judges.
            </p>

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                id="hero-convert-btn"
                className="btn-base btn-primary"
                onClick={handleConvert}
                disabled={loading || !input.trim()}
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                Convert Grammar →
              </button>
              <button
                id="hero-example-btn"
                className="btn-base btn-secondary"
                onClick={() => setShowEg(s => !s)}
              >
                <BookOpen size={14} />
                Load Example
                {showEg ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {/* Example selector dropdown */}
            {showEg && (
              <div className="animate-fade-in" style={{
                marginTop: '0.75rem', padding: '0.75rem',
                borderRadius: '0.75rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '0.5rem',
              }}>
                {EXAMPLE_GRAMMARS.map((eg, i) => (
                  <button
                    key={i}
                    onClick={() => handleLoadExample(eg.grammar)}
                    style={{
                      textAlign: 'left', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer',
                      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                      transition: 'transform 0.15s', color: 'inherit',
                    }}
                    onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                    onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 2, color: 'var(--text-primary)' }}>{eg.name}</div>
                    <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#818cf8', marginBottom: 2 }}>{eg.grammar.split('\n')[0]}…</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{eg.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Decorative orbs */}
        <div style={{ position:'absolute',top:0,right:0,width:260,height:260,borderRadius:'50%',background:'radial-gradient(circle,rgba(99,102,241,0.15),transparent)',transform:'translate(35%,-35%)',pointerEvents:'none' }} />
        <div style={{ position:'absolute',bottom:0,right:'20%',width:180,height:180,borderRadius:'50%',background:'radial-gradient(circle,rgba(249,115,22,0.12),transparent)',transform:'translateY(55%)',pointerEvents:'none' }} />
      </div>

      {/* ── Main ──────────────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Input + Output Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,400px),1fr))', gap: '1.5rem' }}>

          {/* ── Input Panel ─────────────────────────────────────────────── */}
          <div className="card glow-blue" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Panel header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.2rem' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#60a5fa' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Enter Left-Linear Grammar</span>
                  <span className="badge badge-llg">LLG</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Format: A → Ba | a | ε</div>
              </div>
              {input && (
                <div style={{ fontSize:'0.7rem',fontFamily:'monospace',padding:'0.1rem 0.5rem',borderRadius:'0.4rem',background:'rgba(99,102,241,0.12)',color:'#818cf8' }}>
                  {input.split('\n').filter(l=>l.trim()).length} rules
                </div>
              )}
            </div>

            <textarea
              id="llg-input"
              className="grammar-textarea"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={'S → Aa\nA → Bb\nB → c\n\n// Valid forms:\n// A → Ba  (left-linear)\n// A → a   (terminal only)\n// A → ε   (epsilon)'}
              rows={8}
              spellCheck={false}
            />

            {/* Format hints */}
            <div style={{
              padding:'0.625rem 0.875rem', borderRadius:'0.625rem', fontSize:'0.72rem', lineHeight:1.7,
              background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.15)',
            }}>
              <div style={{ fontWeight:700, color:'var(--text-primary)', marginBottom:'0.25rem' }}>Valid production forms:</div>
              <div style={{ fontFamily:'monospace' }}><span style={{color:'#60a5fa'}}>A → Ba</span><span style={{color:'var(--text-secondary)'}}> — variable then terminal (left-linear)</span></div>
              <div style={{ fontFamily:'monospace' }}><span style={{color:'#60a5fa'}}>A → a</span><span style={{color:'var(--text-secondary)'}}> — terminal only (base case)</span></div>
              <div style={{ fontFamily:'monospace' }}><span style={{color:'#60a5fa'}}>A → ε</span><span style={{color:'var(--text-secondary)'}}> — epsilon production</span></div>
              <div style={{ fontFamily:'monospace' }}><span style={{color:'#60a5fa'}}>A → Ba | a</span><span style={{color:'var(--text-secondary)'}}> — alternatives with pipe</span></div>
            </div>

            {/* Buttons */}
            <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
              <button id="convert-btn" className="btn-base btn-primary" onClick={handleConvert} disabled={loading||!input.trim()} style={{flex:'1 1 auto', justifyContent:'center'}}>
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                {loading ? 'Converting…' : 'Convert'}
              </button>
              <button id="clear-btn" className="btn-base btn-danger" onClick={handleClear}>
                <Trash2 size={14} /> Clear
              </button>
              <button id="copy-llg-btn" className="btn-base btn-secondary" onClick={() => handleCopy(input,'llg')}>
                <Copy size={14} /> {copied==='llg' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* ── Output Panel ─────────────────────────────────────────────── */}
          <div className="card glow-orange" style={{ padding:'1.25rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.2rem' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#fb923c' }} />
                  <span style={{ fontWeight:700, fontSize:'0.95rem' }}>Equivalent Right-Linear Grammar</span>
                  <span className="badge badge-rlg">RLG</span>
                </div>
                <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)' }}>Converted output · Language preserved</div>
              </div>
              {result?.success && (
                <span className="badge badge-success" style={{ display:'flex', alignItems:'center', gap:'0.25rem' }}>
                  <CheckCircle2 size={11} /> Preserved ✓
                </span>
              )}
            </div>

            {/* Output box */}
            <div style={{
              borderRadius:'0.75rem', padding:'1rem', minHeight:150, position:'relative',
              background:'var(--bg-secondary)', border:'1px solid var(--border)',
              fontFamily:'JetBrains Mono, monospace',
            }}>
              {!converted && (
                <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',opacity:0.35 }}>
                  <Cpu size={32} color="#fb923c" style={{ marginBottom:8 }} />
                  <div style={{ fontSize:'0.85rem', color:'var(--text-secondary)' }}>Click "Convert" to generate RLG</div>
                </div>
              )}
              {result?.error && (
                <div className="animate-fade-in" style={{ display:'flex',alignItems:'flex-start',gap:'0.75rem',padding:'0.75rem',borderRadius:'0.625rem',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)' }}>
                  <AlertCircle size={16} color="#f87171" style={{ flexShrink:0, marginTop:2 }} />
                  <div>
                    <div style={{ fontSize:'0.8rem',fontWeight:700,color:'#f87171',marginBottom:4 }}>Conversion Error</div>
                    <div style={{ fontSize:'0.82rem', color:'#fca5a5' }}>{result.error}</div>
                  </div>
                </div>
              )}
              {result?.success && (
                <div className="animate-slide-up">
                  {result.rlgProductions.map((p,i) => (
                    <div key={i} style={{ fontSize:'0.9rem', color:'#fb923c', marginBottom:'0.25rem', fontFamily:'JetBrains Mono,monospace' }}>{p}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Derivation comparison */}
            {result?.success && (
              <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                <div style={{ padding:'0.625rem 0.875rem',borderRadius:'0.625rem',background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)' }}>
                  <div style={{ fontSize:'0.68rem',fontWeight:700,color:'#60a5fa',marginBottom:4 }}>LLG DERIVATION</div>
                  <div style={{ fontSize:'0.78rem',fontFamily:'JetBrains Mono,monospace',color:'var(--text-primary)' }}>{result.llgDerivation.join(' ⇒ ')}</div>
                </div>
                <div style={{ padding:'0.625rem 0.875rem',borderRadius:'0.625rem',background:'rgba(249,115,22,0.08)',border:'1px solid rgba(249,115,22,0.2)' }}>
                  <div style={{ fontSize:'0.68rem',fontWeight:700,color:'#fb923c',marginBottom:4 }}>RLG DERIVATION</div>
                  <div style={{ fontSize:'0.78rem',fontFamily:'JetBrains Mono,monospace',color:'var(--text-primary)' }}>{result.rlgDerivation.join(' ⇒ ')}</div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
              <button id="copy-rlg-btn" className="btn-base btn-secondary" onClick={() => handleCopy(rlgText,'rlg')} disabled={!result?.success}>
                <Copy size={14} /> {copied==='rlg' ? 'Copied!' : 'Copy RLG'}
              </button>
              <button id="download-btn" className="btn-base btn-orange" onClick={handleDownload} disabled={!result?.success}>
                <Download size={14} /> Download .txt
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        {result?.success && (
          <div className="animate-slide-up" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:'0.75rem' }}>
            {[
              { label:'Productions', value:result.productionCount, color:'#818cf8', Icon:Layers },
              { label:'States',      value:result.stateCount,      color:'#60a5fa', Icon:GitBranch },
              { label:'Transitions', value:result.transitionCount, color:'#fb923c', Icon:ArrowRight },
              { label:'RLG Rules',   value:result.rlgProductions.length, color:'#34d399', Icon:BarChart3 },
            ].map(({ label, value, color, Icon }, i) => (
              <div key={i} className="stat-card" style={{ borderColor:`${color}30`, background:`${color}08` }}>
                <Icon size={18} color={color} style={{ marginBottom:8 }} />
                <div style={{ fontSize:'2rem', fontWeight:900, color, lineHeight:1 }}>{value}</div>
                <div style={{ fontSize:'0.7rem', color:'var(--text-secondary)', marginTop:4 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabbed results ────────────────────────────────────────────────── */}
        {converted && (
          <div className="card animate-slide-up">
            {/* Tab bar */}
            <div style={{ display:'flex', overflowX:'auto', borderBottom:'1px solid var(--border)' }}>
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    id={`tab-${id}`}
                    onClick={() => setTab(id)}
                    style={{
                      display:'flex', alignItems:'center', gap:'0.375rem',
                      padding:'0.75rem 1rem', fontSize:'0.82rem', fontWeight:600,
                      whiteSpace:'nowrap', cursor:'pointer',
                      border:'none', borderBottom:`2px solid ${active?'#6366f1':'transparent'}`,
                      background: active ? 'rgba(99,102,241,0.07)' : 'transparent',
                      color: active ? '#818cf8' : 'var(--text-secondary)',
                      transition:'all 0.2s', marginBottom:'-1px',
                    }}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div style={{ padding:'1.25rem' }}>

              {/* ── RLG Output tab ── */}
              {tab==='output' && result?.success && (
                <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:'1rem' }}>
                    <div>
                      <div className="section-label" style={{ color:'#60a5fa' }}>INPUT LLG</div>
                      <pre className="grammar-output" style={{ color:'#60a5fa', minHeight:80 }}>
                        {result.llgProductions.map(p=>`${p.lhs} → ${p.rhs}`).join('\n')}
                      </pre>
                    </div>
                    <div>
                      <div className="section-label" style={{ color:'#fb923c' }}>OUTPUT RLG</div>
                      <pre className="grammar-output" style={{ color:'#fb923c', minHeight:80 }}>
                        {result.rlgProductions.join('\n')}
                      </pre>
                    </div>
                  </div>

                  {/* Language preserved banner */}
                  <div style={{ padding:'1rem',borderRadius:'0.75rem',background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.25)' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.375rem' }}>
                      <CheckCircle2 size={16} color="#34d399" />
                      <span style={{ fontSize:'0.85rem',fontWeight:700,color:'#34d399' }}>Language Preserved ✓</span>
                    </div>
                    <div style={{ fontSize:'0.85rem',fontFamily:'JetBrains Mono,monospace',color:'var(--text-primary)' }}>
                      L(G_LLG) = L(G_RLG)
                      {result.languageSample && result.languageSample !== '?' && (
                        <span style={{ color:'var(--text-secondary)' }}>{' '}⊇ {'{' + result.languageSample + '}'}</span>
                      )}
                    </div>
                    <div style={{ fontSize:'0.7rem',marginTop:4,color:'var(--text-secondary)' }}>Equivalence guaranteed by formal NFA construction.</div>
                  </div>

                  {/* Info chips */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:'0.625rem' }}>
                    {[
                      { label:'Variables',     val:result.variables.join(', '),   color:'#818cf8' },
                      { label:'Terminals',     val:result.terminals.join(', '),   color:'#60a5fa' },
                      { label:'Start Symbol',  val:result.startSymbol,            color:'#fb923c' },
                      { label:'Sample String', val:result.languageSample||'ε',    color:'#34d399' },
                    ].map((item,i) => (
                      <div key={i} style={{ padding:'0.75rem',borderRadius:'0.625rem',background:'var(--bg-secondary)',border:'1px solid var(--border)' }}>
                        <div style={{ fontSize:'0.65rem',color:'var(--text-secondary)',marginBottom:4 }}>{item.label}</div>
                        <div style={{ fontSize:'0.85rem',fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:item.color }}>
                          {'{' + item.val + '}'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab==='output' && result?.error && (
                <div className="animate-fade-in" style={{ display:'flex',alignItems:'flex-start',gap:'0.75rem',padding:'1rem',borderRadius:'0.75rem',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)' }}>
                  <AlertCircle size={18} color="#f87171" style={{ flexShrink:0, marginTop:2 }} />
                  <div>
                    <div style={{ fontWeight:700,color:'#f87171',marginBottom:4 }}>Conversion Failed</div>
                    <div style={{ fontSize:'0.875rem',color:'var(--text-primary)' }}>{result.error}</div>
                  </div>
                </div>
              )}

              {/* ── Steps tab ── */}
              {tab==='steps' && result?.success && (
                <div className="animate-fade-in">
                  <div style={{ fontSize:'0.82rem',color:'var(--text-secondary)',marginBottom:'1rem' }}>
                    Step-by-step breakdown of the LLG → RLG conversion pipeline.
                  </div>
                  <StepsDisplay steps={result.steps} />
                </div>
              )}

              {/* ── Diagram tab ── */}
              {tab==='diagram' && result?.success && (
                <div className="animate-fade-in" style={{ display:'flex',flexDirection:'column',gap:'1.5rem' }}>
                  <div style={{ fontSize:'0.82rem',color:'var(--text-secondary)' }}>
                    Finite-state automaton constructed from the LLG. The same NFA is used to extract the RLG.
                  </div>
                  <StateDiagram automaton={result.llgAutomaton} title="NFA — Equivalent Automaton (basis for both LLG and RLG)" accentColor="blue" />

                  {/* Transition table */}
                  <div>
                    <div className="section-label">TRANSITION TABLE</div>
                    <div style={{ borderRadius:'0.75rem',overflow:'hidden',border:'1px solid var(--border)' }}>
                      <table className="verify-table">
                        <thead>
                          <tr>
                            <th>From State</th>
                            <th>Symbol</th>
                            <th>To State</th>
                            <th>RLG Production</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.llgAutomaton.transitions.map((tr,i) => (
                            <tr key={i}>
                              <td style={{ fontFamily:'monospace',color:'#60a5fa' }}>
                                {tr.from}{tr.from===result.llgAutomaton.startState?' (start)':''}
                              </td>
                              <td style={{ fontFamily:'monospace',color:'#818cf8' }}>{tr.symbol}</td>
                              <td style={{ fontFamily:'monospace',color:result.llgAutomaton.finalStates.includes(tr.to)?'#34d399':'#fb923c' }}>
                                {tr.to}{result.llgAutomaton.finalStates.includes(tr.to)?' (final)':''}
                              </td>
                              <td style={{ fontFamily:'monospace',fontSize:'0.78rem',color:'var(--text-secondary)' }}>
                                {tr.from} → {tr.symbol}{tr.to}
                              </td>
                            </tr>
                          ))}
                          {result.llgAutomaton.transitions.length === 0 && (
                            <tr><td colSpan={4} style={{ textAlign:'center',color:'var(--text-secondary)',padding:'1rem' }}>No transitions</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Verify tab ── */}
              {tab==='verify' && result?.success && (
                <div className="animate-fade-in">
                  <div style={{ fontSize:'0.82rem',color:'var(--text-secondary)',marginBottom:'1rem' }}>
                    Test individual strings against both LLG and RLG automata to verify language equivalence.
                  </div>
                  <VerificationTable
                    results={testResults}
                    onAddString={s => setCustoms(p=>[...p,s])}
                    onRemoveString={s => setCustoms(p=>p.filter(x=>x!==s))}
                    customStrings={customs}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── How It Works ──────────────────────────────────────────────────── */}
        <div className="card" style={{ overflow:'hidden' }}>
          <button
            id="how-it-works-toggle"
            onClick={() => setShowHow(s=>!s)}
            style={{
              width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'1.25rem', textAlign:'left', cursor:'pointer',
              background:'transparent', border:'none', color:'inherit',
              transition:'background 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.05)')}
            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
              <div style={{ width:32,height:32,borderRadius:'0.5rem',background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.3)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <BookOpen size={14} color="#818cf8" />
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:'0.875rem' }}>How It Works</div>
                <div style={{ fontSize:'0.7rem', color:'var(--text-secondary)' }}>The formal LLG → RLG conversion algorithm</div>
              </div>
            </div>
            {showHow ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
          </button>
          {showHow && (
            <div className="animate-slide-up" style={{ padding:'0 1.25rem 1.25rem' }}>
              <div className="divider" />
              <HowItWorks />
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer style={{ textAlign:'center', padding:'1.5rem 0', display:'flex', flexDirection:'column', gap:'0.375rem' }}>
          <div style={{ fontSize:'0.875rem', fontWeight:700 }}>
            <span className="text-gradient-main">LLG → RLG Inter-Converter</span>
          </div>
          <div style={{ fontSize:'0.7rem', color:'var(--text-secondary)' }}>
            Formal Languages &amp; Automata Theory · Educational Tool ·{' '}
            <span style={{ color:'#818cf8' }}>L(G_LLG) = L(G_RLG)</span>
          </div>
          <div style={{ fontSize:'0.65rem', color:'var(--text-secondary)', opacity:0.55 }}>
            Uses finite-automaton intermediate representation · Not naive symbol rearrangement
          </div>
        </footer>
      </main>
    </div>
  );
}
