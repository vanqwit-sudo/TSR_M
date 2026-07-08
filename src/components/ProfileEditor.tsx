import { useEffect, useState, type ChangeEvent } from 'react';
import type { User } from '../utils/data';
import Avatar from './Avatar';

interface Props {
  profile: User;
  onUpdate: (profile: User) => void;
}

export default function ProfileEditor({ profile, onUpdate }: Props) {
  const [local, setLocal] = useState<User>(profile);

  useEffect(() => setLocal(profile), [profile]);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const res = r.result;
      if (typeof res === 'string') setLocal((p) => ({ ...p, avatarUrl: res }));
    };
    r.readAsDataURL(f);
  };

  return (
    <div className="profile-editor compact">
      <div className="profile-top">
        <Avatar src={local.avatarUrl} alt={local.displayName} name={local.displayName} size={72} />
        <div className="profile-name">{local.displayName}</div>
        <div className="profile-bio">{local.bio}</div>
      </div>

      <div className="profile-actions">
        <label className="file">
          Загрузить аватар
          <input type="file" accept="image/*" onChange={handleFile} />
        </label>
        <button onClick={() => onUpdate(local)}>Сохранить</button>
      </div>
    </div>
  );
}
