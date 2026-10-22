import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, UserCheck } from 'lucide-react';
import { TabType } from './Sidebar';

interface HeaderProps {
  activeTab: TabType;
  onOpenLogin: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onOpenLogin, onShowToast }) => {
  const { user, logout, quickLogin, isAuthenticated } = useAuth();

  const titles: Record<TabType, { title: string; subtitle: string }> = {
    overview: {
      title: 'Executive Dashboard',
      subtitle: 'Real-time telemetry and warehouse analytics',
    },
    inventory: {
      title: 'Stock & Inventory Balances',
      subtitle: 'Monitor facility stock levels and replenishment thresholds',
    },
    pos: {
      title: 'Purchase Orders (Procurement)',
      subtitle: 'Manage supplier orders, approvals, and receiving flow',
    },
    transactions: {
      title: 'Audit Movement Ledger',
      subtitle: 'Chronological history of inbound, outbound, transfer, and adjustments',
    },
    transfer: {
      title: 'Inter-Warehouse Transfer Wizard',
      subtitle: 'Shift inventory safely between distribution centers',
    },
    opname: {
      title: 'Stock Opname / Physical Count',
      subtitle: 'Reconcile digital system balance with physical count',
    },
    master: {
      title: 'Master Data Catalog',
      subtitle: 'Configure products, suppliers, and warehouse facilities',
    },
  };

  const currentInfo = titles[activeTab] || {
    title: 'WMS Nexus',
    subtitle: 'Warehouse Management System',
  };

  const handleQuickSwitch = async (username: string) => {
    try {
      await quickLogin(username);
      onShowToast(`Switched account to ${username}`, 'success');
    } catch (e: any) {
      onShowToast(e.message || 'Login failed', 'error');
    }
  };

  return (
    <header className="top-header">
      <div className="header-left">
        <h1>{currentInfo.title}</h1>
        <p>{currentInfo.subtitle}</p>
      </div>

      <div className="header-right">
        {/* Quick Demo Switcher */}
        <div className="quick-roles">
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', paddingLeft: '6px' }}>
            Quick Switch:
          </span>
          <button
            className="btn-quick-role"
            onClick={() => handleQuickSwitch('bapak_manager')}
            title="Login as Manager"
          >
            Manager
          </button>
          <button
            className="btn-quick-role"
            onClick={() => handleQuickSwitch('andi_purchasing')}
            title="Login as Purchasing"
          >
            Purchasing
          </button>
          <button
            className="btn-quick-role"
            onClick={() => handleQuickSwitch('joko_gudang')}
            title="Login as Staff Gudang"
          >
            Staff Gudang
          </button>
        </div>

        {isAuthenticated && user ? (
          <div className="user-profile-widget">
            <div className="avatar">
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{user.username}</span>
              <span className="user-role-badge">{user.role}</span>
            </div>
            <button
              className="btn-logout"
              onClick={logout}
              title="Logout session"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button className="btn-primary" onClick={onOpenLogin}>
            <UserCheck size={16} />
            <span>Login Session</span>
          </button>
        )}
      </div>
    </header>
  );
};
