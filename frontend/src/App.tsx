import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, type TabType } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { OverviewView } from './views/OverviewView';
import { InventoryView } from './views/InventoryView';
import { PurchaseOrdersView } from './views/PurchaseOrdersView';
import { TransactionsView } from './views/TransactionsView';
import { TransferView } from './views/TransferView';
import { OpnameView } from './views/OpnameView';
import { MasterDataView } from './views/MasterDataView';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showLoginModal, setShowLoginModal] = useState<boolean>(!isAuthenticated);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <div className="app-container">

      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Header
          activeTab={activeTab}
          onOpenLogin={() => setShowLoginModal(true)}
          onShowToast={showToast}
        />

        <main className="view-viewport">
          {activeTab === 'overview' && (
            <OverviewView
              onShowToast={showToast}
              onNavigateTab={(tab: TabType) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              onShowToast={showToast}
              onNavigateTab={(tab: TabType) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'pos' && (
            <PurchaseOrdersView onShowToast={showToast} />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView onShowToast={showToast} />
          )}

          {activeTab === 'transfer' && (
            <TransferView
              onShowToast={showToast}
              onNavigateTab={(tab: TabType) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'opname' && (
            <OpnameView
              onShowToast={showToast}
              onNavigateTab={(tab: TabType) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'master' && (
            <MasterDataView onShowToast={showToast} />
          )}
        </main>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => setShowLoginModal(false)}
        onShowToast={showToast}
      />

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' && <CheckCircle2 size={16} />}
            {t.type === 'error' && <AlertCircle size={16} />}
            {t.type === 'info' && <Info size={16} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
