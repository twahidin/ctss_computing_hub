import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Head from 'next/head';
import { FiCode, FiGrid, FiMessageCircle, FiBook, FiAward, FiClock, FiSettings, FiUsers } from 'react-icons/fi';
import syllabusModules from '@/data/syllabus';
import { UserProfile } from '@/types';

export default function Dashboard() {
  const { data: session } = useSession();
  const userProfile = session?.user?.profile as UserProfile | undefined;
  const isStaff = userProfile && ['teacher', 'admin', 'super_admin'].includes(userProfile);

  const quickActions = [
    {
      title: 'Python Lab',
      description: 'Write and run Python code in Jupyter notebooks',
      icon: FiCode,
      href: '/python',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      title: 'Spreadsheet',
      description: 'Practice Excel functions and formulas',
      icon: FiGrid,
      href: '/spreadsheet',
      color: 'from-cyan-500 to-blue-600',
    },
    {
      title: 'AI Tutor',
      description: 'Get help with any computing topic',
      icon: FiMessageCircle,
      href: '/tutor',
      color: 'from-purple-500 to-pink-600',
    },
    {
      title: 'Syllabus',
      description: 'Browse all modules and exercises',
      icon: FiBook,
      href: '/syllabus',
      color: 'from-amber-500 to-orange-600',
    },
  ];

  // Admin actions for staff
  const adminActions = [
    {
      title: 'Admin Dashboard',
      description: 'Manage users and approvals',
      icon: FiSettings,
      href: '/admin',
      color: 'from-rose-500 to-red-600',
    },
  ];

  return (
    <>
      <Head>
        <title>Dashboard | Computing 7155 Portal</title>
      </Head>

      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {session?.user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="mt-2 text-slate-400">
            {userProfile === 'student' && 'Continue your O-Level Computing journey. What would you like to work on today?'}
            {userProfile === 'teacher' && `Teaching ${session?.user?.class || 'your class'} at ${session?.user?.school || 'your school'}`}
            {userProfile === 'admin' && `Administrator at ${session?.user?.school || 'your school'}`}
            {userProfile === 'super_admin' && 'Super Administrator - Full system access'}
          </p>
        </div>

        {/* Staff Admin Actions */}
        {isStaff && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <FiUsers className="mr-2" />
              Administration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <action.icon className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{action.title}</h3>
                      <p className="text-sm text-slate-400">{action.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <action.icon className="text-white" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">{action.title}</h3>
                <p className="text-sm text-slate-400">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Module Progress */}
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Module Progress
            </h2>
            <div className="space-y-4">
              {syllabusModules.map((module) => (
                <div key={module.id}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-300">
                      {module.icon} Module {module.id}: {module.name}
                    </span>
                    <span className="text-sm text-slate-500">0%</span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Your Stats
            </h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <FiAward className="text-amber-400" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">0</p>
                  <p className="text-sm text-slate-500">Exercises Completed</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <FiClock className="text-blue-400" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">0h</p>
                  <p className="text-sm text-slate-500">Time Spent Learning</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity / Recommended */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Continue Learning */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Recommended Next Steps
            </h2>
            <div className="space-y-3">
              <Link
                href="/python?exercise=ex-2.3.1"
                className="flex items-center p-3 bg-slate-700/30 rounded-xl hover:bg-slate-700/50 transition-colors"
              >
                <span className="text-2xl mr-3">🐍</span>
                <div>
                  <p className="font-medium text-white">
                    Variables and Data Types
                  </p>
                  <p className="text-sm text-slate-400">
                    Module 2 • Easy • 20 min
                  </p>
                </div>
              </Link>
              <Link
                href="/spreadsheet?exercise=ex-3.1.1"
                className="flex items-center p-3 bg-slate-700/30 rounded-xl hover:bg-slate-700/50 transition-colors"
              >
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <p className="font-medium text-white">
                    Cell References Practice
                  </p>
                  <p className="text-sm text-slate-400">
                    Module 3 • Easy • 20 min
                  </p>
                </div>
              </Link>
              <Link
                href="/syllabus?module=1"
                className="flex items-center p-3 bg-slate-700/30 rounded-xl hover:bg-slate-700/50 transition-colors"
              >
                <span className="text-2xl mr-3">💻</span>
                <div>
                  <p className="font-medium text-white">
                    Computer Architecture
                  </p>
                  <p className="text-sm text-slate-400">
                    Module 1 • Start Learning
                  </p>
                </div>
              </Link>
            </div>
          </div>

          {/* Quick Help */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-lg shadow-indigo-500/20 p-6 text-white">
            <h2 className="text-lg font-semibold mb-2">Need Help?</h2>
            <p className="text-indigo-200 mb-4">
              Our AI tutor is available 24/7 to help you with any computing
              topic from the 7155 syllabus.
            </p>
            <Link
              href="/tutor"
              className="inline-flex items-center px-4 py-2 bg-white text-indigo-700 rounded-xl font-medium hover:bg-indigo-50 transition-colors shadow-lg"
            >
              <FiMessageCircle className="mr-2" />
              Chat with AI Tutor
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
