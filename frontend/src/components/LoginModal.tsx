import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, LogIn, ShieldCheck, X } from 'lucide-react';

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
      onShowToast('Mohon masukkan username/email dan password', 'error');
      return;
    }

    try {
      setLoading(true);
      await login(identifier, password);
      onShowToast('Berhasil masuk ke sistem!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      onShowToast(err.message || 'Gagal masuk sistem', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuick = async (username: string) => {
    try {
      setLoading(true);
      await quickLogin(username);
      onShowToast(`Berhasil masuk sebagai ${username}`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      onShowToast(err.message || 'Gagal masuk sistem', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <KeyRound size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="modal-title">Masuk ke Sistem WMS Logistics</h3>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username atau Email</label>
            <input
              type="text"
              className="form-control"
              placeholder="Contoh: bapak_manager atau manager@wms.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Kata Sandi (Password)</label>
            <input
              type="password"
              className="form-control"
              placeholder="Masukkan password..."
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
            <LogIn size={16} />
            <span>{loading ? 'Memvalidasi...' : 'Masuk Sistem'}</span>
          </button>
        </form>

        <div style={{ margin: '20px 0 10px 0', borderTop: '1px solid var(--border-default)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <ShieldCheck size={16} style={{ color: 'var(--accent-blue)' }} />
            <span>Pilih Cepat Akun Demo (Default Password: password123):</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.75rem', justifyContent: 'center', padding: '7px' }}
              onClick={() => handleQuick('bapak_manager')}
              disabled={loading}
            >
              Manager
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.75rem', justifyContent: 'center', padding: '7px' }}
              onClick={() => handleQuick('andi_purchasing')}
              disabled={loading}
            >
              Purchasing
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.75rem', justifyContent: 'center', padding: '7px' }}
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
