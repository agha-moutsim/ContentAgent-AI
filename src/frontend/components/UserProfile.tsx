'use client';

import Link from 'next/link';

interface UserProfileProps {
  displayName: string;
  email: string;
  avatarUrl: string;
}

export default function UserProfile({ displayName, email, avatarUrl }: UserProfileProps) {
  return (
    <div className="flex-shrink-0 flex bg-white/5 p-6 border-t border-white/5">
      <div className="flex items-center">
        <img 
          src={avatarUrl} 
          alt={displayName} 
          className="w-10 h-10 rounded-full border-2 border-indigo-500/50 shadow-lg object-cover"
          onError={(e) => {
            // Fallback to initial if image fails
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${displayName}&background=6366f1&color=fff`;
          }}
        />
        <div className="ml-4 overflow-hidden">
          <p className="text-sm font-semibold text-white truncate w-32">{displayName}</p>
          <p className="text-[10px] text-gray-500 truncate w-32">{email}</p>
          <Link 
            href="/logout"
            className="text-[10px] uppercase tracking-wider font-bold text-gray-400 hover:text-red-400 transition-colors mt-1 block"
          >
            Log out
          </Link>
        </div>
      </div>
    </div>
  );
}
