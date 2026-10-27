import React, { useState } from 'react';
import { Lock, ArrowRight, UserCheck } from 'lucide-react';

interface AuthModalProps {
  onLoginSuccess: (email: string) => void;
  onContinueAsGuest: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onLoginSuccess,
  onContinueAsGuest
}) => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('alexdovale222@gmail.com');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Por favor, informe e-mail e senha.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve conter ao menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(email.trim());
    }, 400);
  };

  return (
    <div
      id="screen-lock"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#000',
        padding: '20px'
      }}
    >
      <div
        className="lock-box"
        style={{
          background: '#111',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '32px 28px',
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
          color: '#fff'
        }}
      >
        <img
          src="/assets/img/logo-ercr.png"
          alt="ERCR Engenharia Mecânica"
          style={{ maxWidth: '180px', margin: '0 auto 20px auto', display: 'block' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://raw.githubusercontent.com/alexdovale/ercr-engenharia-checklist/main/assets/img/logo-ercr.png';
          }}
        />

        <div
          className="lock-title"
          style={{
            fontSize: '13px',
            fontWeight: '700',
            letterSpacing: '1px',
            marginBottom: '16px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Lock size={15} color="#4caf50" />
          CHECKLIST DE INSPEÇÃO VEICULAR
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <p style={{ color: '#aaa', fontSize: '13px', textAlign: 'center', marginBottom: '18px' }}>
            {isSignup
              ? 'Crie sua conta de acesso ao checklist da ERCR.'
              : 'Entre com seu e-mail e senha para acessar o sistema.'}
          </p>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#222',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#222',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
          </div>

          {error && (
            <div
              style={{
                background: '#FFEBEE',
                color: '#B71C1C',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
                marginBottom: '14px'
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#2E7D32',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {loading ? 'Entrando...' : isSignup ? 'Criar Conta e Entrar' : 'Entrar no Sistema'}
            <ArrowRight size={15} />
          </button>
        </form>

        <div style={{ marginTop: '16px', fontSize: '12px', color: '#888' }}>
          {isSignup ? (
            <span>
              Já tem conta?{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setIsSignup(false);
                }}
                style={{ color: '#4caf50', textDecoration: 'none', fontWeight: '600' }}
              >
                Entrar
              </a>
            </span>
          ) : (
            <span>
              Não tem conta?{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setIsSignup(true);
                }}
                style={{ color: '#4caf50', textDecoration: 'none', fontWeight: '600' }}
              >
                Criar conta
              </a>
            </span>
          )}
        </div>

        <div style={{ margin: '20px 0 10px 0', borderTop: '1px solid #222', paddingTop: '16px' }}>
          <button
            type="button"
            onClick={onContinueAsGuest}
            style={{
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: '4px',
              padding: '8px 14px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <UserCheck size={14} color="#4caf50" />
            Entrar como Engenheiro Convidado (Modo Rápido)
          </button>
        </div>
      </div>
    </div>
  );
};
