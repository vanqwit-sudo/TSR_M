import { useState } from 'react';
import type { User } from '../utils/data';

interface Props {
  onCreate: (title: string, memberIds: string[]) => void;
  users: User[];
}

export default function CreateChat({ onCreate, users }: Props) {
  const [title, setTitle] = useState('');

  return (
    <div className="create-chat-compact">
      <input placeholder="Новый чат" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button onClick={() => { if (title.trim()) { onCreate(title.trim(), users.map(u => u.id)); setTitle(''); } }}>Создать</button>
    </div>
  );
}
