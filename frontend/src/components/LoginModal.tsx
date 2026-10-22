import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, LogIn, ShieldAlert, X } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onShowToast,
}) => {
  const { login, quickLogin } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      onShowToast('Please provide username/email and password', 'error');
      return;
    }

    try {
      setLoading(true);
      await login(identifier, password);
      onShowToast('Logged in successfully!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      onShowToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuick = async (username: string) => {
    try {
      setLoading(true);
      await quickLogin(username);
      onShowToast(`Logged in as ${username}`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      onShowToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <KeyRound className="accent-indigo" size={24} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="modal-title">Sign In to WMS Nexus</h3>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username or Email</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. bapak_manager or manager@wms.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
            disabled={loading}
          >
            <LogIn size={18} />
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        <div style={{ margin: '24px 0 14px 0', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <ShieldAlert size={16} style={{ color: 'var(--accent-amber)' }} />
            <span>Or Quick Sign In with Seed Demo Accounts:</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.78rem', justifyContent: 'center', padding: '8px' }}
              onClick={() => handleQuick('bapak_manager')}
              disabled={loading}
            >
              Manager
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.78rem', justifyContent: 'center', padding: '8px' }}
              onClick={() => handleQuick('andi_purchasing')}
              disabled={loading}
            >
              Purchasing
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.78rem', justifyContent: 'center', padding: '8px' }}
              onClick={() => handleQuick('joko_gudang')}
              disabled={loading}
            >
              Staff Gudang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
