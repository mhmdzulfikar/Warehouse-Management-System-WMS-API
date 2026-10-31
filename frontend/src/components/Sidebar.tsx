import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  Truck,
  History,
  ArrowRightLeft,
  ClipboardCheck,
  Database,
  Layers,
} from 'lucide-react';

export type TabType =
  | 'overview'
  | 'inventory'
  | 'pos'
  | 'so'
  | 'transactions'
  | 'transfer'
  | 'opname'
  | 'master';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Global Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'inventory', label: 'Inventory & Bins', icon: <Boxes size={18} /> },
    { id: 'pos', label: 'Inbound PO (GRN)', icon: <ShoppingCart size={18} /> },
    { id: 'so', label: 'Outbound SO (Fulfillment)', icon: <Truck size={18} /> },
    { id: 'transactions', label: 'Movement Ledger', icon: <History size={18} /> },
    { id: 'transfer', label: 'Inter-Facility Transfer', icon: <ArrowRightLeft size={18} /> },
    { id: 'opname', label: 'Cycle Count Audit', icon: <ClipboardCheck size={18} /> },
    { id: 'master', label: 'Enterprise Catalog', icon: <Database size={18} /> },
  ];

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="brand-section">
        <div className="brand-icon-box" style={{ background: '#0f172a', color: '#ffffff', borderRadius: '8px' }}>
          <Layers size={20} />
        </div>
        <div>
          <div className="brand-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: '1.05rem' }}>
            WMS NEXUS
          </div>
          <span className="brand-badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.65rem', fontWeight: 600 }}>
            GLOBAL LOGISTICS OS
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-heading" style={{ fontSize: '0.68rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
          CORE OPERATIONS
        </div>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer System Status */}
      <div className="sidebar-footer">
        <div className="system-status">
          <span className="pulse-dot"></span>
          <span>PostgreSQL & UDP Connected</span>
        </div>
      </div>
    </aside>
  );
};
