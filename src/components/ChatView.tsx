import { useEffect, useRef, useState } from 'react';
import type { Chat, Message, User } from '../utils/data';
import Avatar from './Avatar';

interface Props {
  chat: Chat;
  currentUser: User;
  onSend: (text: string, imageUrl?: string) => void;
}

export default function ChatView({ chat, currentUser, onSend }: Props) {
  const [draft, setDraft] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages.length]);

  const handleSend = () => {
    if (!draft.trim() && !imagePreview) return;
    onSend(draft.trim(), imagePreview ?? undefined);
    setDraft('');
    setImagePreview(null);
  };

  const highlightText = (text: string) => {
    const parts = text.split(/(@[\w-]+)/g);
    return parts.map((part, index) =>
      part.startsWith('@') ? (
        <span key={index} className="mention">
          {part}
        </span>
      ) : (
        <span key={index}>{part}</span>
      ),
    );
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => setImagePreview(null);

  return (
    <div className="chat-view clean">
      <header className="chat-header">
        <div className="title">{chat.title || 'Чат'}</div>
        <div className="meta">{chat.isGroup ? `${chat.members.length} участников` : 'Переписка'}</div>
      </header>

      <div className="messages">
        {chat.messages.length === 0 ? (
          <div className="no-messages">Здесь пока нет сообщений</div>
        ) : (
          chat.messages.map((m: Message) => (
            <div key={m.id} className={`message ${m.senderId === currentUser.id ? 'mine' : 'other'}`}>
              {m.senderId !== currentUser.id && <Avatar src={undefined} alt="user" name="U" size={32} />}
              <div className="bubble">
                {m.imageUrl ? <img src={m.imageUrl} alt="attachment" className="message-image" /> : null}
                <div className={`text ${m.text?.includes(`@${currentUser.username}`) ? 'text-mention' : ''}`}>
                  {highlightText(m.text)}
                </div>
                <div className="time">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="composer">
        <label className="composer-file">
          <input type="file" accept="image/*" onChange={handleImageUpload} />
          📎
        </label>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Напишите сообщение..." onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSend())} />
        <button className="send" onClick={handleSend} aria-label="send">➤</button>
      </div>
      {imagePreview ? (
        <div className="composer-attachment">
          <img src={imagePreview} alt="preview" />
          <button type="button" onClick={removeImage} className="remove-image">
            ✕
          </button>
        </div>
      ) : null}
    </div>
  );
}
