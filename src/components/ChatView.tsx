import { useMemo, useRef, useState, type ChangeEvent } from 'react';

const deleteSound = typeof window !== 'undefined' ? new Audio('/sounds/shot.mp3') : null;
import type { Chat, User } from '../utils/data';
import { calculateChatMood } from '../utils/data';
import Avatar from './Avatar';

interface Props {
  chat: Chat;
  currentUser: User;
  members: User[];
  onSend: (chatId: string, text: string, imageUrl?: string, stickerUrl?: string, voiceUrl?: string) => void;
  onVoteDelete: (chatId: string) => void;
  onUpdateChat: (chatId: string, changes: Partial<Chat>) => void;
  onDeleteChat: (chatId: string) => void;
  onDeleteMessage: (messageId: string, scope: 'forMe' | 'forEveryone') => void;
  onAddParticipants: (chatId: string, participantIds: string[]) => void;
  onReact: (messageId: string, emoji: string) => void;
  onPinMessage: (chatId: string, messageId: string | null) => void;
}

export default function ChatView({ chat, currentUser, members, onSend, onVoteDelete, onUpdateChat, onDeleteChat, onDeleteMessage, onAddParticipants, onReact, onPinMessage }: Props) {
  const [draft, setDraft] = useState('');
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [groupTitle, setGroupTitle] = useState(chat.title);
  const [groupAvatarUrl, setGroupAvatarUrl] = useState(chat.avatarUrl ?? '');
  const [selectedProfile, setSelectedProfile] = useState<User | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingSticker, setPendingSticker] = useState<string | null>(null);
  const [voicePreview, setVoicePreview] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [participantInput, setParticipantInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'chat' | 'search'>('chat');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const mood = useMemo(() => calculateChatMood(chat.messages), [chat.messages]);
  const otherMembers = members.filter((member) => member.id !== currentUser.id);
  const title = chat.title || (otherMembers[0]?.displayName ?? 'Чат');
  const subtitle = chat.isGroup
    ? `${chat.members.length} участник${chat.members.length === 1 ? '' : 'ов'}`
    : otherMembers[0]?.username ?? 'Переписка';

  const handleSend = () => {
    if (!draft.trim() && !pendingImage && !pendingSticker && !voicePreview) return;
    onSend(chat.id, draft.trim(), pendingImage ?? undefined, pendingSticker ?? undefined, voicePreview ?? undefined);
    setDraft('');
    setPendingImage(null);
    setPendingSticker(null);
    setVoicePreview(null);
  };

  const currentVoteCount = chat.deleteVotes?.length ?? 0;
  const requiredVotes = chat.isGroup ? Math.floor(chat.members.length / 2) + 1 : chat.members.length;
  const userHasVoted = chat.deleteVotes?.includes(currentUser.id) ?? false;

  const openProfile = (member: User) => {
    setSelectedProfile(member);
    setShowProfilePanel(true);
  };

  const handleImagePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPendingImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleGroupAvatarPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setGroupAvatarUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const addParticipantsToGroup = () => {
    const ids = participantInput.split(',').map((value) => value.trim()).filter(Boolean);
    if (ids.length) {
      onAddParticipants(chat.id, ids);
      setParticipantInput('');
    }
  };

  const quickStickers = ['https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif', 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif'];

  const handleVoiceNote = () => {
    if (voicePreview) {
      setVoicePreview(null);
      return;
    }
    setVoicePreview('voice-note');
  };

  const filteredMessages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return chat.messages;
    return chat.messages.filter((message) => message.text.toLowerCase().includes(query) || (message.imageUrl || '').toLowerCase().includes(query));
  }, [chat.messages, searchQuery]);

  const triggerDeleteAnimation = (messageId: string, scope: 'forMe' | 'forEveryone') => {
    setSelectedMessageId(null);
    setDeletingMessageId(messageId);
    if (deleteSound) {
      deleteSound.currentTime = 0;
      void deleteSound.play().catch(() => undefined);
    }
    window.setTimeout(() => {
      onDeleteMessage(messageId, scope);
      setDeletingMessageId(null);
    }, 320);
  };

  const saveGroupSettings = () => {
    onUpdateChat(chat.id, { title: groupTitle.trim() || chat.title, avatarUrl: groupAvatarUrl.trim() || undefined });
    setShowGroupSettings(false);
  };

  const canManageGroup = chat.creatorId === currentUser.id;
  const handleDeleteGroup = () => {
    if (!canManageGroup) return;
    onDeleteChat(chat.id);
    setShowGroupSettings(false);
  };

  return (
    <div className="chat-view">
      <div className="chat-header">
        <div className="chat-room-details">
          <button type="button" className="chat-room-avatar-button" onClick={() => openProfile(otherMembers[0] ?? currentUser)}>
            <div className="chat-room-avatars">
              {otherMembers.slice(0, 3).map((member) => (
                <div key={member.id} className="avatar-small-wrapper">
                  <Avatar src={member.avatarUrl} alt={member.displayName} name={member.displayName} className="avatar-small" size={44} />
                  <span className="status-dot status-dot-small">{member.statusEmoji}</span>
                </div>
              ))}
            </div>
          </button>
          <div>
            <h2>{title}</h2>
            <div className="chat-subtitle">{subtitle}</div>
          </div>
        </div>
        <div className="chat-header-actions">
          <button type="button" className="secondary-button" onClick={() => setActiveView(activeView === 'chat' ? 'search' : 'chat')}>
            {activeView === 'chat' ? 'Поиск' : 'Чат'}
          </button>
          {chat.isGroup && (
            <button type="button" onClick={() => setShowGroupSettings(true)} className="secondary-button">
              Настройки
            </button>
          )}
          <button type="button" onClick={() => onVoteDelete(chat.id)} className="delete-vote-button">
            {userHasVoted ? 'Отменить голос' : 'Голосовать за удаление'}
            <span className="vote-count">{currentVoteCount}/{requiredVotes}</span>
          </button>
        </div>
      </div>
      {activeView === 'search' && (
        <div className="search-panel">
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск по сообщениям" />
        </div>
      )}
      <div className="messages">
        {filteredMessages.length === 0 ? (
          <div className="empty-search">Нет сообщений в этом чате</div>
        ) : (
          filteredMessages.map((message) => {
            const hiddenForMe = (message.deletedFor || []).includes(currentUser.id);
            if (hiddenForMe) return null;
            const isMine = message.senderId === currentUser.id;
            const isDeleting = deletingMessageId === message.id;
            return (
              <div
                key={message.id}
                className={`message ${isMine ? 'self' : 'other'}${isDeleting ? ' deleting' : ''}`}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setSelectedMessageId(message.id);
                }}
              >
                <div className="message-bubble">
                  {message.imageUrl ? <img src={message.imageUrl} alt="attachment" className="message-image" /> : null}
                  {message.stickerUrl ? <img src={message.stickerUrl} alt="sticker" className="message-image" /> : null}
                  {message.voiceUrl ? <audio controls src={message.voiceUrl} className="voice-message" /> : null}
                  {message.text ? <div className="message-text">{message.text}</div> : null}
                  <div className="message-meta">
                    <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
                    {isMine ? <span className="message-state">✓</span> : null}
                  </div>
                  <div className="reaction-row">
                    {['👍', '❤️', '🔥'].map((emoji) => (
                      <button key={emoji} type="button" className="reaction-pill" onClick={() => onReact(message.id, emoji)}>
                        {emoji}
                      </button>
                    ))}
                    {message.reactions && Object.entries(message.reactions).map(([emoji, users]) => (
                      <span key={emoji} className="reaction-badge">{emoji} {users.length}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      {selectedMessageId ? (
        <div className="message-actions-sheet">
          <button type="button" onClick={() => triggerDeleteAnimation(selectedMessageId, 'forMe')}>Удалить у себя</button>
          {chat.messages.find((message) => message.id === selectedMessageId)?.senderId === currentUser.id ? (
            <button type="button" onClick={() => triggerDeleteAnimation(selectedMessageId, 'forEveryone')}>Удалить у всех</button>
          ) : null}
          <button type="button" onClick={() => onPinMessage(chat.id, selectedMessageId)}>Закрепить</button>
          <button type="button" onClick={() => setSelectedMessageId(null)}>Отмена</button>
        </div>
      ) : null}
      <div className="message-input">
        {pendingImage ? <img src={pendingImage} alt="preview" className="image-preview" /> : null}
        {pendingSticker ? <img src={pendingSticker} alt="sticker preview" className="image-preview" /> : null}
        {voicePreview ? <div className="voice-preview">Голосовое сообщение готово</div> : null}
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Напишите сообщение..." />
        <div className="composer-actions">
          {quickStickers.map((sticker) => (
            <button key={sticker} type="button" className="sticker-button" onClick={() => setPendingSticker(sticker)}>
              <img src={sticker} alt="sticker" />
            </button>
          ))}
          <button type="button" className="secondary-button" onClick={handleVoiceNote}>{voicePreview ? 'Сброс' : 'Голосовое'}</button>
          <label className="upload-button">
            Фото
            <input type="file" accept="image/*" onChange={handleImagePick} />
          </label>
          <button type="button" onClick={handleSend}>Отправить</button>
        </div>
      </div>

      {showProfilePanel && selectedProfile && (
        <div className="overlay-panel" role="dialog" aria-modal="true">
          <div className="overlay-card">
            <div className="overlay-card-header">
              <h3>Профиль</h3>
              <button type="button" className="secondary-button" onClick={() => setShowProfilePanel(false)}>Закрыть</button>
            </div>
            <div className="profile-preview-card">
              <div className="avatar-wrapper">
                <Avatar src={selectedProfile.avatarUrl} alt={selectedProfile.displayName} name={selectedProfile.displayName} size={92} />
                <span className="status-badge">{selectedProfile.statusEmoji}</span>
              </div>
              <div className="profile-preview-card-info">
                <div className="profile-name">{selectedProfile.displayName}</div>
                <div className="chat-subtitle">{selectedProfile.username}</div>
                <div className="chat-subtitle">{selectedProfile.bio}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGroupSettings && (
        <div className="overlay-panel" role="dialog" aria-modal="true">
          <div className="overlay-card">
            <div className="overlay-card-header">
              <h3>Настройки группы</h3>
              <button type="button" className="secondary-button" onClick={() => setShowGroupSettings(false)}>Закрыть</button>
            </div>
            <label>
              Название
              <input value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} />
            </label>
            <label>
              Аватарка
              <input value={groupAvatarUrl} onChange={(e) => setGroupAvatarUrl(e.target.value)} placeholder="URL или файл" />
              <input type="file" accept="image/*" onChange={handleGroupAvatarPick} />
            </label>
            <label>
              Добавить пользователей (через запятую)
              <input value={participantInput} onChange={(e) => setParticipantInput(e.target.value)} placeholder="@friend,@hero" />
            </label>
            <div className="overlay-actions">
              <button type="button" className="secondary-button" onClick={addParticipantsToGroup}>Добавить</button>
              <button type="button" className="primary-button" onClick={saveGroupSettings}>Сохранить</button>
            </div>
            <div className="group-admin-row">
              <button type="button" className="danger-button" onClick={handleDeleteGroup} disabled={!canManageGroup}>
                {canManageGroup ? 'Удалить группу' : 'Только админ'}
              </button>
            </div>
            <div className="group-members-list">
              {members.map((member) => (
                <div key={member.id} className="group-member-item">
                  <Avatar src={member.avatarUrl} alt={member.displayName} name={member.displayName} size={40} />
                  <span>{member.displayName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
