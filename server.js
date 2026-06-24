import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.join(__dirname, 'server-state.json');
const DIST_PATH = path.join(__dirname, 'dist');
const PORT = process.env.PORT ? Number(process.env.PORT) : 4174;

const defaultState = {
  users: [
    {
      id: 'u1',
      username: '@tsr_user',
      displayName: 'TSR User',
      bio: 'Добро пожаловать в TSR_M',
      statusEmoji: '🙂',
      avatarUrl: 'https://via.placeholder.com/120',
      borderColor: '#4f46e5',
      nameColor: '#111827',
      phone: '+70000000001',
      password: '123456',
      googleEmail: '',
    },
    {
      id: 'u2',
      username: '@friend',
      displayName: 'Друг TSR',
      bio: 'Вместе веселее',
      statusEmoji: '😄',
      avatarUrl: 'https://via.placeholder.com/120?text=F',
      borderColor: '#10b981',
      nameColor: '#111827',
      phone: '+70000000002',
      password: 'password',
      googleEmail: '',
    },
    {
      id: 'u3',
      username: '@hero',
      displayName: 'Добряк',
      bio: 'Привет, я в чате!',
      statusEmoji: '🥰',
      avatarUrl: 'https://via.placeholder.com/120?text=H',
      borderColor: '#f59e0b',
      nameColor: '#111827',
      phone: '+70000000003',
      password: 'qwerty',
      googleEmail: '',
    },
  ],
  chats: [
    {
      id: 'chat1',
      title: 'Друзья',
      members: ['u1', 'u2'],
      isGroup: false,
      mood: 'good',
      messages: [
        {
          id: 'm1',
          senderId: 'u2',
          text: 'Привет! 😊',
          createdAt: new Date().toISOString(),
        },
      ],
      deleteVotes: [],
    },
    {
      id: 'chat2',
      title: 'Команда добряков',
      members: ['u1', 'u2', 'u3'],
      isGroup: true,
      mood: 'cute',
      messages: [
        {
          id: 'm2',
          senderId: 'u3',
          text: 'Всем привет! 🥰',
          createdAt: new Date().toISOString(),
        },
      ],
      deleteVotes: [],
    },
  ],
};

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
  try {
    const raw = await fs.readFile(STATE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    await saveState(defaultState);
    return JSON.parse(JSON.stringify(defaultState));
  }
}

async function saveState(state) {
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
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
  const { chatId, senderId, text, imageUrl } = req.body;
  if (!chatId || !senderId || (!text && !imageUrl)) return res.status(400).send('chatId, senderId и text/imageUrl обязательны');
  const state = await loadState();
  const chat = getChatById(state, chatId);
  if (!chat) return res.status(404).send('Чат не найден');

  const message = {
    id: `${chatId}-${chat.messages.length + 1}`,
    senderId,
    text: text || '',
    imageUrl: imageUrl || undefined,
    createdAt: new Date().toISOString(),
  };

  chat.messages.push(message);
  chat.mood = getMood(chat.messages);
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

app.use(express.static(DIST_PATH));
app.use((req, res) => {
  res.sendFile(path.join(DIST_PATH, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TSR_M server started on http://localhost:${PORT}`);
  console.log('API available at http://localhost:' + PORT + '/api');
});
