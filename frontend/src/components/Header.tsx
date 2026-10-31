import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, UserCheck } from 'lucide-react';
import type { TabType } from './Sidebar';

interface HeaderProps {
  activeTab: TabType;
  onOpenLogin: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onOpenLogin, onShowToast }) => {
  const { user, logout, quickLogin, isAuthenticated } = useAuth();

  const titles: Record<TabType, { title: string; subtitle: string }> = {
    overview: {
      title: 'Global Warehouse Intelligence & Telemetry Overview',
      subtitle: 'Real-time multi-facility ledger, dock-to-stock replenishment, and dual-track audit telemetry',
    },
    inventory: {
      title: 'Multi-Facility Inventory & Bin Storage Ledger',
      subtitle: 'Granular location bin mapping, lot/batch tracking, barcodes, and automated buffer alerts',
    },
    pos: {
      title: 'Inbound Procurement & Goods Receipt Note (GRN)',
      subtitle: 'Supplier purchase orders, ASN receiving dock workflows, and partial fulfillment processing',
    },
    so: {
      title: 'Outbound Order Fulfillment & Dispatch Management',
      subtitle: 'Sales orders wave-picking, container packing verification, and Delivery Docket (BOL) issuance',
    },
    transactions: {
      title: 'Immutable Audit Ledger & Material Movements',
      subtitle: 'High-throughput chronological ledger tracking IN/OUT, transfers, and inventory adjustments',
    },
    transfer: {
      title: 'Inter-Facility & Bin-to-Bin Stock Movements',
      subtitle: 'Atomic real-time inventory repositioning across global distribution centers and storage zones',
    },
    opname: {
      title: 'Physical Inventory Audit & Cycle Count Reconciliation',
      subtitle: 'Variance analysis between physical cycle counts and digital ledger with discrepancy tracking',
    },
    master: {
      title: 'Enterprise Master Catalog & Facility Network',
      subtitle: 'Centralized catalog management, tier-1 suppliers, global customer accounts, and logistics hubs',
    },
  };

  const currentInfo = titles[activeTab] || {
    title: 'WMS Nexus Enterprise',
    subtitle: 'Global Warehouse & Supply Chain Operating System',
  };

  const handleQuickSwitch = async (username: string, roleName: string) => {
    try {
      await quickLogin(username);
      onShowToast(`Switched active persona to ${roleName} (${username})`, 'success');
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
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', paddingLeft: '4px', fontWeight: 500 }}>
            Quick Personas:
          </span>
          <button
            className="btn-quick-role"
            onClick={() => handleQuickSwitch('ops_director', 'Director')}
            title="Sign in as Operations Director"
          >
            Director
          </button>
          <button
            className="btn-quick-role"
            onClick={() => handleQuickSwitch('inv_supervisor', 'Inbound Lead')}
            title="Sign in as Inbound & Purchasing Lead"
          >
            Inbound
          </button>
          <button
            className="btn-quick-role"
            onClick={() => handleQuickSwitch('logistics_lead', 'Logistics Lead')}
            title="Sign in as Fulfillment Specialist"
          >
            Logistics
          </button>
          <button
            className="btn-quick-role"
            onClick={() => handleQuickSwitch('sysadmin', 'SysAdmin')}
            title="Sign in as System Administrator"
          >
            Admin
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
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button className="btn-primary" onClick={onOpenLogin}>
            <UserCheck size={16} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
