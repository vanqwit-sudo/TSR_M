import { useState } from 'react';

interface Props {
  onSignIn: (username: string) => void;
}

export default function AuthView({ onSignIn }: Props) {
  const [name, setName] = useState('');
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h2>Вход</h2>
        <input placeholder="Имя пользователя" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={() => name.trim() && onSignIn(name.trim())}>Войти</button>
        <p className="muted">Локальный демонстрационный вход — без пароля.</p>
      </div>
    </div>
  );
}
