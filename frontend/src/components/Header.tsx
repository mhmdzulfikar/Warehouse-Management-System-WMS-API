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
      title: 'Ringkasan Operasional Pergudangan',
      subtitle: 'Monitoring stok barang, status pesanan pengadaan, dan pergerakan mutasi harian',
    },
    inventory: {
      title: 'Saldo Stok & Ketersediaan Barang',
      subtitle: 'Monitoring kuantitas barang per gudang dan peringatan batas minimum stok',
    },
    pos: {
      title: 'Purchase Orders (Pengadaan Barang)',
      subtitle: 'Daftar pesanan pengadaan ke pemasok dan proses penerimaan barang',
    },
    transactions: {
      title: 'Buku Jurnal Mutasi Barang',
      subtitle: 'Audit kronologis mutasi keluar-masuk, transfer lokasi, dan penyesuaian opname',
    },
    transfer: {
      title: 'Transfer Stok Antar Gudang',
      subtitle: 'Pemindahan fisik inventaris antar fasilitas gudang secara atomik',
    },
    opname: {
      title: 'Rekonsiliasi Stock Opname Fisik',
      subtitle: 'Penyesuaian selisih antara perhitungan fisik gudang dengan sistem digital',
    },
    master: {
      title: 'Katalog Master Data',
      subtitle: 'Pengaturan data produk, daftar pemasok (supplier), dan fasilitas gudang',
    },
  };

  const currentInfo = titles[activeTab] || {
    title: 'WMS Logistics',
    subtitle: 'Sistem Manajemen Pergudangan & Pengadaan',
  };

  const handleQuickSwitch = async (username: string) => {
    try {
      await quickLogin(username);
      onShowToast(`Beralih akun ke ${username}`, 'success');
    } catch (e: any) {
      onShowToast(e.message || 'Gagal login', 'error');
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
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', paddingLeft: '4px' }}>
            Akun Demo:
          </span>
          <button
            className="btn-quick-role"
            onClick={() => handleQuickSwitch('bapak_manager')}
            title="Masuk sebagai Manager"
          >
            Manager
          </button>
          <button
            className="btn-quick-role"
            onClick={() => handleQuickSwitch('andi_purchasing')}
            title="Masuk sebagai Purchasing"
          >
            Purchasing
          </button>
          <button
            className="btn-quick-role"
            onClick={() => handleQuickSwitch('joko_gudang')}
            title="Masuk sebagai Staff Gudang"
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
              title="Keluar / Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button className="btn-primary" onClick={onOpenLogin}>
            <UserCheck size={16} />
            <span>Masuk Sistem</span>
          </button>
        )}
      </div>
    </header>
  );
};
