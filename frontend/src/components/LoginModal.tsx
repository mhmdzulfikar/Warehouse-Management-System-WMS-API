import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, LogIn, ShieldCheck, X, UserCheck } from 'lucide-react';

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
      onShowToast('Please provide your Enterprise Username/Email and Password', 'error');
      return;
    }

    try {
      setLoading(true);
      await login(identifier, password);
      onShowToast('Authentication successful. Welcome to WMS Nexus!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      onShowToast(err.message || 'Authentication failed. Check credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuick = async (username: string, label: string) => {
    try {
      setLoading(true);
      await quickLogin(username);
      onShowToast(`Authenticated as ${label} (${username})`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      onShowToast(err.message || 'Quick login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#0f172a', color: '#ffffff', padding: '6px', borderRadius: '6px' }}>
              <KeyRound size={18} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.05rem', margin: 0 }}>Enterprise Single Sign-On</h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WMS Nexus Global Logistics Access</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '4px 0' }}>
          <div className="form-group">
            <label className="form-label">Username or Corporate Email</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. marcus.director@wms-nexus.io"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Security Credentials (Password)</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter credentials..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '12px', padding: '10px' }}
            disabled={loading}
          >
            <LogIn size={16} />
            <span>{loading ? 'Authenticating...' : 'Sign In to WMS Nexus'}</span>
          </button>
        </form>

        <div style={{ margin: '16px 0 6px 0', borderTop: '1px solid var(--border-default)', paddingTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            <ShieldCheck size={16} style={{ color: '#2563eb' }} />
            <span>Instant Demo Switcher (Password: <code>password123</code>):</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.76rem', justifyContent: 'flex-start', padding: '8px 10px' }}
              onClick={() => handleQuick('ops_director', 'Operations Director')}
              disabled={loading}
            >
              <UserCheck size={14} style={{ color: '#2563eb' }} />
              <span>Operations Director</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.76rem', justifyContent: 'flex-start', padding: '8px 10px' }}
              onClick={() => handleQuick('inv_supervisor', 'Inbound Lead')}
              disabled={loading}
            >
              <UserCheck size={14} style={{ color: '#059669' }} />
              <span>Inbound & PO Lead</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.76rem', justifyContent: 'flex-start', padding: '8px 10px' }}
              onClick={() => handleQuick('logistics_lead', 'Logistics Specialist')}
              disabled={loading}
            >
              <UserCheck size={14} style={{ color: '#d97706' }} />
              <span>Logistics Specialist</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.76rem', justifyContent: 'flex-start', padding: '8px 10px' }}
              onClick={() => handleQuick('sysadmin', 'Super Administrator')}
              disabled={loading}
            >
              <UserCheck size={14} style={{ color: '#475569' }} />
              <span>System Admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
