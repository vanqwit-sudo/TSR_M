import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.join(__dirname, 'server-state.json');
const BACKUP_STATE_PATH = path.join(__dirname, 'server-state.backup.json');
const DIST_PATH = path.join(__dirname, 'dist');
const PORT = process.env.PORT ? Number(process.env.PORT) : 4174;

const defaultState = {
  users: [],
  chats: [],
};

function normalizeState(state) {
  const safeState = state && typeof state === 'object' ? state : {};
  return {
    users: Array.isArray(safeState.users) ? safeState.users : [],
    chats: Array.isArray(safeState.chats) ? safeState.chats : [],
  };
}

const app = express();
app.use(cors());
app.use(express.json());

function buildUsername(username) {
  if (typeof username !== 'string') return '@unknown';
  const cleaned = username.trim();
  return cleaned.startsWith('@') ? cleaned : `@${cleaned}`;
}

function classifyEmoji(text) {
  const good = ['😊', '🙂', '😇', '❤️', '😁', '😄', '🤗', '👍'];
  const evil = ['😠', '😡', '👿', '💀', '😈', '🤬', '👺'];
  const cute = ['😻', '🥰', '😍', '🐶', '🐱', '🧸', '🥺'];
  const score = { good: 0, evil: 0, cute: 0 };

  for (const char of Array.from(text || '')) {
    if (good.includes(char)) score.good += 1;
    if (evil.includes(char)) score.evil += 1;
    if (cute.includes(char)) score.cute += 1;
  }

  if (score.evil > score.good && score.evil > score.cute) return 'evil';
  if (score.good > score.evil && score.good > score.cute) return 'good';
  if (score.cute > score.good && score.cute > score.evil) return 'cute';
  return 'neutral';
}

async function loadState() {
  const candidates = [STATE_PATH, process.env.STATE_PATH ? path.resolve(process.env.STATE_PATH) : null, BACKUP_STATE_PATH].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const raw = await fs.readFile(candidate, 'utf8');
      const parsed = JSON.parse(raw);
      const normalized = normalizeState(parsed);
      if (candidate !== STATE_PATH) {
        await saveState(normalized);
      }
      return normalized;
    } catch {
      // continue to the next candidate
    }
  }

  await saveState(defaultState);
  return JSON.parse(JSON.stringify(defaultState));
}

async function saveState(state) {
  const normalized = normalizeState(state);
  await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
  await fs.writeFile(STATE_PATH, JSON.stringify(normalized, null, 2), 'utf8');
  await fs.writeFile(BACKUP_STATE_PATH, JSON.stringify(normalized, null, 2), 'utf8');
}

function getUserById(state, userId) {
  return state.users.find((user) => user.id === userId) || null;
}

function getChatById(state, chatId) {
  return state.chats.find((chat) => chat.id === chatId) || null;
}

function getMood(messages) {
  return classifyEmoji(messages.map((message) => message.text).join(' '));
}

function deleteThreshold(chat) {
  return chat.isGroup ? Math.floor(chat.members.length / 2) + 1 : chat.members.length;
}

function parseWatchCommand(text) {
  const normalized = String(text || '').trim();
  const match = normalized.match(/^!смотреть\s+"([^"]+)"\s+"([^"]+)"$/i);
  if (!match) return null;
  return { channel: match[1].trim(), title: match[2].trim() };
}

async function searchYouTubeVideo(query) {
  const proxyUrl = process.env.YOUTUBE_PROXY_URL || 'https://vid.puffyan.us/api/v1/search';
  const endpoint = `${proxyUrl}?q=${encodeURIComponent(query)}&type=video&sort_by=relevance&region=US`;
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const firstVideo = Array.isArray(data) ? data[0] : data?.videos?.[0] || data?.results?.[0] || null;
  if (!firstVideo) return null;

  return {
    videoId: firstVideo.videoId || firstVideo.video_id || firstVideo.id || null,
    title: firstVideo.title || 'YouTube video',
    channel: firstVideo.author || firstVideo.channel || 'YouTube',
  };
}

