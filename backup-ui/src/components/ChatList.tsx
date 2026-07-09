import type { Chat, User } from '../utils/data';
import Avatar from './Avatar';

interface Props {
  chats: Chat[];
  users: User[];
  activeId: string | null;
  unreadCounts?: Record<string, number>;
  highlightedChatId?: string | null;
  onSelect: (id: string) => void;
}

export default function ChatList({ chats, users, activeId, unreadCounts = {}, highlightedChatId = null, onSelect }: Props) {
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
              className={`chat-item ${activeId === chat.id ? 'active' : ''} ${unreadCounts[chat.id] ? 'unread' : ''} ${highlightedChatId === chat.id ? 'new-message' : ''}`}
              onClick={() => onSelect(chat.id)}
            >
              <div className="chat-item-heading">
                <div className="chat-item-main">
                  <div className="chat-room-avatars">
                    {members.slice(0, 2).map((m) => (
                      <div key={m.id} className="avatar-small-wrapper">
                        <Avatar src={m.avatarUrl} alt={m.displayName} name={m.displayName} className="avatar-small" size={44} />
                        <span className="status-dot status-dot-small">{m.statusEmoji}</span>
                      </div>
                    ))}
                  </div>
                  <div className="chat-item-text">
                    <div className="chat-title">{chat.title || participantNames}</div>
                    <div className="chat-snippet">{participantNames || 'Новый чат'}</div>
                  </div>
                </div>
                <div className="chat-meta-badge">{chat.isGroup ? 'Группа' : 'Личка'}</div>
              </div>
              <div className="chat-item-row">
                <div className="chat-meta">{chat.members.length} участник{chat.members.length === 1 ? '' : 'а'}</div>
                <div className="chat-badge">{unreadCounts[chat.id] ? unreadCounts[chat.id] : chat.messages.length}</div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
