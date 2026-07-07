import { useEffect, useMemo, useRef, useState } from 'react';
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
  searchUsers,
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

const APP_STATE_STORAGE_KEY = 'tsr_m_app_state_v1';
const PRESENCE_TTL_MS = 30_000;
const PRESENCE_PULSE_MS = 10_000;

function playIncomingMessageSound(enabled = true) {
  if (!enabled) return;
  if (typeof window === 'undefined') return;
  const AudioContextCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(1320, context.currentTime + 0.12);

  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.05, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.25);
  void context.close().catch(() => undefined);
}

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

function readPersistedAppState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { currentUser: User | null; users: User[]; chats: Chat[]; activeChatId: string | null };
    return parsed;
  } catch {
    return null;
  }
}

function writePersistedAppState(currentUser: User | null, users: User[], chats: Chat[], activeChatId: string | null) {
  if (typeof window === 'undefined') return;
  try {
    const validUserIds = new Set(users.filter((user) => user?.id).map((user) => user.id));
    const validChats = chats
      .filter((chat) => chat?.id && Array.isArray(chat.members) && chat.members.some((memberId) => validUserIds.has(memberId)))
      .map((chat) => ({ ...chat, members: chat.members.filter((memberId) => validUserIds.has(memberId)) }))
      .filter((chat) => chat.members.length > 0);

    window.localStorage.setItem(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({ currentUser, users, chats: validChats, activeChatId }),
    );
  } catch {
    // ignore storage errors
  }
}

