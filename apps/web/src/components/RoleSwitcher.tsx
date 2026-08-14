import React from 'react';
import { DEMO_PERSONAS, RolePersona, RoleType } from '../types/escrow';

interface RoleSwitcherProps {
  activeRole: RoleType;
  onSelectRole: (role: RoleType) => void;
  activePersona: RolePersona;
  activeAddress: string;
  freighterAddress: string | null;
  useFreighterWallet: boolean;
  onToggleFreighter: (use: boolean) => void;
  simulatedTimeOffsetSecs: number;
  onFastForwardDays: (days: number) => void;
  onResetDemo: () => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  activeRole,
  onSelectRole,
  activePersona,
  activeAddress,
  freighterAddress,
  useFreighterWallet,
  onToggleFreighter,
  simulatedTimeOffsetSecs,
  onFastForwardDays,
  onResetDemo,
}) => {
  const roles: RoleType[] = ['Owner', 'Contractor', 'Inspector', 'Arbiter'];
  const simulatedDays = Math.round(simulatedTimeOffsetSecs / 86400);

  return (
    <div className="role-switcher-container">
      <div className="role-switcher-header">
        <div className="role-switcher-title">
          <span className="live-dot" />
          <span>Active Operating Role</span>
          <span className="role-chip" style={{ backgroundColor: `${activePersona.badgeColor}22`, color: activePersona.badgeColor, borderColor: activePersona.badgeColor }}>
            {activePersona.avatar} {activeRole}
          </span>
        </div>

        {/* Simulated Time Controls */}
        <div className="simulated-time-controls">
          <span className="time-label">
            ⏱️ Clock: {simulatedDays === 0 ? 'Live Testnet' : `+${simulatedDays} Days`}
          </span>
          <button
            type="button"
            className="time-btn"
            onClick={() => onFastForwardDays(30)}
            title="Fast forward simulated time by 30 days"
          >
            +30d
          </button>
          <button
            type="button"
            className="time-btn highlight"
            onClick={() => onFastForwardDays(90)}
            title="Fast forward simulated time by 90 days (Defect Liability Expiry)"
          >
            +90d (Expire Retainage)
          </button>
          <button
            type="button"
            className="time-btn reset"
            onClick={onResetDemo}
            title="Reset workspace to clean demo state"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Role Selection Tabs */}
      <div className="role-buttons-grid">
        {roles.map(role => {
          const persona = DEMO_PERSONAS[role];
          const isSelected = activeRole === role && !useFreighterWallet;

          return (
            <button
              key={role}
              type="button"
              className={`role-tab-btn ${isSelected ? 'active' : ''}`}
              onClick={() => {
                onToggleFreighter(false);
                onSelectRole(role);
              }}
              style={{
                borderColor: isSelected ? persona.badgeColor : 'var(--border-subtle)',
              }}
            >
              <div className="role-tab-top">
                <span className="role-tab-avatar">{persona.avatar}</span>
                <span className="role-tab-name">{role}</span>
              </div>
              <div className="role-tab-desc">{persona.title.split('(')[0].trim()}</div>
            </button>
          );
        })}

        {/* Connected Freighter Option */}
        {freighterAddress && (
          <button
            type="button"
            className={`role-tab-btn freighter ${useFreighterWallet ? 'active' : ''}`}
            onClick={() => onToggleFreighter(!useFreighterWallet)}
          >
            <div className="role-tab-top">
              <span className="role-tab-avatar">🚀</span>
              <span className="role-tab-name">Freighter</span>
            </div>
            <div className="role-tab-desc">
              {freighterAddress.slice(0, 4)}...{freighterAddress.slice(-4)}
            </div>
          </button>
        )}
      </div>

      {/* Active Persona Banner */}
      <div className="active-persona-banner" style={{ borderLeftColor: activePersona.badgeColor }}>
        <div className="persona-info">
          <strong>{activePersona.title}</strong> — {activePersona.description}
        </div>
        <div className="persona-address">
          <code>{activeAddress}</code>
        </div>
      </div>
    </div>
  );
};
