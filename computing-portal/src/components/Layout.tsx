import { ReactNode, useState, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiCode,
  FiGrid,
  FiUser,
  FiLogOut,
  FiMenu,
  FiX,
  FiSettings,
  FiShield,
} from 'react-icons/fi';
import { UserProfile } from '@/types';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: any;
  profiles?: UserProfile[];
}

export default function Layout({ children }: LayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userProfile = session?.user?.profile as UserProfile | undefined;

  // Navigation items with role-based access
  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { href: '/python', label: 'Python Lab', icon: FiCode },
      { href: '/spreadsheet', label: 'Spreadsheet', icon: FiGrid },
      { 
        href: '/admin', 
        label: 'Admin Dashboard', 
        icon: FiSettings,
        profiles: ['teacher', 'admin', 'super_admin'],
      },
    ];
    return items;
  }, []);

  // Filter nav items based on user profile
  const filteredNavItems = useMemo(() => {
    return navItems.filter(item => {
      if (!item.profiles) return true;
      if (!userProfile) return false;
      return item.profiles.includes(userProfile);
    });
  }, [navItems, userProfile]);

  // Don't show layout on auth pages
  const isAuthPage = router.pathname.startsWith('/auth');
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!session && !isAuthPage) {
    if (typeof window !== 'undefined') {
      router.push('/auth/login');
    }
    return null;
  }

  // Profile badge color
  const getProfileColor = (profile?: string) => {
    switch (profile) {
      case 'super_admin': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'admin': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'teacher': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Mobile sidebar toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg shadow-md border border-slate-700"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-800/80 backdrop-blur-xl shadow-2xl border-r border-slate-700/50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-700/50">
            <Link href="/python" className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <span className="text-xl">💻</span>
              </div>
              <span className="text-xl font-bold text-white">
                Computing 7155
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const isActive = router.pathname === item.href || 
                router.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-white border border-transparent'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                  {item.profiles && (
                    <FiShield size={14} className="ml-auto text-slate-500" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-slate-700/50">
            <div className="flex items-center space-x-3 px-3 py-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <FiUser className="text-white" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {session?.user?.name}
                </p>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getProfileColor(userProfile)}`}>
                    {userProfile || 'student'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* School/Class info for students/teachers */}
            {session?.user?.school && (
              <div className="px-3 py-2 text-xs text-slate-500">
                <p>{session.user.school}</p>
                {session.user.class && <p>Class: {session.user.class}</p>}
              </div>
            )}
            
            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="flex items-center space-x-3 px-4 py-3 w-full text-slate-400 hover:bg-slate-700/50 hover:text-red-400 rounded-xl transition-all duration-200 mt-2"
            >
              <FiLogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
