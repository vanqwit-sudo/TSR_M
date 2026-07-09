import type { User } from '../utils/data';
import Avatar from './Avatar';

interface Props {
  users: User[];
  onSelectUser?: (user: User) => void;
}

export default function UserList({ users, onSelectUser }: Props) {
  return (
    <div className="user-list">
      <div className="chat-list-header">Пользователи</div>
      {users.length === 0 ? (
        <div className="empty-search">Никого не найдено</div>
      ) : (
        users.map((user) => (
          <div
            key={user.id}
            className="user-item"
            role="button"
            tabIndex={0}
            onClick={() => onSelectUser?.(user)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectUser?.(user);
              }
            }}
          >
            <div className="user-avatar avatar-wrapper">
              <Avatar src={user.avatarUrl} alt={user.displayName} name={user.displayName} className="avatar-small" size={56} />
              <span className="status-dot">{user.statusEmoji}</span>
            </div>
            <div className="user-item-info">
              <div className="user-title">{user.displayName}</div>
              <div className="user-meta">{user.username}</div>
              <div className="user-bio">{user.bio}</div>
              <div className={`presence-chip ${user.isOnline ? 'online' : 'offline'}`}>{user.isOnline ? 'В сети' : 'Не в сети'}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
