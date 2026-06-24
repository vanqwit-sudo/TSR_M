import { useEffect, useMemo, useState } from 'react';
import { ThemeContext, themeStyles } from './utils/theme';
import { DeviceContext, getDeviceType } from './utils/device';
import type { Chat, User, UserProfile } from './utils/data';
import {
  addParticipants,
  addReaction,
  createChat,
  deleteChat,
  deleteMessage,
  getAllUsers,
  getChatsForUser,
  getCurrentUser,
  loginWithGoogle,
  loginWithPhone,
  logout,
  pinMessage,
  registerWithPhone,
  sendMessage,
  updateChat,
  updateUserProfile,
  voteDeleteChat,
} from './utils/mockApi';
import ProfileEditor from './components/ProfileEditor';
import ChatList from './components/ChatList';
import Avatar from './components/Avatar';
import ChatView from './components/ChatView';
import AuthView from './components/AuthView';
import CreateChat from './components/CreateChat';
import UserList from './components/UserList';
import './styles.css';

function loadPersistedProfile(user: User | null) {
  if (!user || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`profile_${user.id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return parsed;
  } catch {
    return null;
  }
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchMode, setSearchMode] = useState<'chats' | 'users'>('chats');
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileViewerUser, setProfileViewerUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [device] = useState(getDeviceType());

  useEffect(() => {
    loadInitialState();
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
    return () => {
      document.body.dataset.theme = 'light';
    };
  }, [theme]);

  useEffect(() => {
    if (!currentUser) return;

    const refreshTimer = window.setInterval(() => {
      refreshChats();
    }, 5000);

    const handleFocus = () => {
      refreshChats();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser, activeChatId]);

  const loadInitialState = async () => {
    setLoading(true);
    const user = await getCurrentUser();
    const allUsers = await getAllUsers();
    const restoredProfile = loadPersistedProfile(user);
    const hydratedUser = user && restoredProfile ? { ...user, ...restoredProfile } : user;
    setCurrentUser(hydratedUser);
    setUsers(allUsers.map((item) => (item.id === hydratedUser?.id ? { ...item, ...restoredProfile } : item)));

    if (hydratedUser) {
      const userChats = await getChatsForUser(hydratedUser.id);
      setChats(userChats);
      setActiveChatId(userChats[0]?.id ?? null);
    }

    setLoading(false);
  };

  const refreshChats = async () => {
    if (!currentUser) return;
    const userChats = await getChatsForUser(currentUser.id);
    setChats(userChats);
    if (!userChats.some((chat) => chat.id === activeChatId)) {
      setActiveChatId(userChats[0]?.id ?? null);
    }
  };

  const handleLoginPhone = async (phone: string, password: string) => {
    setAuthError(null);
    try {
      const user = await loginWithPhone(phone, password);
      if (!user) {
        setAuthError('Неверный номер или пароль');
        return;
      }
      setCurrentUser(user);
      await refreshChats();
    } catch {
      setAuthError('Не удалось войти по номеру');
    }
  };

  const handleGoogleLogin = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const user = await loginWithGoogle(email, password);
      setCurrentUser(user);
      await refreshChats();
    } catch {
      setAuthError('Не удалось войти через Google');
    }
  };

  const handleRegister = async (payload: UserProfile & { phone: string; password: string }) => {
    setAuthError(null);
    const user = await registerWithPhone(payload);
    if (!user) {
      setAuthError('Номер или никнейм уже используются');
      return;
    }
    setCurrentUser(user);
    await refreshChats();
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setChats([]);
    setActiveChatId(null);
  };

  const handleProfileUpdate = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = await updateUserProfile(currentUser.id, updates);
    if (updated) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`profile_${updated.id}`, JSON.stringify(updated));
      }
      setCurrentUser(updated);
      setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
    }
  };

  const handleCreateChat = async (title: string, participants: string, isGroup: boolean) => {
    if (!currentUser) return;
    await createChat(title, participants.split(',').map((value) => value.trim()).filter(Boolean), isGroup, currentUser.id);
    await refreshChats();
  };

  const handleSendMessage = async (chatId: string, text: string, imageUrl?: string, stickerUrl?: string, voiceUrl?: string) => {
    if (!currentUser) return;
    await sendMessage(chatId, currentUser.id, text, imageUrl, stickerUrl, voiceUrl);
    await refreshChats();
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    const updated = await addReaction(messageId, currentUser.id, emoji);
    if (!updated) return;
    setChats((prev) => prev.map((chat) => (chat.id === activeChatId ? updated : chat)));
  };

  const handlePinMessage = async (chatId: string, messageId: string | null) => {
    const updated = await pinMessage(chatId, messageId);
    if (!updated) return;
    setChats((prev) => prev.map((chat) => (chat.id === chatId ? updated : chat)));
  };

  const handleVoteDelete = async (chatId: string) => {
    if (!currentUser) return;
    await voteDeleteChat(chatId, currentUser.id);
    await refreshChats();
  };

  const handleUpdateChat = async (chatId: string, changes: Partial<Chat>) => {
    const updated = await updateChat(chatId, changes);
    if (!updated) return;
    setChats((prev) => prev.map((chat) => (chat.id === chatId ? updated : chat)));
  };

  const handleDeleteChat = async (chatId: string) => {
    const ok = await deleteChat(chatId);
    if (!ok) return;
    setChats((prev) => {
      const next = prev.filter((chat) => chat.id !== chatId);
      if (activeChatId === chatId) {
        setActiveChatId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const handleDeleteMessage = async (messageId: string, scope: 'forMe' | 'forEveryone') => {
    if (!currentUser) return;
    const updated = await deleteMessage(messageId, currentUser.id, scope);
    if (!updated) return;
    setChats((prev) => prev.map((chat) => (chat.id === activeChatId ? updated : chat)));
  };

  const handleAddParticipants = async (chatId: string, participantIds: string[]) => {
    if (!currentUser) return;
    const updated = await addParticipants(chatId, currentUser.id, participantIds);
    if (!updated) return;
    setChats((prev) => prev.map((chat) => (chat.id === chatId ? updated : chat)));
  };

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [activeChatId, chats],
  );

  const filteredChats = useMemo(() => {
    if (!currentUser) return chats;
    if (!search.trim()) return chats;
    const query = search.toLowerCase();
    return chats.filter((chat) => {
      const usersText = chat.members
        .map((memberId) => users.find((user) => user.id === memberId)?.username ?? '')
        .join(' ')
        .toLowerCase();
      return chat.title.toLowerCase().includes(query) || usersText.includes(query);
    });
  }, [search, chats, users, currentUser]);

  const searchResults = useMemo(() => {
    if (searchMode === 'chats') {
      return filteredChats;
    }

    const query = search.toLowerCase().trim();
    if (!query) {
      return users;
    }

    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(query) ||
        user.displayName.toLowerCase().includes(query) ||
        user.bio.toLowerCase().includes(query),
    );
  }, [searchMode, search, filteredChats, users]);

  const activeChatMembers = useMemo(
    () => (activeChat ? users.filter((user) => activeChat.members.includes(user.id)) : []),
    [activeChat, users],
  );

  const chatResults = searchMode === 'chats' ? (searchResults as Chat[]) : filteredChats;
  const userResults = searchMode === 'users' ? (searchResults as User[]) : users;

  const appStyle = themeStyles[theme];

  if (loading) {
    return <div className="loading-screen">Загрузка TSR_M...</div>;
  }

  if (!currentUser) {
    return (
      <div className="app auth-app" style={appStyle.app}>
        <AuthView
          onLoginPhone={handleLoginPhone}
          onLoginGoogle={handleGoogleLogin}
          onRegister={handleRegister}
          error={authError}
        />
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <DeviceContext.Provider value={device}>
        <div className={`app ${theme}`} style={appStyle.app}>
          <button
            type="button"
            className={`sidebar-toggle-pill ${sidebarOpen ? 'open' : 'closed'}`}
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={sidebarOpen ? 'Скрыть меню' : 'Открыть меню'}
          >
            TSR_M
          </button>
          <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`} style={appStyle.sidebar}>
            <div className="sidebar-topbar">
              <div className="brand">TSR_M</div>
              <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="theme-toggle">
                {theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
              </button>
            </div>
            <div className="sidebar-profile-summary">
              <div className="avatar-wrapper">
                <Avatar className="sidebar-avatar" src={currentUser.avatarUrl} alt="avatar" name={currentUser.displayName} size={52} />
                <span className="status-dot status-dot-small">{currentUser.statusEmoji}</span>
              </div>
              <div className="sidebar-profile-text">
                <div className="sidebar-profile-name">{currentUser.displayName}</div>
                <div className="sidebar-profile-username">{currentUser.username}</div>
              </div>
            </div>
            <div className="sidebar-block">
              <div className="sidebar-top">
                <div className="sidebar-title">Управление</div>
                <button className="sidebar-action" type="button" onClick={() => setShowProfile((prev) => !prev)}>
                  {showProfile ? 'Скрыть профиль' : 'Редактировать'}
                </button>
                <button className="sidebar-action" type="button" onClick={() => setShowCreateChat((prev) => !prev)}>
                  {showCreateChat ? 'Скрыть чат' : 'Новый чат'}
                </button>
              </div>
              {showProfile && <ProfileEditor profile={currentUser} onUpdate={handleProfileUpdate} />}
              {showCreateChat && <CreateChat onCreate={handleCreateChat} />}
            </div>
            <div className="sidebar-block">
              <div className="sidebar-title">Поиск</div>
              <div className="search-section">
                <input
                  type="text"
                  placeholder="Поиск по чатам и @username"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="search-mode">
                  <button type="button" className={searchMode === 'chats' ? 'active' : ''} onClick={() => setSearchMode('chats')}>
                    Чаты
                  </button>
                  <button type="button" className={searchMode === 'users' ? 'active' : ''} onClick={() => setSearchMode('users')}>
                    Пользователи
                  </button>
                </div>
              </div>
            </div>
            <div className="sidebar-block chat-list-block">
              {searchMode === 'users' ? (
                <UserList users={userResults} onSelectUser={setProfileViewerUser} />
              ) : (
                <ChatList chats={chatResults} users={users} activeId={activeChatId} onSelect={setActiveChatId} />
              )}
            </div>
            <button className="logout-button" onClick={handleLogout}>
              Выйти
            </button>
          </aside>
          <main className="chat-panel" style={appStyle.chatPanel}>
            {activeChat ? (
              <ChatView
                chat={activeChat}
                currentUser={currentUser}
                members={activeChatMembers}
                onSend={handleSendMessage}
                onVoteDelete={handleVoteDelete}
                onUpdateChat={handleUpdateChat}
                onDeleteChat={handleDeleteChat}
                onDeleteMessage={handleDeleteMessage}
                onAddParticipants={handleAddParticipants}
                onReact={handleAddReaction}
                onPinMessage={handlePinMessage}
              />
            ) : (
              <div className="empty-state">Выберите чат или создайте новый</div>
            )}
          </main>
          {profileViewerUser ? (
            <div className="overlay-panel" role="dialog" aria-modal="true">
              <div className="overlay-card">
                <div className="overlay-card-header">
                  <h3>Профиль пользователя</h3>
                  <button type="button" className="secondary-button" onClick={() => setProfileViewerUser(null)}>Закрыть</button>
                </div>
                <div className="profile-preview-card">
                  <div className="avatar-wrapper">
                    <Avatar src={profileViewerUser.avatarUrl} alt={profileViewerUser.displayName} name={profileViewerUser.displayName} size={92} />
                    <span className="status-badge">{profileViewerUser.statusEmoji}</span>
                  </div>
                  <div className="profile-preview-card-info">
                    <div className="profile-name">{profileViewerUser.displayName}</div>
                    <div className="chat-subtitle">{profileViewerUser.username}</div>
                    <div className="chat-subtitle">{profileViewerUser.bio}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </DeviceContext.Provider>
    </ThemeContext.Provider>
  );
}

export default App;
