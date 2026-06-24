import type { Chat, User, UserProfile } from './data';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const USER_STORAGE_KEY = 'tsr_m_current_user_id';

function getStoredUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(USER_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredUserId(userId: string) {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(USER_STORAGE_KEY, userId);
    } catch {
      // fallback silently
      window.sessionStorage.setItem(USER_STORAGE_KEY, userId);
    }
  }
}

function clearStoredUserId() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      window.sessionStorage.removeItem(USER_STORAGE_KEY);
    }
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function getAllUsers(): Promise<User[]> {
  return fetchJson<User[]>('/api/users');
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = getStoredUserId();
  if (!userId) return null;
  try {
    return await fetchJson<User>(`/api/users/${encodeURIComponent(userId)}`);
  } catch {
    clearStoredUserId();
    return null;
  }
}

export async function logout(): Promise<void> {
  clearStoredUserId();
}

export async function loginWithPhone(phone: string, password: string): Promise<User | null> {
  const user = await fetchJson<User>('/api/login/phone', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
  setStoredUserId(user.id);
  return user;
}

export async function loginWithGoogle(email: string, password: string): Promise<User> {
  const user = await fetchJson<User>('/api/login/google', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setStoredUserId(user.id);
  return user;
}

export async function registerWithPhone(profile: UserProfile & { phone: string; password: string }): Promise<User | null> {
  try {
    const user = await fetchJson<User>('/api/register', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
    setStoredUserId(user.id);
    return user;
  } catch {
    return null;
  }
}

export async function updateUserProfile(userId: string, changes: Partial<UserProfile>): Promise<User | null> {
  return fetchJson<User>(`/api/profile/${encodeURIComponent(userId)}`, {
    method: 'POST',
    body: JSON.stringify(changes),
  });
}

export async function getChatsForUser(userId: string): Promise<Chat[]> {
  return fetchJson<Chat[]>(`/api/chats?userId=${encodeURIComponent(userId)}`);
}

export async function createChat(title: string, participantUsernames: string[], isGroup: boolean, creatorId: string): Promise<Chat> {
  return fetchJson<Chat>('/api/chats', {
    method: 'POST',
    body: JSON.stringify({ title, participants: participantUsernames, isGroup, creatorId }),
  });
}

export async function sendMessage(chatId: string, senderId: string, text: string): Promise<Chat | null> {
  return fetchJson<Chat>('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ chatId, senderId, text }),
  });
}

export async function voteDeleteChat(chatId: string, voterId: string): Promise<Chat | null> {
  return fetchJson<Chat>(`/api/chats/${encodeURIComponent(chatId)}/vote-delete`, {
    method: 'POST',
    body: JSON.stringify({ voterId }),
  });
}

export async function updateChat(chatId: string, changes: Partial<Chat>): Promise<Chat | null> {
  return fetchJson<Chat>(`/api/chats/${encodeURIComponent(chatId)}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
}

export async function deleteChat(chatId: string): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/chats/${encodeURIComponent(chatId)}`, {
    method: 'DELETE',
  });
  return response.ok;
}

export async function searchUsers(query: string): Promise<User[]> {
  return fetchJson<User[]>(`/api/search/users?query=${encodeURIComponent(query)}`);
}

export async function searchChats(query: string, userId: string): Promise<Chat[]> {
  return fetchJson<Chat[]>(`/api/search/chats?userId=${encodeURIComponent(userId)}&query=${encodeURIComponent(query)}`);
}
