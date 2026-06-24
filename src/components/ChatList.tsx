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
      <div className="chat-list-header">Чаты</div>
      {chats.length === 0 ? (
        <div className="empty-search">Чатов не найдено</div>
      ) : (
        chats.map((chat) => {
          const members = users.filter((user) => chat.members.includes(user.id));
          const otherMembers = members.filter((member) => member.id !== null);
          const participantNames = otherMembers
            .map((member) => member.displayName)
            .slice(0, 2)
            .join(', ');

          return (
            <button
              key={chat.id}
              className={`chat-item ${activeId === chat.id ? 'active' : ''}`}
              onClick={() => onSelect(chat.id)}
            >
              <div className="chat-item-heading">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div className="chat-room-avatars">
                    {members.slice(0, 2).map((m) => (
                      <div key={m.id} className="avatar-small-wrapper">
                        <Avatar src={m.avatarUrl} alt={m.displayName} name={m.displayName} className="avatar-small" size={44} />
                        <span className="status-dot status-dot-small">{m.statusEmoji}</span>
                      </div>
                    ))}
                  </div>
                  <div className="chat-title">{chat.title || participantNames}</div>
                </div>
                <div className="chat-meta">{chat.isGroup ? 'Группа' : 'Переписка'}</div>
              </div>
              <div className="chat-item-row">
                <div className="chat-snippet">{participantNames || 'Новый чат'}</div>
                <div className="chat-badge">{chat.members.length}</div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
