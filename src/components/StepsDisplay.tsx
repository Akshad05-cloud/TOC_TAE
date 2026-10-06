import React from 'react';
import type { ConversionStep } from '../lib/grammarEngine';
import { Search, Network, ArrowLeftRight, Code2, CheckCircle } from 'lucide-react';

interface StepsDisplayProps {
  steps: ConversionStep[];
}

const STEP_META: Record<ConversionStep['type'], { icon: React.ElementType; color: string; bg: string }> = {
  parse:     { icon: Search,         color: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
  represent: { icon: Network,        color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  transform: { icon: ArrowLeftRight, color: '#fb923c', bg: 'rgba(251,146,60,0.1)'  },
  generate:  { icon: Code2,          color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
  verify:    { icon: CheckCircle,    color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
};

export const StepsDisplay: React.FC<StepsDisplayProps> = ({ steps }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {steps.map((step, i) => {
        const meta = STEP_META[step.type];
        const Icon = meta.icon;
        return (
          <div
            key={i}
            className="step-card animate-slide-up"
            style={{
              animationDelay: `${i * 80}ms`,
              background: meta.bg,
              borderColor: `${meta.color}35`,
            }}
          >
            {/* Step number */}
            <div style={{ flexShrink: 0, marginTop: 2 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '0.5rem',
                background: meta.bg, border: `1px solid ${meta.color}45`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.78rem', fontWeight: 800, color: meta.color,
              }}>
                {i + 1}
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                <Icon size={13} color={meta.color} />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: meta.color }}>{step.title}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>— {step.description}</span>
              </div>
              <pre style={{
                fontSize: '0.74rem', lineHeight: 1.65,
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--text-primary)', opacity: 0.85,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                margin: 0,
              }}>
                {step.content}
              </pre>
            </div>
          </div>
        );
      })}
    </div>
  );
};
