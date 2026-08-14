import React, { useState } from 'react';
import { TransactionLog } from '../types/escrow';

interface TransactionAuditDrawerProps {
  logs: TransactionLog[];
}

export const TransactionAuditDrawer: React.FC<TransactionAuditDrawerProps> = ({ logs }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div className={`transaction-audit-drawer ${isOpen ? 'open' : 'closed'}`}>
      <button
        type="button"
        className="drawer-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="drawer-icon">📜</span>
        <span className="drawer-title">On-Chain Audit Log ({logs.length})</span>
        <span className="drawer-arrow">{isOpen ? '▼' : '▲'}</span>
      </button>

      {isOpen && (
        <div className="drawer-content">
          {logs.length === 0 ? (
            <div className="empty-logs">No transactions recorded in this session yet.</div>
          ) : (
            <div className="logs-list">
              {logs.map(log => (
                <div key={log.id} className="log-item">
                  <div className="log-item-header">
                    <span className="log-title"><strong>{log.title}</strong></span>
                    <span className="log-method"><code>{log.method}()</code></span>
                    <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="log-item-desc">{log.details}</div>
                  <div className="log-item-meta">
                    <span className="log-actor">Actor: <strong>{log.actorRole}</strong> ({log.actorAddress.slice(0, 6)}...{log.actorAddress.slice(-4)})</span>
                    <a
                      href={log.stellarExpertUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="log-explorer-link"
                    >
                      Tx: {log.txHash.slice(0, 8)}... ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
