import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
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
    { id: 'overview', label: 'Dashboard Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'inventory', label: 'Stock & Inventory', icon: <Boxes size={18} /> },
    { id: 'pos', label: 'Purchase Orders', icon: <ShoppingCart size={18} /> },
    { id: 'transactions', label: 'Audit Movements', icon: <History size={18} /> },
    { id: 'transfer', label: 'Inter-Warehouse Transfer', icon: <ArrowRightLeft size={18} /> },
    { id: 'opname', label: 'Stock Opname', icon: <ClipboardCheck size={18} /> },
    { id: 'master', label: 'Master Data', icon: <Database size={18} /> },
  ];

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="brand-section">
        <div className="brand-icon-box">
          <Layers size={22} />
        </div>
        <div>
          <div className="brand-title">WMS Nexus</div>
          <span className="brand-badge">ENTERPRISE CORE</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-heading">Operations & Modules</div>
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
          <span>PostgreSQL Live Sync</span>
        </div>
      </div>
    </aside>
  );
};
