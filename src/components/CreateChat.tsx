import { useState } from 'react';

interface Props {
  onCreate: (title: string, participants: string, isGroup: boolean) => void;
}

export default function CreateChat({ onCreate }: Props) {
  const [title, setTitle] = useState('');
  const [participants, setParticipants] = useState('');
  const [isGroup, setIsGroup] = useState(false);

  return (
    <div className="create-chat-card">
      <h3>Создать чат</h3>
      <label>
        Название
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Новый чат" />
      </label>
      <label>
        Участники (@username через запятую)
        <input value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="@friend, @hero" />
      </label>
      <div className="group-toggle">
        <label>
          <input type="checkbox" checked={isGroup} onChange={(e) => setIsGroup(e.target.checked)} /> Группа
        </label>
      </div>
      <button type="button" onClick={() => onCreate(title, participants, isGroup)}>
        Создать
      </button>
    </div>
  );
}
