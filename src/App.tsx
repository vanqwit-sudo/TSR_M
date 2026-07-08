import { useEffect, useMemo, useState } from 'react';
import './styles.css';
import type { Chat, User, Message } from './utils/data';
import ChatList from './components/ChatList';
import ChatView from './components/ChatView';
import CreateChat from './components/CreateChat';
import ProfileEditor from './components/ProfileEditor';
import AuthView from './components/AuthView';

function sampleUser(): User {
  return {
    id: 'u:me',
    username: 'me',
    displayName: 'You',
    bio: 'Привет! Это ваш профиль',
    statusEmoji: '🙂',
    avatarUrl: '',
    borderColor: '#2b6cb0',
    nameColor: '#0f172a',
    phone: '',
    password: '',
    googleEmail: '',
    isOnline: true,
  };
}

const initialChat = (meId: string): Chat => ({
  id: 'c:welcome',
  title: 'Общий чат',
  members: [meId],
  messages: [
    {
      id: 'm:1',
      senderId: meId,
      text: 'Привет! Это минималистичный интерфейс. Попробуйте отправить сообщение.',
      createdAt: new Date().toISOString(),
    } as Message,
  ],
  isGroup: false,
  mood: 'neutral',
});

export default function App() {
  const [signedUser, setSignedUser] = useState<User | null>(() => {
    try {
      const raw = window.localStorage.getItem('signed_user');
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });
  const [search, setSearch] = useState('');
  const [enableSound, setEnableSound] = useState(true);

  useEffect(() => {
    if (!signedUser) return;
    try {
      window.localStorage.setItem('signed_user', JSON.stringify(signedUser));
    } catch {}
  }, [signedUser]);

  const user = useMemo(() => signedUser ?? sampleUser(), [signedUser]);

  const [chats, setChats] = useState<Chat[]>(() => [initialChat(user.id)]);
  const [activeChatId, setActiveChatId] = useState<string | null>(chats[0]?.id ?? null);

  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return chats;
    return chats.filter((chat) => {
      const title = chat.title?.toLowerCase() ?? '';
      const last = chat.messages[chat.messages.length - 1]?.text?.toLowerCase() ?? '';
      return title.includes(query) || last.includes(query);
    });
  }, [search, chats]);

  useEffect(() => {
    if (!activeChatId && chats.length) setActiveChatId(chats[0].id);
  }, [chats, activeChatId]);

  const handleSignIn = (username: string) => {
    const u: User = { ...sampleUser(), id: `u:${Date.now()}`, username, displayName: username };
    setSignedUser(u);
    setChats([initialChat(u.id)]);
    setActiveChatId('c:welcome');
  };

  const handleCreateChat = (title: string, memberIds: string[]) => {
    const chat: Chat = {
      id: `c:${Date.now()}`,
      title,
      members: memberIds.length ? memberIds : [user.id],
      messages: [],
      isGroup: memberIds.length > 2,
      mood: 'neutral',
    };
    setChats((s) => [chat, ...s]);
    setActiveChatId(chat.id);
  };

  const handleSendMessage = (chatId: string, text: string, imageUrl?: string) => {
    const msg: Message = {
      id: `m:${Date.now()}`,
      senderId: user.id,
      text,
      imageUrl,
      createdAt: new Date().toISOString(),
    } as Message;
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, msg] } : c)));
    if (enableSound) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = 780;
      gain.gain.value = 0.12;
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
      setTimeout(() => audioCtx.close(), 200);
    }
  };

  const handleUpdateProfile = (p: User) => setSignedUser(p);

  if (!signedUser) return <AuthView onSignIn={handleSignIn} />;

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  return (
    <div className="app-root telegram-clean">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">TSR</div>
          <div className="search">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по чатам" />
          </div>
        </div>
        <ChatList chats={filteredChats} users={[user]} activeId={activeChatId} onSelect={(id) => setActiveChatId(id)} />
        <div className="sidebar-bottom">
          <CreateChat onCreate={handleCreateChat} users={[user]} />
        </div>
      </aside>

      <main className="main-area">
        {activeChat ? (
          <ChatView chat={activeChat} currentUser={user} onSend={(text, imageUrl) => handleSendMessage(activeChat.id, text, imageUrl)} />
        ) : (
          <div className="empty-state">
            <h2>Нет активного чата</h2>
            <p>Создайте новый чат или выберите существующий.</p>
          </div>
        )}
      </main>

      <aside className="rightpanel">
        <ProfileEditor profile={user} onUpdate={handleUpdateProfile} />
        <div className="settings-card">
          <div className="settings-title">Уведомления</div>
          <label className="settings-switch">
            <input type="checkbox" checked={enableSound} onChange={(event) => setEnableSound(event.target.checked)} />
            <span>Звук отправки</span>
          </label>
        </div>
      </aside>
    </div>
  );
}
