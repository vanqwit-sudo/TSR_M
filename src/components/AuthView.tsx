import { useState } from 'react';
import type { UserProfile } from '../utils/data';

interface Props {
  onLoginPhone: (phone: string, password: string) => void;
  onLoginGoogle: (email: string, password: string) => void;
  onRegister: (payload: UserProfile & { phone: string; password: string }) => void;
  error: string | null;
}

export default function AuthView({ onLoginPhone, onLoginGoogle, onRegister, error }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [googlePassword, setGooglePassword] = useState('');
  const [username, setUsername] = useState('@newuser');
  const [displayName, setDisplayName] = useState('Новый пользователь');
  const [bio, setBio] = useState('Привет, я в TSR_M');
  const [statusEmoji, setStatusEmoji] = useState('🙂');

  const normalizedPhone = phone.trim();
  const normalizedPassword = password.trim();

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-tab-bar">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Вход
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
            Регистрация
          </button>
        </div>
        {mode === 'login' ? (
          <div className="auth-form">
            <label>
              Телефон
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+70000000001"
              />
            </label>
            <label>
              Пароль
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button type="button" onClick={() => onLoginPhone(normalizedPhone, normalizedPassword)}>
              Войти по номеру
            </button>
            <div className="auth-separator">или</div>
            <label>
              Google Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
              />
            </label>
            <label>
              Пароль
              <input
                type="password"
                value={googlePassword}
                onChange={(e) => setGooglePassword(e.target.value)}
              />
            </label>
            <button type="button" onClick={() => onLoginGoogle(email.trim(), googlePassword.trim())}>
              Войти через Google
            </button>
          </div>
        ) : (
          <div className="auth-form">
            <label>
              Имя пользователя
              <input value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label>
              Отображаемое имя
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </label>
            <label>
              Телефон
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+70000000003"
              />
            </label>
            <label>
              Пароль
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label>
              Описание
              <input value={bio} onChange={(e) => setBio(e.target.value)} />
            </label>
            <label>
              Эмодзи-статус
              <input value={statusEmoji} onChange={(e) => setStatusEmoji(e.target.value)} />
            </label>
            <button
              type="button"
              onClick={() =>
                onRegister({
                  id: '',
                  username,
                  displayName,
                  bio,
                  statusEmoji,
                  avatarUrl: 'https://via.placeholder.com/120',
                  borderColor: '#4f46e5',
                  nameColor: '#111827',
                  phone: normalizedPhone,
                  password: normalizedPassword,
                })
              }
            >
              Зарегистрироваться
            </button>
          </div>
        )}
        {error ? <div className="auth-error">{error}</div> : null}
      </div>
    </div>
  );
}
