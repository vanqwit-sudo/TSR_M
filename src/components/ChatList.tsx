import type { Chat, User } from '../utils/data';
import Avatar from './Avatar';

interface Props {
  chats: Chat[];
  users: User[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export default function ChatList({ chats, users, activeId, onSelect }: Props) {
  return (
    <div className="chat-list">
      {chats.length === 0 ? (
        <div className="empty-search">Нет чатов</div>
      ) : (
        chats.map((chat) => {
          const members = users.filter((u) => chat.members.includes(u.id));
          const title = chat.title || members.map((m) => m.displayName).slice(0, 2).join(', ') || 'Новый чат';
          const last = chat.messages[chat.messages.length - 1];
          return (
            <button key={chat.id} type="button" className={`chat-item ${activeId === chat.id ? 'active' : ''}`} onClick={() => onSelect(chat.id)}>
              <div className="left">
                <Avatar src={chat.avatarUrl || members[0]?.avatarUrl} alt={title} name={title} size={44} />
              </div>
              <div className="center">
                <div className="title">{title}</div>
                <div className="snippet">{last?.text ?? 'Нет сообщений'}</div>
              </div>
              <div className="right">{last ? new Date(last.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
            </button>
          );
        })
      )}
    </div>
  );
}