app.get('/api/users', async (req, res) => {
  const state = await loadState();
  res.json(state.users);
});

app.get('/api/users/:userId', async (req, res) => {
  const state = await loadState();
  const user = getUserById(state, req.params.userId);
  if (!user) {
    return res.status(404).send('Пользователь не найден');
  }
  res.json(user);
});

app.post('/api/login/phone', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).send('Телефон и пароль обязательны');
  const state = await loadState();
  const user = state.users.find((item) => item.phone === phone && item.password === password);
  if (!user) return res.status(401).send('Неверный номер или пароль');
  res.json(user);
});

app.post('/api/login/google', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send('Email и пароль обязательны');
  const state = await loadState();
  let user = state.users.find((item) => item.googleEmail === email);
  if (!user) {
    const id = `u${state.users.length + 1}`;
    user = {
      id,
      username: `@google_user_${id}`,
      displayName: `Google User ${id.slice(1)}`,
      bio: 'Зарегистрирован через Google',
      statusEmoji: '🙂',
      avatarUrl: 'https://via.placeholder.com/120?text=G',
      borderColor: '#4f46e5',
      nameColor: '#111827',
      phone: '',
      password,
      googleEmail: email,
    };
    state.users.push(user);
    await saveState(state);
  } else if (user.password !== password) {
    return res.status(401).send('Неверный email или пароль');
  }
  res.json(user);
});

app.post('/api/register', async (req, res) => {
  const profile = req.body;
  if (!profile || !profile.phone || !profile.password || !profile.username) {
    return res.status(400).send('Заполните все поля регистрации');
  }

  const state = await loadState();
  if (state.users.some((item) => item.phone === profile.phone || item.username === profile.username)) {
    return res.status(409).send('Номер или никнейм уже используются');
  }

  const user = {
    ...profile,
    id: `u${state.users.length + 1}`,
    googleEmail: profile.googleEmail || '',
  };
  state.users.push(user);
  await saveState(state);
  res.json(user);
});

app.post('/api/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const changes = req.body;
  const state = await loadState();
  const user = getUserById(state, userId);
  if (!user) return res.status(404).send('Пользователь не найден');
  const updated = { ...user, ...changes };
  state.users = state.users.map((item) => (item.id === userId ? updated : item));
  await saveState(state);
  res.json(updated);
});

app.get('/api/chats', async (req, res) => {
  const userId = String(req.query.userId || '');
  if (!userId) return res.status(400).send('userId обязателен');
  const state = await loadState();
  res.json(state.chats.filter((chat) => chat.members.includes(userId)));
});

app.post('/api/chats', async (req, res) => {
  const { title, participants, isGroup, creatorId } = req.body;
  if (!creatorId) return res.status(400).send('creatorId обязателен');
  const state = await loadState();
  const normalized = Array.isArray(participants)
    ? participants.map(buildUsername).filter((username) => username.length > 1)
    : [];

  const members = Array.from(
    new Set(
      normalized
        .map((username) => state.users.find((user) => user.username === username))
        .filter(Boolean)
        .map((user) => user.id)
        .concat(creatorId),
    ),
  );

  if (!members.includes(creatorId)) members.push(creatorId);

  const chat = {
    id: `chat-${Date.now()}`,
    title: title || 'Новый чат',
    members,
    isGroup: Boolean(isGroup),
    mood: 'neutral',
    creatorId,
    deleteVotes: [],
    messages: [],
  };

  state.chats.push(chat);
  await saveState(state);
  res.json(chat);
});

