import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  History,
  ArrowRightLeft,
  ClipboardCheck,
  Database,
  Building2,
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
    { id: 'overview', label: 'Ringkasan Operasional', icon: <LayoutDashboard size={18} /> },
    { id: 'inventory', label: 'Stok & Fasilitas Gudang', icon: <Boxes size={18} /> },
    { id: 'pos', label: 'Purchase Orders (PO)', icon: <ShoppingCart size={18} /> },
    { id: 'transactions', label: 'Riwayat Mutasi Barang', icon: <History size={18} /> },
    { id: 'transfer', label: 'Transfer Antar Gudang', icon: <ArrowRightLeft size={18} /> },
    { id: 'opname', label: 'Stock Opname Fisik', icon: <ClipboardCheck size={18} /> },
    { id: 'master', label: 'Master Data Katalog', icon: <Database size={18} /> },
  ];

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="brand-section">
        <div className="brand-icon-box">
          <Building2 size={20} />
        </div>
        <div>
          <div className="brand-title">WMS Logistics</div>
          <span className="brand-badge">SISTEM OPERASIONAL</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-heading">Modul Pergudangan</div>
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
          <span>PostgreSQL Terhubung</span>
        </div>
      </div>
    </aside>
  );
};
