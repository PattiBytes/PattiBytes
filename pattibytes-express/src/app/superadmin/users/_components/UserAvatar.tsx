'use client';
import Image from 'next/image';
import type { UserWithMerchant } from './types';

interface Props {
  user: UserWithMerchant;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' };

export default function UserAvatar({ user, size = 'md' }: Props) {
  // Priority: avatar_url → merchant logo_url → profile logo_url → initials
  const imgSrc =
    user.avatar_url ||
    user.merchant?.logo_url ||
    user.logo_url ||
    null;

  const initial = (user.full_name?.[0] || user.merchant?.business_name?.[0] || 'U').toUpperCase();
  const cls = SIZES[size];

  if (imgSrc) {
    return (
      <div className={`${cls} rounded-full overflow-hidden flex-shrink-0 relative`}>
        <Image
          src={imgSrc}
          alt={user.full_name || 'User'}
          fill
          sizes="56px"
          className="object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`${cls} rounded-full bg-gradient-to-br from-orange-400 to-pink-500 
        text-white flex items-center justify-center font-bold flex-shrink-0`}
    >
      {initial}
    </div>
  );
}