export type ProfileTheme = 'good' | 'evil' | 'cute' | 'neutral';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  statusEmoji: string;
  avatarUrl: string;
  borderColor: string;
  nameColor: string;
}

export interface User extends UserProfile {
  phone: string;
  password: string;
  googleEmail: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
  deletedFor?: string[];
}

export interface Chat {
  id: string;
  title: string;
  members: string[];
  messages: Message[];
  isGroup: boolean;
  mood: ProfileTheme;
  avatarUrl?: string;
  creatorId?: string;
  deleteVotes?: string[];
}

export interface AppState {
  users: User[];
  chats: Chat[];
  currentUserId: string | null;
}

const classifyEmoji = (text: string): ProfileTheme => {
  const good = ['😊', '🙂', '😇', '❤️', '😁', '😄', '🤗', '👍'];
  const evil = ['😠', '😡', '👿', '💀', '😈', '🤬', '👺'];
  const cute = ['😻', '🥰', '😍', '🐶', '🐱', '🧸', '🥺'];

  const score = { good: 0, evil: 0, cute: 0 };

  for (const char of Array.from(text)) {
    if (good.includes(char)) score.good += 1;
    if (evil.includes(char)) score.evil += 1;
    if (cute.includes(char)) score.cute += 1;
  }

  if (score.evil > score.good && score.evil > score.cute) return 'evil';
  if (score.good > score.evil && score.good > score.cute) return 'good';
  if (score.cute > score.good && score.cute > score.evil) return 'cute';
  return 'neutral';
};

export const defaultUsers: User[] = [
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
];

export const defaultChats: Chat[] = [
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
];

export function calculateChatMood(messages: Message[]): ProfileTheme {
  const text = messages.map((message) => message.text).join(' ');
  return classifyEmoji(text);
}
