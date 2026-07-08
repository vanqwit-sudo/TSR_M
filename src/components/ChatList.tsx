import type { Chat } from '../utils/data';
import Avatar from './Avatar';

interface Props {
  chats: Chat[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export default function ChatList({ chats, activeId, onSelect }: Props) {
  return (
    <div className="chat-list">
      {chats.length === 0 ? (
        <div className="empty-search">Нет чатов</div>
      ) : (
        chats.map((chat) => {
          const title = chat.title || 'Переписка';
          const last = chat.messages[chat.messages.length - 1];
          return (
            <button key={chat.id} type="button" className={`chat-item ${activeId === chat.id ? 'active' : ''}`} onClick={() => onSelect(chat.id)}>
              <div className="left">
                <Avatar src={chat.avatarUrl} alt={title} name={title} size={44} />
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