app.post('/api/messages', async (req, res) => {
  const { chatId, senderId, text, imageUrl, stickerUrl, voiceUrl } = req.body;
  if (!chatId || !senderId || (!text && !imageUrl && !stickerUrl && !voiceUrl)) return res.status(400).send('chatId, senderId и text/imageUrl/sticker/voice обязательны');
  const state = await loadState();
  const chat = getChatById(state, chatId);
  if (!chat) return res.status(404).send('Чат не найден');

  const normalizedText = String(text || '').trim();
  const watchCommand = parseWatchCommand(normalizedText);
  let sharedVideo = chat.sharedVideo || null;

  if (watchCommand) {
    const video = await searchYouTubeVideo(`${watchCommand.channel} ${watchCommand.title}`);
    const sender = getUserById(state, senderId);
    sharedVideo = video
      ? {
          videoId: video.videoId,
          title: video.title,
          channel: video.channel,
          startedBy: sender?.displayName || 'участник',
        }
      : {
          videoId: `${watchCommand.channel}-${watchCommand.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title: watchCommand.title,
          channel: watchCommand.channel,
          startedBy: sender?.displayName || 'участник',
        };
  }

  const message = {
    id: `${chatId}-${chat.messages.length + 1}`,
    senderId,
    text: normalizedText,
    imageUrl: imageUrl || undefined,
    stickerUrl: stickerUrl || undefined,
    voiceUrl: voiceUrl || undefined,
    createdAt: new Date().toISOString(),
  };

  chat.messages.push(message);
  chat.mood = getMood(chat.messages);
  if (watchCommand) {
    chat.sharedVideo = sharedVideo;
  }
  state.chats = state.chats.map((item) => (item.id === chatId ? chat : item));
  await saveState(state);
  res.json(chat);
});

app.post('/api/messages/:messageId/reactions', async (req, res) => {
  const { messageId } = req.params;
  const { userId, emoji } = req.body;
  const state = await loadState();
  let targetChat = null;
  let targetMessage = null;

  for (const chat of state.chats) {
    const message = chat.messages.find((item) => item.id === messageId);
    if (message) {
      targetChat = chat;
      targetMessage = message;
      break;
    }
  }

  if (!targetChat || !targetMessage) return res.status(404).send('Сообщение не найдено');
  const nextReactions = { ...(targetMessage.reactions || {}) };
  const users = new Set(nextReactions[emoji] || []);
  if (users.has(userId)) users.delete(userId);
  else users.add(userId);
  nextReactions[emoji] = Array.from(users);
  targetMessage.reactions = nextReactions;
  targetChat.messages = targetChat.messages.map((item) => (item.id === messageId ? targetMessage : item));
  state.chats = state.chats.map((item) => (item.id === targetChat.id ? targetChat : item));
  await saveState(state);
  res.json(targetChat);
});

app.post('/api/chats/:chatId/pin', async (req, res) => {
  const { chatId } = req.params;
  const { messageId } = req.body;
  const state = await loadState();
  const chat = getChatById(state, chatId);
  if (!chat) return res.status(404).send('Чат не найден');
  chat.pinnedMessageId = messageId || null;
  state.chats = state.chats.map((item) => (item.id === chatId ? chat : item));
  await saveState(state);
  res.json(chat);
});

app.post('/api/messages/:messageId/delete', async (req, res) => {
  const { messageId } = req.params;
  const { userId, scope } = req.body;
  const state = await loadState();
  let targetChat = null;
  let targetMessage = null;

  for (const chat of state.chats) {
    const message = chat.messages.find((item) => item.id === messageId);
    if (message) {
      targetChat = chat;
      targetMessage = message;
      break;
    }
  }

  if (!targetChat || !targetMessage) return res.status(404).send('Сообщение не найдено');
  if (targetMessage.senderId !== userId && scope === 'forEveryone') return res.status(403).send('Только отправитель может удалить у всех');

  if (scope === 'forEveryone') {
    targetChat.messages = targetChat.messages.filter((item) => item.id !== messageId);
  } else {
    targetChat.messages = targetChat.messages.map((item) =>
      item.id === messageId
        ? { ...item, deletedFor: Array.from(new Set([...(item.deletedFor || []), userId])) }
        : item,
    );
  }

  targetChat.mood = getMood(targetChat.messages);
  state.chats = state.chats.map((item) => (item.id === targetChat.id ? targetChat : item));
  await saveState(state);
  res.json(targetChat);
});

app.patch('/api/chats/:chatId', async (req, res) => {
  const { chatId } = req.params;
  const changes = req.body;
  const state = await loadState();
  const chat = getChatById(state, chatId);
  if (!chat) return res.status(404).send('Чат не найден');
  const updated = { ...chat, ...changes };
  state.chats = state.chats.map((item) => (item.id === chatId ? updated : item));
  await saveState(state);
  res.json(updated);
});

app.post('/api/chats/:chatId/participants', async (req, res) => {
  const { chatId } = req.params;
  const { userId, participantIds } = req.body;
  const state = await loadState();
  const chat = getChatById(state, chatId);
  if (!chat) return res.status(404).send('Чат не найден');
  if (chat.creatorId !== userId) return res.status(403).send('Только админ может добавлять пользователей');
  const nextMembers = Array.from(new Set([...(chat.members || []), ...(participantIds || [])]));
  chat.members = nextMembers;
  state.chats = state.chats.map((item) => (item.id === chatId ? chat : item));
  await saveState(state);
  res.json(chat);
});

app.delete('/api/chats/:chatId', async (req, res) => {
  const { chatId } = req.params;
  const state = await loadState();
  const exists = state.chats.some((chat) => chat.id === chatId);
  if (!exists) return res.status(404).send('Чат не найден');
  state.chats = state.chats.filter((chat) => chat.id !== chatId);
  await saveState(state);
  res.status(204).send();
});

app.post('/api/chats/:chatId/vote-delete', async (req, res) => {
  const { chatId } = req.params;
  const { voterId } = req.body;
  if (!voterId) return res.status(400).send('voterId обязателен');

  const state = await loadState();
  const chat = getChatById(state, chatId);
  if (!chat) return res.status(404).send('Чат не найден');
  if (!chat.members.includes(voterId)) return res.status(403).send('Пользователь не член чата');

  const votes = new Set(chat.deleteVotes || []);
  if (votes.has(voterId)) votes.delete(voterId);
  else votes.add(voterId);

  chat.deleteVotes = Array.from(votes);

  if (chat.deleteVotes.length >= deleteThreshold(chat)) {
    state.chats = state.chats.filter((item) => item.id !== chatId);
  } else {
    state.chats = state.chats.map((item) => (item.id === chatId ? chat : item));
  }

  await saveState(state);
  const resultChat = state.chats.find((item) => item.id === chatId) || null;
  res.json(resultChat);
});

app.get('/api/search/users', async (req, res) => {
  const query = String(req.query.query || '').toLowerCase().trim();
  const state = await loadState();
  if (!query) return res.json(state.users);
  res.json(
    state.users.filter(
      (user) =>
        user.username.toLowerCase().includes(query) ||
        user.displayName.toLowerCase().includes(query) ||
        user.bio.toLowerCase().includes(query),
    ),
  );
});

app.get('/api/search/chats', async (req, res) => {
  const userId = String(req.query.userId || '');
  if (!userId) return res.status(400).send('userId обязателен');
  const query = String(req.query.query || '').toLowerCase().trim();
  const state = await loadState();
  const chats = state.chats.filter((chat) => chat.members.includes(userId));
  if (!query) return res.json(chats);
  res.json(
    chats.filter((chat) => {
      const memberNames = chat.members.map((memberId) => getUserById(state, memberId)?.username ?? '').join(' ');
      return chat.title.toLowerCase().includes(query) || memberNames.toLowerCase().includes(query);
    }),
  );
});

app.get('/api/search/messages', async (req, res) => {
  const chatId = String(req.query.chatId || '');
  const query = String(req.query.query || '').toLowerCase().trim();
  if (!chatId) return res.status(400).send('chatId обязателен');
  const state = await loadState();
  const chat = getChatById(state, chatId);
  if (!chat) return res.status(404).send('Чат не найден');
  if (!query) return res.json(chat.messages);
  res.json(chat.messages.filter((message) => message.text.toLowerCase().includes(query)));
});

app.use(express.static(DIST_PATH));
app.use((req, res) => {
  res.sendFile(path.join(DIST_PATH, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TSR_M server started on http://localhost:${PORT}`);
  console.log('API available at http://localhost:' + PORT + '/api');
});
