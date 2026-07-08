import type { User } from '../utils/data';

interface Props {
  users: User[];
  onSelectUser?: (user: User) => void;
}

export default function UserList({ users, onSelectUser }: Props) {
  return (
    <div className="user-list compact">
      {users.length === 0 ? (
        <div className="empty">Нет пользователей</div>
      ) : (
        users.map((u) => (
          <button key={u.id} type="button" className="user-row" onClick={() => onSelectUser?.(u)}>
            <div className="user-left">{u.displayName}</div>
            <div className={`presence ${u.isOnline ? 'online' : 'offline'}`}>{u.isOnline ? '●' : ''}</div>
          </button>
        ))
      )}
    </div>
  );
}
