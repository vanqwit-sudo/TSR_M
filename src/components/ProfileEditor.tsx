import { useEffect, useState } from 'react';
import type { UserProfile } from '../utils/data';
import Avatar from './Avatar';

interface Props {
  profile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
}

const defaultFrames = ['#4f46e5', '#ef4444', '#10b981', '#f59e0b'];

async function resizeAvatar(file: File, size: number) {
  const imageUrl = URL.createObjectURL(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  const ratio = Math.max(size / image.width, size / image.height);
  const sw = size / ratio;
  const sh = size / ratio;
  const sx = (image.width - sw) / 2;
  const sy = (image.height - sh) / 2;

  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, size, size);
  URL.revokeObjectURL(imageUrl);

  return canvas.toDataURL('image/png');
}

export default function ProfileEditor({ profile, onUpdate }: Props) {
  const [local, setLocal] = useState(profile);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const avatarUrl = await resizeAvatar(file, 120);
      setLocal({ ...local, avatarUrl });
    } catch (error) {
      console.error('Не удалось загрузить аватар', error);
    }
  };

  // persist profile locally so it survives reloads
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`profile_${local.id}`, JSON.stringify(local));
      }
    } catch {}
  }, [local]);

  return (
    <div className="profile-editor">
      <div className="profile-preview">
        <div className="avatar-wrapper">
          <Avatar className="avatar" src={local.avatarUrl} alt="Аватар" name={local.displayName} size={96} />
          <div className="status-badge">{local.statusEmoji}</div>
          <div className="avatar-frame" style={{ borderColor: local.borderColor }} />
        </div>
        <div className="profile-name" style={{ color: local.nameColor }}>
          {local.displayName}
        </div>
      </div>
      <label>
        Аватар
        <input type="file" accept="image/*" onChange={handleFileChange} />
      </label>
      <label>
        Никнейм
        <input
          value={local.username}
          onChange={(e) => setLocal({ ...local, username: e.target.value })}
        />
      </label>
      <label>
        Имя
        <input
          value={local.displayName}
          onChange={(e) => setLocal({ ...local, displayName: e.target.value })}
        />
      </label>
      <label>
        Описание
        <textarea
          value={local.bio}
          onChange={(e) => setLocal({ ...local, bio: e.target.value })}
        />
      </label>
      <label>
        Эмодзи-статус
        <input
          value={local.statusEmoji}
          onChange={(e) => setLocal({ ...local, statusEmoji: e.target.value })}
        />
      </label>
      <label>
        Цвет рамки
        <input
          type="color"
          value={local.borderColor}
          onChange={(e) => setLocal({ ...local, borderColor: e.target.value })}
        />
      </label>
      <label>
        Цвет имени
        <input
          type="color"
          value={local.nameColor}
          onChange={(e) => setLocal({ ...local, nameColor: e.target.value })}
        />
      </label>
      <label className="sync-toggle">
        <input
          type="checkbox"
          checked={Boolean((local as UserProfile & { syncWithServer?: boolean }).syncWithServer)}
          onChange={(e) => setLocal({ ...local, syncWithServer: e.target.checked } as UserProfile & { syncWithServer?: boolean })}
        />
        Синхронизировать профиль с сервером
      </label>
      <div className="colors-grid">
        {defaultFrames.map((color) => (
          <button
            key={color}
            type="button"
            className="color-swatch"
            style={{ backgroundColor: color }}
            onClick={() => setLocal({ ...local, borderColor: color })}
          />
        ))}
      </div>
      <button type="button" onClick={() => onUpdate(local)}>
        Сохранить профиль
      </button>
    </div>
  );
}
