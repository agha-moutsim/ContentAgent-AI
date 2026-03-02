import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/backend/utils/jwt';
import UserProfile from '@/frontend/components/UserProfile';

export const dynamic = 'force-dynamic';

import { query } from '@/backend/db/client';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect('/login');
  }

  // Decode user info from token
  let user: any = null;
  try {
    user = verifyToken(token);
  } catch (error) {
    redirect('/login');
  }

  // Fetch real-time plan status from DB
  let isPro = false;
  try {
    const result = await query('SELECT plan FROM users WHERE id = $1', [user.userId]);
    if (result.rows[0]?.plan === 'pro') {
      isPro = true;
    }
  } catch (error) {
    console.error('Failed to fetch user plan:', error);
  }

  // Determine user display data
  const email = user.email;
  const displayName = user.name || email.split('@')[0];
  
  // Use unavatar.io for a "Real Google Profile Picture" feel if none exists
  const avatarUrl = user.avatarUrl || `https://unavatar.io/google/${email}?fallback=https://ui-avatars.com/api/?name=${displayName}&background=6366f1&color=fff`;

  return (
    <div className="flex h-screen bg-[#09090b] text-white">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-72">
          <div className="flex flex-col h-full glass border-r border-white/5">
            <div className="flex-1 flex flex-col pt-8 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-6 mb-8">
                <div className="w-8 h-8 rounded-lg bg-gradient-premium mr-3 flex items-center justify-center font-bold text-white">C</div>
                <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Content Agent</span>
              </div>
              <nav className="flex-1 px-4 space-y-2">
                <Link
                  href="/dashboard"
                  className="bg-indigo-600/10 text-indigo-400 group flex items-center px-4 py-3 text-sm font-medium rounded-xl border border-indigo-500/20 transition-all hover:bg-indigo-600/20"
                >
                  <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/history"
                  className="text-gray-400 hover:bg-white/5 hover:text-white group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all"
                >
                  <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  History
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="text-gray-400 hover:bg-white/5 hover:text-white group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all"
                >
                  <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </Link>
              </nav>

              {/* Upgrade Banner */}
              {!isPro && (
                <div className="px-4 mt-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-premium opacity-0 group-hover:opacity-10 transition-opacity" />
                    <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                      Upgrade to Pro <span className="text-lg">👑</span>
                    </h4>
                    <p className="text-xs text-gray-400 mb-3">Unlimited generations & priority AI processing.</p>
                    <Link
                      href="/pricing"
                      className="block w-full py-2 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold text-center transition-colors shadow-glow"
                    >
                      View Plans
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            <UserProfile 
              displayName={displayName}
              email={email}
              avatarUrl={avatarUrl}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden relative">
        {/* Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full -z-10" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600/10 blur-[120px] rounded-full -z-10" />

        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-10">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 animate-fade-in">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