function App() {
  const theme = 'light' as const;
  const persistedAppState = readPersistedAppState();
  const [currentUser, setCurrentUser] = useState<User | null>(persistedAppState?.currentUser ?? null);
  const [users, setUsers] = useState<User[]>(persistedAppState?.users ?? []);
  const [chats, setChats] = useState<Chat[]>(persistedAppState?.chats ?? []);
  const [activeChatId, setActiveChatId] = useState<string | null>(persistedAppState?.activeChatId ?? null);
  const [search, setSearch] = useState('');
  const [searchMode, setSearchMode] = useState<'chats' | 'users'>('chats');
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth > 760;
  });
  const [profileViewerUser, setProfileViewerUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [highlightedChatId, setHighlightedChatId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [device] = useState(getDeviceType());
  const previousChatsRef = useRef<Chat[]>(persistedAppState?.chats ?? []);

  const syncPresence = (userId?: string | null) => {
    const now = new Date().toISOString();
    setCurrentUser((prev) => (prev ? { ...prev, isOnline: true, lastSeenAt: now } : prev));
    setUsers((prev) => prev.map((user) => (user.id === (userId ?? currentUser?.id) ? { ...user, isOnline: true, lastSeenAt: now } : user)));
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    loadInitialState();
  }, []);

  useEffect(() => {
    document.body.dataset.theme = 'light';
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('tsr_m_theme');
    }
  }, []);

  useEffect(() => {
    writePersistedAppState(currentUser, users, chats, activeChatId);
  }, [currentUser, users, chats, activeChatId]);

  useEffect(() => {
    previousChatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    if (!currentUser?.id || typeof window === 'undefined') return;

    const handleActivity = () => syncPresence(currentUser.id);
    const presenceTimer = window.setInterval(() => {
      const now = Date.now();
      setUsers((prev) => prev.map((user) => {
        if (user.id === currentUser.id) {
          return { ...user, isOnline: true, lastSeenAt: new Date().toISOString() };
        }
        const lastSeenAt = user.lastSeenAt ? Date.parse(user.lastSeenAt) : now - PRESENCE_TTL_MS;
        return { ...user, isOnline: now - lastSeenAt < PRESENCE_TTL_MS };
      }));
      setCurrentUser((prev) => (prev ? { ...prev, isOnline: true, lastSeenAt: new Date().toISOString() } : prev));
    }, PRESENCE_PULSE_MS);

    const refreshTimer = window.setInterval(() => {
      refreshChats();
    }, 5000);

    // Client-side presence simulator to make online/offline indicators feel live
    const presenceSimTimer = window.setInterval(() => {
      setUsers((prev) => prev.map((user) => {
        if (user.id === currentUser.id) return user;
        if (Math.random() < 0.12) {
          const now = Date.now();
          const lastSeen = now - Math.floor(Math.random() * PRESENCE_TTL_MS * 0.6);
          return { ...user, isOnline: Math.random() < 0.5, lastSeenAt: new Date(lastSeen).toISOString() };
        }
        return user;
      }));
    }, 7000);

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('focus', handleActivity);

    handleActivity();

    return () => {
      window.clearInterval(presenceTimer);
      window.clearInterval(refreshTimer);
      window.clearInterval(presenceSimTimer);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('focus', handleActivity);
    };
  }, [currentUser?.id]);

  const loadInitialState = async () => {
    setLoading(true);
    const persistedState = readPersistedAppState();
    if (persistedState?.currentUser) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('tsr_m_current_user_id', persistedState.currentUser.id);
      }
      setCurrentUser(persistedState.currentUser);
      setUsers(persistedState.users ?? []);
      setChats(persistedState.chats ?? []);
      setActiveChatId(persistedState.activeChatId ?? null);
    }

    try {
      const user = await getCurrentUser();
      const allUsers = await getAllUsers();
      const restoredProfile = loadPersistedProfile(user);
      const baseUser = user ?? persistedState?.currentUser ?? null;
      const hydratedUser = baseUser && restoredProfile ? { ...baseUser, ...restoredProfile } : baseUser;
      const nextUsers = allUsers.map((item) => (item.id === hydratedUser?.id ? { ...item, ...restoredProfile } : item));
      const validUserIds = new Set(nextUsers.filter((item) => item?.id).map((item) => item.id));
      const nextChats = (await getChatsForUser(hydratedUser?.id ?? ''))
        .filter((chat) => chat?.id && Array.isArray(chat.members) && chat.members.some((memberId) => validUserIds.has(memberId)))
        .map((chat) => ({ ...chat, members: chat.members.filter((memberId) => validUserIds.has(memberId)) }))
        .filter((chat) => chat.members.length > 0);

      setCurrentUser(hydratedUser);
      setUsers(nextUsers);
      setChats(nextChats);
      setActiveChatId((prev) => {
        if (prev && nextChats.some((chat) => chat.id === prev)) return prev;
        return nextChats[0]?.id ?? null;
      });
    } catch {
      // keep the persisted state if the server is unavailable
    }

    setLoading(false);
  };

  const refreshChats = async () => {
    if (!currentUser) return;
    try {
      const userChats = await getChatsForUser(currentUser.id);
      const previousChats = previousChatsRef.current;

      userChats.forEach((chat) => {
        const previousChat = previousChats.find((item) => item.id === chat.id);
        if (!previousChat) return;
        const previousMessages = previousChat.messages ?? [];
        const nextMessages = chat.messages ?? [];
        if (nextMessages.length <= previousMessages.length) return;

        const incomingMessages = nextMessages.slice(previousMessages.length).filter((message) => message.senderId !== currentUser.id);
        if (!incomingMessages.length) return;

        if (activeChatId === chat.id) {
          setUnreadCounts((prev) => ({ ...prev, [chat.id]: 0 }));
          return;
        }

        setHighlightedChatId(chat.id);
        window.setTimeout(() => {
          setHighlightedChatId((prev) => (prev === chat.id ? null : prev));
        }, 1400);
        setUnreadCounts((prev) => ({ ...prev, [chat.id]: (prev[chat.id] || 0) + incomingMessages.length }));
        playIncomingMessageSound(currentUser?.soundEnabled !== false);
        setUsers((prev) => prev.map((user) => (user.id === incomingMessages[0].senderId ? { ...user, isOnline: true, lastSeenAt: new Date().toISOString() } : user)));
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          const sender = users.find((user) => user.id === incomingMessages[0].senderId);
          new Notification(`${sender?.displayName || 'Новое сообщение'}`, {
            body: incomingMessages[0].text || 'У вас новое сообщение',
            icon: sender?.avatarUrl || '/vite.svg',
          });
        }
      });

      setChats(userChats);
      previousChatsRef.current = userChats;
      if (!userChats.some((chat) => chat.id === activeChatId)) {
        setActiveChatId(userChats[0]?.id ?? null);
      }
    } catch {
      // keep current chats if the server is temporarily unavailable
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
    setUnreadCounts({});
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setUnreadCounts((prev) => ({ ...prev, [chatId]: 0 }));
    syncPresence(currentUser?.id);
    if (typeof window !== 'undefined' && window.innerWidth <= 760) {
      setSidebarOpen(false);
    }
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
      setToastMessage('Профиль сохранён');
      window.setTimeout(() => setToastMessage(null), 2200);
    }
  };

  const handleOpenProfileChat = async (user: User) => {
    if (!currentUser) return;
    const existing = chats.find(
      (chat) => !chat.isGroup && chat.members.includes(currentUser.id) && chat.members.includes(user.id),
    );

    if (existing) {
      setActiveChatId(existing.id);
      setProfileViewerUser(null);
      if (typeof window !== 'undefined' && window.innerWidth <= 760) {
        setSidebarOpen(false);
      }
      return;
    }

    const created = await createChat(user.displayName, [user.username], false, currentUser.id);
    setChats((prev) => [created, ...prev]);
    handleSelectChat(created.id);
    setProfileViewerUser(null);
  };

  const handleCreateChat = async (title: string, participants: string, isGroup: boolean) => {
    if (!currentUser) return;
    const created = await createChat(title, participants.split(',').map((value) => value.trim()).filter(Boolean), isGroup, currentUser.id);
    setChats((prev) => [created, ...prev]);
    handleSelectChat(created.id);
    setShowCreateChat(false);
  };

  const handleSendMessage = async (chatId: string, text: string, imageUrl?: string, stickerUrl?: string, voiceUrl?: string) => {
    if (!currentUser) return;
    syncPresence(currentUser.id);
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
    if (activeChatId === chatId) {
      setActiveChatId((prev) => (prev === chatId ? chatId : prev));
    }
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
    const query = search.toLowerCase().trim().replace(/^@/, '');
    return chats.filter((chat) => {
      const userNames = chat.members
        .map((memberId) => users.find((user) => user.id === memberId))
        .filter(Boolean)
        .map((user) => `${user!.username} ${user!.displayName} ${user!.bio}`.toLowerCase())
        .join(' ');
      return chat.title.toLowerCase().includes(query) || userNames.includes(query) || userNames.replace(/@/g, '').includes(query);
    });
  }, [search, chats, users, currentUser]);

  const searchResults = useMemo(() => {
    if (searchMode === 'chats') {
      return filteredChats;
    }

    const query = search.toLowerCase().trim().replace(/^@/, '');
    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const searchableText = [user.username, user.displayName, user.bio, user.username.replace(/^@/, '')]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(query);
    });
  }, [searchMode, search, filteredChats, users]);

  const activeChatMembers = useMemo(
    () => (activeChat ? users.filter((user) => activeChat.members.includes(user.id)) : []),
    [activeChat, users],
  );

  const chatResults = searchMode === 'chats' ? (searchResults as Chat[]) : filteredChats;
  const userResults = searchMode === 'users' ? userSearchResults : users;

  useEffect(() => {
    let active = true;
    if (searchMode !== 'users') {
      setUserSearchResults(users);
      return;
    }

    const query = search.trim();
    if (!query) {
      setUserSearchResults(users);
      return;
    }

    void (async () => {
      try {
        const results = await searchUsers(query);
        if (active) {
          setUserSearchResults(results);
        }
      } catch {
        if (active) {
          setUserSearchResults(users.filter((user) => `${user.displayName} ${user.username}`.toLowerCase().includes(query.toLowerCase())));
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [search, searchMode, users]);

  const appStyle = themeStyles[theme];
  const isMobileViewport = typeof window !== 'undefined' && window.innerWidth <= 760;

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
    <ThemeContext.Provider value={{ theme, setTheme: () => undefined }}>
      <DeviceContext.Provider value={device}>
        <div className={`app ${theme} ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`} style={appStyle.app}>
          <button
            type="button"
            className={`sidebar-toggle-pill ${sidebarOpen ? 'open' : 'closed'}`}
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={sidebarOpen ? 'Скрыть меню' : 'Открыть меню'}
          >
            ☰
          </button>
          <div className="left-rail" style={appStyle.sidebar}>
            {sidebarOpen ? (
              <div className="sidebar-panel-content">
                <div className="sidebar-topbar">
                  <div className="brand-block">
                    <button type="button" className="brand brand-button" onClick={() => setSidebarOpen((prev) => !prev)}>
                      TSR_M
                    </button>
                    <div className="brand-caption" />
                  </div>
                </div>
                <div className="sidebar-search">
                  <input
                    type="text"
                    placeholder="Поиск по чатам и людям"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="compact-search-mode sidebar-search-mode">
                  <button type="button" className={searchMode === 'chats' ? 'active' : ''} onClick={() => setSearchMode('chats')}>
                    Чаты
                  </button>
                  <button type="button" className={searchMode === 'users' ? 'active' : ''} onClick={() => setSearchMode('users')}>
                    Люди
                  </button>
                </div>
                {!isMobileViewport ? (
                  <>
                    <div className="sidebar-profile-summary">
                      <div className="avatar-wrapper">
                        <Avatar className="sidebar-avatar" src={currentUser.avatarUrl} alt="avatar" name={currentUser.displayName} size={52} />
                        <span className="status-dot status-dot-small">{currentUser.statusEmoji}</span>
                      </div>
                      <div className="sidebar-profile-text">
                        <div className="sidebar-profile-name">{currentUser.displayName}</div>
                        <div className="sidebar-profile-username">{currentUser.username}</div>
                        <div className={`presence-chip ${currentUser.isOnline ? 'online' : 'offline'}`}>{currentUser.isOnline ? 'В сети' : 'Не в сети'}</div>
                      </div>
                    </div>
                    <div className="sidebar-block">
                      <div className="sidebar-top">
                        <div className="sidebar-title">Управление</div>
                        <button className="sidebar-action" type="button" onClick={() => { setShowProfile((prev) => !prev); setShowCreateChat(false); }}>
                          {showProfile ? 'Скрыть профиль' : 'Профиль'}
                        </button>
                        <button className="sidebar-action" type="button" onClick={() => { setShowCreateChat((prev) => !prev); setShowProfile(false); }}>
                          {showCreateChat ? 'Скрыть чат' : 'Новый чат'}
                        </button>
                      </div>
                      {showProfile && <ProfileEditor profile={currentUser} onUpdate={handleProfileUpdate} />}
                      {showCreateChat && <CreateChat onCreate={handleCreateChat} />}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="sidebar-block">
                      <div className="sidebar-top">
                        <div className="sidebar-title">Чаты</div>
                        <button className="sidebar-action" type="button" onClick={() => { setShowCreateChat((prev) => !prev); setShowProfile(false); }}>
                          {showCreateChat ? 'Скрыть чат' : 'Новый чат'}
                        </button>
                      </div>
                      <div className="chat-selector-list mobile-chat-selector-list">
                        {searchMode === 'users' ? (
                          <UserList
                            users={userResults}
                            onSelectUser={(user) => {
                              setProfileViewerUser(user);
                              setSidebarOpen(false);
                            }}
                          />
                        ) : (
                          <ChatList
                            chats={chatResults}
                            users={users}
                            activeId={activeChatId}
                            unreadCounts={unreadCounts}
                            highlightedChatId={highlightedChatId}
                            onSelect={(id) => {
                              handleSelectChat(id);
                              setSidebarOpen(false);
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="sidebar-block">
                      <div className="sidebar-top">
                        <div className="sidebar-title">Управление</div>
                        <button className="sidebar-action" type="button" onClick={() => { setShowProfile((prev) => !prev); setShowCreateChat(false); }}>
                          {showProfile ? 'Скрыть профиль' : 'Профиль'}
                        </button>
                      </div>
                      {showProfile && <ProfileEditor profile={currentUser} onUpdate={handleProfileUpdate} />}
                      {showCreateChat && <CreateChat onCreate={handleCreateChat} />}
                    </div>
                  </>
                )}
                <button className="logout-button" onClick={handleLogout}>
                  Выйти
                </button>
              </div>
            ) : (
              <div className="chat-selector-panel">
                <div className="chat-selector-header">Чаты</div>
                <div className="chat-selector-search">
                  <input
                    type="text"
                    placeholder="Поиск по чатам и людям"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="search-mode compact-search-mode">
                  <button type="button" className={searchMode === 'chats' ? 'active' : ''} onClick={() => setSearchMode('chats')}>
                    Чаты
                  </button>
                  <button type="button" className={searchMode === 'users' ? 'active' : ''} onClick={() => setSearchMode('users')}>
                    Люди
                  </button>
                </div>
                <div className="chat-selector-list">
                  {searchMode === 'users' ? (
                    <UserList
                    users={userResults}
                    onSelectUser={(user) => {
                      setProfileViewerUser(user);
                      if (typeof window !== 'undefined' && window.innerWidth <= 760) {
                        setSidebarOpen(false);
                      }
                    }}
                  />
                  ) : (
                    <ChatList
                      chats={chatResults}
                      users={users}
                      activeId={activeChatId}
                      unreadCounts={unreadCounts}
                      highlightedChatId={highlightedChatId}
                      onSelect={(id) => {
                        handleSelectChat(id);
                        if (typeof window !== 'undefined' && window.innerWidth <= 760) {
                          setSidebarOpen(false);
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
          <main className="chat-panel" style={appStyle.chatPanel}>
            {activeChat ? (
              <>
                <div className="mobile-chat-header">
                  <button type="button" className="mobile-chat-back" onClick={() => setSidebarOpen(true)}>
                    ☰ Чаты
                  </button>
                  <div className="mobile-chat-header-copy">
                    <div className="mobile-chat-title">{activeChat.title}</div>
                    <div className="mobile-chat-subtitle">{activeChat.isGroup ? `${activeChat.members.length} участников` : 'Переписка'}</div>
                  </div>
                  <button type="button" className="mobile-chat-action" onClick={() => { setShowCreateChat(true); setSidebarOpen(true); }}>
                    +
                  </button>
                </div>
                <div className="chat-shell">
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
                </div>
              </>
            ) : (
              <div className="empty-state-card">
                <div className="empty-state-title">Начните общение</div>
                <div className="empty-state-copy">Создайте чат или откройте существующий, чтобы продолжить переписку.</div>
                <button type="button" className="primary-button" onClick={() => { setShowCreateChat(true); setSidebarOpen(true); }}>
                  Создать чат
                </button>
                <button type="button" className="secondary-button" onClick={() => setSidebarOpen(true)} style={{ marginTop: 10 }}>
                  Открыть меню
                </button>
              </div>
            )}
          </main>
          {profileViewerUser ? (
            <div className="overlay-panel" role="dialog" aria-modal="true">
              <div className="overlay-card profile-view-card">
                <div className="profile-view-hero">
                  <div className="profile-view-main">
                    <div className="profile-view-avatar-wrap">
                      <Avatar src={profileViewerUser.avatarUrl} alt={profileViewerUser.displayName} name={profileViewerUser.displayName} size={104} />
                      <span className="profile-view-status-badge">{profileViewerUser.statusEmoji}</span>
                    </div>
                    <div className="profile-view-text">
                      <div className="profile-view-name">{profileViewerUser.displayName}</div>
                      <div className="profile-view-username">{profileViewerUser.username}</div>
                      <div className="profile-view-bio">{profileViewerUser.bio || 'Пользователь пока не добавил описание.'}</div>
                    </div>
                  </div>
                  <div className="profile-view-actions">
                    <button type="button" className="primary-button" onClick={() => handleOpenProfileChat(profileViewerUser)}>
                      Написать
                    </button>
                    <button type="button" className="secondary-button" onClick={() => setProfileViewerUser(null)}>
                      Закрыть
                    </button>
                  </div>
                </div>

                <div className="profile-view-meta">
                  <div className="profile-view-meta-item">
                    <span className="profile-view-meta-label">Статус</span>
                    <span className={`profile-view-meta-value presence-chip ${profileViewerUser.isOnline ? 'online' : 'offline'}`}>
                      {profileViewerUser.isOnline ? 'В сети' : 'Не в сети'} · {profileViewerUser.statusEmoji}
                    </span>
                  </div>
                  {profileViewerUser.phone ? (
                    <div className="profile-view-meta-item">
                      <span className="profile-view-meta-label">Телефон</span>
                      <span className="profile-view-meta-value">{profileViewerUser.phone}</span>
                    </div>
                  ) : null}
                  {profileViewerUser.googleEmail ? (
                    <div className="profile-view-meta-item">
                      <span className="profile-view-meta-label">Google</span>
                      <span className="profile-view-meta-value">{profileViewerUser.googleEmail}</span>
                    </div>
                  ) : null}
                  <div className={`toast ${toastMessage ? 'show' : ''}`}>{toastMessage}</div>
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
