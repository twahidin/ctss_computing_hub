import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Head from 'next/head';
import { FiCode, FiGrid, FiMessageCircle, FiBook, FiAward, FiClock } from 'react-icons/fi';
import syllabusModules from '@/data/syllabus';

export default function Dashboard() {
  const { data: session } = useSession();

  const quickActions = [
    {
      title: 'Python Lab',
      description: 'Write and run Python code in Jupyter notebooks',
      icon: FiCode,
      href: '/python',
      color: 'bg-green-500',
    },
    {
      title: 'Spreadsheet',
      description: 'Practice Excel functions and formulas',
      icon: FiGrid,
      href: '/spreadsheet',
      color: 'bg-emerald-500',
    },
    {
      title: 'AI Tutor',
      description: 'Get help with any computing topic',
      icon: FiMessageCircle,
      href: '/tutor',
      color: 'bg-purple-500',
    },
    {
      title: 'Syllabus',
      description: 'Browse all modules and exercises',
      icon: FiBook,
      href: '/syllabus',
      color: 'bg-blue-500',
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
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session?.user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="mt-2 text-gray-600">
            Continue your O-Level Computing journey. What would you like to work on today?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="module-card group"
            >
              <div
                className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <action.icon className="text-white" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {action.title}
              </h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </Link>
          ))}
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Module Progress */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Module Progress
            </h2>
            <div className="space-y-4">
              {syllabusModules.map((module) => (
                <div key={module.id}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {module.icon} Module {module.id}: {module.name}
                    </span>
                    <span className="text-sm text-gray-500">0%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${module.color} h-2 rounded-full transition-all duration-300`}
                      style={{ width: '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Your Stats
            </h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <FiAward className="text-yellow-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-500">Exercises Completed</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FiClock className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">0h</p>
                  <p className="text-sm text-gray-500">Time Spent Learning</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity / Recommended */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Continue Learning */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recommended Next Steps
            </h2>
            <div className="space-y-3">
              <Link
                href="/python?exercise=ex-2.3.1"
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-2xl mr-3">🐍</span>
                <div>
                  <p className="font-medium text-gray-900">
                    Variables and Data Types
                  </p>
                  <p className="text-sm text-gray-500">
                    Module 2 • Easy • 20 min
                  </p>
                </div>
              </Link>
              <Link
                href="/spreadsheet?exercise=ex-3.1.1"
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <p className="font-medium text-gray-900">
                    Cell References Practice
                  </p>
                  <p className="text-sm text-gray-500">
                    Module 3 • Easy • 20 min
                  </p>
                </div>
              </Link>
              <Link
                href="/syllabus?module=1"
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-2xl mr-3">💻</span>
                <div>
                  <p className="font-medium text-gray-900">
                    Computer Architecture
                  </p>
                  <p className="text-sm text-gray-500">
                    Module 1 • Start Learning
                  </p>
                </div>
              </Link>
            </div>
          </div>

          {/* Quick Help */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl shadow-sm p-6 text-white">
            <h2 className="text-lg font-semibold mb-2">Need Help?</h2>
            <p className="text-purple-100 mb-4">
              Our AI tutor is available 24/7 to help you with any computing
              topic from the 7155 syllabus.
            </p>
            <Link
              href="/tutor"
              className="inline-flex items-center px-4 py-2 bg-white text-purple-700 rounded-lg font-medium hover:bg-purple-50 transition-colors"
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
