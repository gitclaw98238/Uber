import { User } from '../types';
import { initialsFromName } from '../utils/format';

interface AvatarProps {
  user?: Pick<User, 'name' | 'avatarUrl'> | { name?: string; avatarUrl?: string };
  size?: 'sm' | 'md' | 'lg';
}

const Avatar = ({ user, size = 'md' }: AvatarProps) => (
  <div className={`avatar avatar-${size}`} aria-label={user?.name || 'Avatar'}>
    {user?.avatarUrl ? <img src={user.avatarUrl} alt={user.name || 'Avatar'} /> : <span>{initialsFromName(user?.name)}</span>}
  </div>
);

export default Avatar;
