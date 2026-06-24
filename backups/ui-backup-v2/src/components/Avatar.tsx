interface AvatarProps {
  src?: string | null;
  alt: string;
  name?: string;
  className?: string;
  size?: number;
}

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export default function Avatar({ src, alt, name = '', className = 'avatar', size = 96 }: AvatarProps) {
  const hasImage = Boolean(src && src.trim());

  if (!hasImage) {
    return (
      <div
        className={`avatar-fallback ${className}`}
        style={{ width: size, height: size }}
        aria-label={alt}
      >
        {getInitials(name)}
      </div>
    );
  }

  return <img src={src!} alt={alt} className={className} style={{ width: size, height: size }} />;
}
