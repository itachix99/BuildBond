import React from 'react';
import { ProjectStatus, Role } from '@buildbond/shared';

export const App: React.FC = () => {
  return (
    <div className="container">
      <header className="header">
        <div className="logo-group">
          <div className="logo-badge">BB</div>
          <div>
            <h1 className="logo-title">BuildBond</h1>
            <p className="logo-subtitle">
              Milestone Escrow, Retainage, and Dispute Resolution on Stellar
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span className="badge badge-amber">Phase 1 Foundation</span>
          <span className="badge badge-blue">Stellar Testnet</span>
        </div>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <section className="card" style={{ borderLeft: '4px solid var(--accent-amber)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 700 }}>
            Construction Payment Protocol Baseline
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            BuildBond combines milestone-based funding, independent inspection approvals, automated
            defect-liability retainage clocks, and bounded dispute arbitration into an auditable
            Soroban smart-contract architecture.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <span className="badge badge-emerald">4 Core Roles</span>
            <span className="badge badge-blue">Integer Arithmetic (SEP-41)</span>
            <span className="badge badge-amber">Deterministic Timers</span>
          </div>
        </section>

        <div className="grid">
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 600 }}>
              Separation of Powers
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>{Role.Owner}:</strong> Proposes terms, deposits stablecoin escrow</li>
              <li><strong>{Role.Contractor}:</strong> Submits milestone evidence, withdraws earned value</li>
              <li><strong>{Role.Inspector}:</strong> Certifies milestone completion independently</li>
              <li><strong>{Role.Arbiter}:</strong> Resolves defect disputes with bounded awards</li>
            </ul>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 600 }}>
              Lifecycle Statuses
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {(Object.values(ProjectStatus) as string[]).map((st) => (
                <span key={st} className="badge badge-blue" style={{ textTransform: 'none' }}>
                  {st}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
