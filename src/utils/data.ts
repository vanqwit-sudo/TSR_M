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
  isOnline?: boolean;
  lastSeenAt?: string;
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
  stickerUrl?: string;
  voiceUrl?: string;
  reactions?: Record<string, string[]>;
  createdAt: string;
  deletedFor?: string[];
}

export interface SharedVideoState {
  videoId: string;
  title: string;
  channel: string;
  startedBy: string;
  thumbnailUrl?: string | null;
  sourceUrl?: string | null;
  status?: 'playing' | 'paused';
  currentTime?: number;
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
  pinnedMessageId?: string | null;
  sharedVideo?: SharedVideoState | null;
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

export const defaultUsers: User[] = [];

export const defaultChats: Chat[] = [];

export function calculateChatMood(messages: Message[]): ProfileTheme {
  const text = messages.map((message) => message.text).join(' ');
  return classifyEmoji(text);
}
