// src/components/Avatar.tsx
interface AvatarProps {
  username: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Cores sólidas oficiais do Discord
const DISCORD_COLORS = [
  '#5865F2', // Discord Blurple
  '#57F287', // Verde
  '#FEE75C', // Amarelo Ouro
  '#EB459E', // Rosa Fuchsia
  '#ED4245', // Vermelho
  '#00A8FC', // Azul Claro
  '#9B59B6', // Roxo
  '#E67E22', // Laranja
  '#2ECC71', // Esmeralda
  '#3498DB'  // Azul Turquesa
];

// Gera sempre a mesma cor para o mesmo nome de usuário
function getAvatarColor(name: string): string {
  let hash = 0;
  const cleanName = (name || 'user').trim().toLowerCase();
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DISCORD_COLORS.length;
  return DISCORD_COLORS[index];
}

export function Avatar({ username, avatarUrl, size = 'md', className = '' }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs min-w-[28px]',
    md: 'w-9 h-9 text-sm min-w-[36px]',
    lg: 'w-12 h-12 text-base min-w-[48px]',
    xl: 'w-16 h-16 text-xl min-w-[64px]'
  }[size];

  const initial = (username || '?').trim().charAt(0).toUpperCase();

  // Ignora links automáticos de robô/geradores do banco, aceitando apenas fotos reais de upload
  const hasCustomUpload =
    Boolean(avatarUrl) &&
    typeof avatarUrl === 'string' &&
    avatarUrl.trim() !== '' &&
    !avatarUrl.includes('dicebear.com') &&
    !avatarUrl.includes('robohash.org') &&
    !avatarUrl.includes('api.multiavatar.com');

  if (hasCustomUpload && avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={`${sizeClasses} rounded-full object-cover border border-slate-700 flex-shrink-0 ${className}`}
      />
    );
  }

  const bgColor = getAvatarColor(username || 'user');

  return (
    <div
      style={{ backgroundColor: bgColor }}
      className={`${sizeClasses} rounded-full flex items-center justify-center font-bold text-white uppercase flex-shrink-0 select-none shadow-inner border border-white/10 ${className}`}
    >
      {initial}
    </div>
  );
}