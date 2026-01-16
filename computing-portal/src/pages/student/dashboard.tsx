import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  FiLoader,
  FiTrendingUp,
  FiTrendingDown,
  FiMinus,
  FiAward,
  FiTarget,
  FiBook,
  FiCheckCircle,
  FiAlertCircle,
  FiFileText,
  FiChevronDown,
  FiChevronUp,
  FiInfo,
  FiBarChart2,
  FiPieChart,
  FiBell,
  FiX,
  FiClock,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  assignment?: {
    title: string;
    subject: string;
    topic: string;
  };
}

interface TopicPerformance {
  topic: string;
  subject: string;
  totalAttempts: number;
  averageScore: number;
  trend: 'improving' | 'stable' | 'declining';
  strengthLevel: 'weak' | 'developing' | 'proficient' | 'strong';
}

interface SubjectPerformance {
  subject: string;
  averageScore: number;
  totalAssignments: number;
  completedAssignments: number;
  topics: TopicPerformance[];
}

interface RecentGrade {
  assignmentId: string;
  subject: string;
  topic: string;
  percentage: number;
  grade: string;
  date: string;
}

interface LearningProfile {
  overallAbilityLevel: 'below_grade' | 'at_grade' | 'above_grade';
  subjectPerformance: SubjectPerformance[];
  recentGrades: RecentGrade[];
  strongTopics: string[];
  weakTopics: string[];
  totalSubmissions: number;
  draftSubmissions: number;
  finalSubmissions: number;
}

interface Submission {
  _id: string;
  assignment: {
    title: string;
    subject: string;
    topic: string;
    totalMarks: number;
  };
  submissionType: 'draft' | 'final';
  status: string;
  marksAwarded?: number;
  marksTotal?: number;
  percentage?: number;
  grade?: string;
  submittedAt: string;
  feedback?: any[];
}

interface Insight {
  type: 'strength' | 'improvement' | 'trend' | 'recommendation';
  title: string;
  description: string;
}

interface ProgressionData {
  bySubject: Record<string, { date: string; percentage: number; topic: string; grade: string }[]>;
  overall: { date: string; percentage: number }[];
  movingAverage: { date: string; average: number }[];
}

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [progressionData, setProgressionData] = useState<ProgressionData | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'insights'>('overview');
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
  
  // Notification states
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Redirect non-students
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.profile !== 'student') {
      router.push('/teacher/assignments');
    }
  }, [session, status, router]);

  // Fetch learning profile
  useEffect(() => {
    if (session) {
      fetchLearningProfile();
      fetchNotifications();
    }
  }, [session]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (session) {
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=10');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
      });
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment_new':
        return <FiFileText className="text-indigo-400" />;
      case 'submission_received':
        return <FiCheckCircle className="text-green-400" />;
      case 'marking_complete':
        return <FiAward className="text-purple-400" />;
      case 'submission_returned':
        return <FiAlertCircle className="text-amber-400" />;
      case 'assignment_due_soon':
        return <FiClock className="text-red-400" />;
      default:
        return <FiBell className="text-slate-400" />;
    }
  };

  const fetchLearningProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/student/learning-profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setSubmissions(data.submissions || []);
        setProgressionData(data.progressionData);
        setInsights(data.insights || []);
      }
    } catch (error) {
      console.error('Failed to fetch learning profile:', error);
      toast.error('Failed to load your progress data');
    } finally {
      setLoading(false);
    }
  };

  const getAbilityLevelInfo = (level: string) => {
    switch (level) {
      case 'above_grade':
        return { label: 'Above Grade', color: 'text-green-400 bg-green-500/20 border-green-500/30', icon: FiTrendingUp };
      case 'at_grade':
        return { label: 'At Grade', color: 'text-blue-400 bg-blue-500/20 border-blue-500/30', icon: FiMinus };
      case 'below_grade':
        return { label: 'Below Grade', color: 'text-amber-400 bg-amber-500/20 border-amber-500/30', icon: FiTrendingDown };
      default:
        return { label: 'Unknown', color: 'text-slate-400 bg-slate-500/20 border-slate-500/30', icon: FiMinus };
    }
  };

  const getStrengthColor = (level: string) => {
    switch (level) {
      case 'strong': return 'bg-green-500';
      case 'proficient': return 'bg-blue-500';
      case 'developing': return 'bg-amber-500';
      case 'weak': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <FiTrendingUp className="text-green-400" />;
      case 'declining': return <FiTrendingDown className="text-red-400" />;
      default: return <FiMinus className="text-slate-400" />;
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade?.startsWith('A')) return 'text-green-400';
    if (grade?.startsWith('B')) return 'text-blue-400';
    if (grade?.startsWith('C')) return 'text-amber-400';
    return 'text-red-400';
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'strength': return <FiCheckCircle className="text-green-400" />;
      case 'improvement': return <FiTarget className="text-amber-400" />;
      case 'trend': return <FiTrendingUp className="text-blue-400" />;
      case 'recommendation': return <FiInfo className="text-purple-400" />;
      default: return <FiInfo className="text-slate-400" />;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FiLoader className="animate-spin text-4xl text-indigo-500" />
      </div>
    );
  }

  const overallAverage = profile?.recentGrades?.length
    ? Math.round(profile.recentGrades.reduce((sum, g) => sum + g.percentage, 0) / profile.recentGrades.length)
    : 0;

  const abilityInfo = profile ? getAbilityLevelInfo(profile.overallAbilityLevel) : null;

  return (
    <>
      <Head>
        <title>My Progress | Computing 7155 Portal</title>
      </Head>

      <div className="max-w-7xl mx-auto">
        {/* Header with Notification Bell */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              📊 My Learning Progress
            </h1>
            <p className="text-slate-400">
              Track your performance, view feedback, and understand your learning journey
            </p>
          </div>
          
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-3 bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 hover:bg-slate-700/50 transition-colors"
            >
              <FiBell className="text-xl text-slate-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-800 rounded-xl border border-slate-700 shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-slate-700 flex items-center justify-between">
                  <h3 className="font-medium text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <FiBell className="text-3xl text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification._id}
                        onClick={() => {
                          if (!notification.read) {
                            markNotificationRead(notification._id);
                          }
                        }}
                        className={`p-3 border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors ${
                          !notification.read ? 'bg-indigo-500/5' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium ${!notification.read ? 'text-white' : 'text-slate-300'}`}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="flex-shrink-0 w-2 h-2 bg-indigo-500 rounded-full mt-1.5" />
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(notification.createdAt).toLocaleDateString()} at{' '}
                              {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notification Banner for New Items */}
        {unreadCount > 0 && !showNotifications && (
          <div className="mb-6 p-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiBell className="text-indigo-400 text-xl" />
              <div>
                <p className="text-white font-medium">
                  You have {unreadCount} new notification{unreadCount !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-slate-400">
                  Click the bell icon to view your notifications
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowNotifications(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 text-sm font-medium"
            >
              View
            </button>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Overall Average</p>
              <FiBarChart2 className="text-indigo-400" />
            </div>
            <p className="text-2xl font-bold text-white">{overallAverage}%</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Ability Level</p>
              {abilityInfo && <abilityInfo.icon className="text-indigo-400" />}
            </div>
            {abilityInfo && (
              <span className={`text-sm px-2 py-1 rounded border ${abilityInfo.color}`}>
                {abilityInfo.label}
              </span>
            )}
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Total Submissions</p>
              <FiFileText className="text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">{profile?.totalSubmissions || 0}</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Draft Feedback</p>
              <FiTarget className="text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white">{profile?.draftSubmissions || 0}</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Final Graded</p>
              <FiAward className="text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">{profile?.finalSubmissions || 0}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['overview', 'submissions', 'insights'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700/50 text-slate-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Progress Chart */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <FiBarChart2 className="mr-2 text-indigo-400" />
                Performance Trend
              </h2>
              
              {progressionData?.overall && progressionData.overall.length > 0 ? (
                <div>
                  {/* Simple visual chart using divs */}
                  <div className="flex items-end justify-between h-40 mb-4 gap-1">
                    {progressionData.overall.slice(-10).map((point, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-indigo-500/20 rounded-t relative group"
                        style={{ height: `${point.percentage}%` }}
                      >
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-t transition-all"
                          style={{ height: `${point.percentage}%` }}
                        />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {point.percentage}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Older</span>
                    <span>Recent</span>
                  </div>
                  
                  {/* Moving Average */}
                  {progressionData.movingAverage && progressionData.movingAverage.length > 0 && (
                    <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
                      <p className="text-sm text-slate-400">
                        3-submission moving average: 
                        <span className="text-white font-medium ml-2">
                          {progressionData.movingAverage[progressionData.movingAverage.length - 1]?.average || 0}%
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FiBarChart2 className="text-4xl text-slate-600 mb-4" />
                  <p className="text-slate-400">No performance data yet</p>
                  <p className="text-sm text-slate-500 mt-1">Submit assignments to see your progress</p>
                </div>
              )}
            </div>

            {/* Subject Performance */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <FiPieChart className="mr-2 text-purple-400" />
                Subject Performance
              </h2>
              
              {profile?.subjectPerformance && profile.subjectPerformance.length > 0 ? (
                <div className="space-y-4">
                  {profile.subjectPerformance.map((subject) => (
                    <div key={subject.subject} className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-white flex items-center">
                          <FiBook className="mr-2 text-slate-400" />
                          {subject.subject}
                        </h3>
                        <span className="text-lg font-bold text-white">{subject.averageScore}%</span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="h-2 bg-slate-600 rounded-full mb-3">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                          style={{ width: `${subject.averageScore}%` }}
                        />
                      </div>
                      
                      {/* Topic breakdown */}
                      {subject.topics.length > 0 && (
                        <div className="space-y-1">
                          {subject.topics.slice(0, 3).map((topic) => (
                            <div key={topic.topic} className="flex items-center justify-between text-sm">
                              <span className="text-slate-400 flex items-center">
                                {getTrendIcon(topic.trend)}
                                <span className="ml-2">{topic.topic}</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${getStrengthColor(topic.strengthLevel)}`} />
                                <span className="text-slate-300">{topic.averageScore}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FiBook className="text-4xl text-slate-600 mb-4" />
                  <p className="text-slate-400">No subject data yet</p>
                </div>
              )}
            </div>

            {/* Strengths & Weaknesses */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strong Topics */}
              <div className="bg-green-500/10 rounded-2xl border border-green-500/30 p-6">
                <h2 className="text-lg font-semibold text-green-400 mb-4 flex items-center">
                  <FiCheckCircle className="mr-2" />
                  Your Strengths
                </h2>
                {profile?.strongTopics && profile.strongTopics.length > 0 ? (
                  <div className="space-y-2">
                    {profile.strongTopics.map((topic, idx) => (
                      <div key={idx} className="flex items-center p-2 bg-green-500/10 rounded-lg">
                        <FiCheckCircle className="text-green-400 mr-2" />
                        <span className="text-slate-300">{topic}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">
                    Complete more assignments to identify your strengths
                  </p>
                )}
              </div>

              {/* Weak Topics */}
              <div className="bg-amber-500/10 rounded-2xl border border-amber-500/30 p-6">
                <h2 className="text-lg font-semibold text-amber-400 mb-4 flex items-center">
                  <FiTarget className="mr-2" />
                  Areas to Focus On
                </h2>
                {profile?.weakTopics && profile.weakTopics.length > 0 ? (
                  <div className="space-y-2">
                    {profile.weakTopics.map((topic, idx) => (
                      <div key={idx} className="flex items-center p-2 bg-amber-500/10 rounded-lg">
                        <FiTarget className="text-amber-400 mr-2" />
                        <span className="text-slate-300">{topic}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">
                    Great job! No weak areas identified yet
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <FiFileText className="mr-2 text-indigo-400" />
                Submission History
              </h2>
            </div>
            
            {submissions.length > 0 ? (
              <div className="divide-y divide-slate-700/50">
                {submissions.map((submission) => (
                  <div key={submission._id}>
                    <div
                      className="p-4 cursor-pointer hover:bg-slate-700/30 transition-colors"
                      onClick={() => setExpandedSubmission(
                        expandedSubmission === submission._id ? null : submission._id
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-medium text-white">
                              {submission.assignment?.title || 'Unknown Assignment'}
                            </h3>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              submission.submissionType === 'draft'
                                ? 'bg-slate-500/20 text-slate-400'
                                : 'bg-indigo-500/20 text-indigo-400'
                            }`}>
                              {submission.submissionType}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              submission.status === 'completed' || submission.status === 'approved'
                                ? 'bg-green-500/20 text-green-400'
                                : submission.status === 'returned'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {submission.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400">
                            {submission.assignment?.subject} - {submission.assignment?.topic}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {submission.percentage !== undefined && (
                            <div className="text-right">
                              <p className="text-lg font-bold text-white">
                                {submission.marksAwarded}/{submission.marksTotal}
                              </p>
                              <p className={`text-sm font-medium ${getGradeColor(submission.grade || '')}`}>
                                {submission.grade} ({submission.percentage}%)
                              </p>
                            </div>
                          )}
                          <div className="text-right text-sm text-slate-500">
                            {new Date(submission.submittedAt).toLocaleDateString()}
                          </div>
                          {expandedSubmission === submission._id ? (
                            <FiChevronUp className="text-slate-400" />
                          ) : (
                            <FiChevronDown className="text-slate-400" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded Feedback */}
                    {expandedSubmission === submission._id && submission.feedback && submission.feedback.length > 0 && (
                      <div className="px-4 pb-4">
                        <div className="bg-slate-700/30 rounded-lg p-4">
                          {submission.feedback.map((fb: any, idx: number) => (
                            <div key={idx} className="space-y-3">
                              <div>
                                <h4 className="font-medium text-white mb-2">Overall Feedback</h4>
                                <p className="text-sm text-slate-300">{fb.overallFeedback}</p>
                              </div>
                              
                              {fb.overallStrengths?.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-green-400 mb-1">Strengths:</p>
                                  <ul className="text-sm text-slate-400 space-y-0.5">
                                    {fb.overallStrengths.map((s: string, i: number) => (
                                      <li key={i}>• {s}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {fb.overallImprovements?.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-amber-400 mb-1">Areas to Improve:</p>
                                  <ul className="text-sm text-slate-400 space-y-0.5">
                                    {fb.overallImprovements.map((i: string, idx: number) => (
                                      <li key={idx}>• {i}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <FiFileText className="text-4xl text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No submissions yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Submit assignments to track your progress
                </p>
              </div>
            )}
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            {insights.length > 0 ? (
              insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`bg-slate-800/50 backdrop-blur-xl rounded-2xl border p-6 ${
                    insight.type === 'strength' ? 'border-green-500/30' :
                    insight.type === 'improvement' ? 'border-amber-500/30' :
                    insight.type === 'trend' ? 'border-blue-500/30' :
                    'border-purple-500/30'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-slate-700/50">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{insight.title}</h3>
                      <p className="text-slate-300">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-12 text-center">
                <FiInfo className="text-4xl text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No insights yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Complete more assignments to receive personalized learning insights
                </p>
              </div>
            )}

            {/* Recent Grades Table */}
            {profile?.recentGrades && profile.recentGrades.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
                <div className="p-4 border-b border-slate-700">
                  <h2 className="text-lg font-semibold text-white">Recent Grades</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-slate-400 border-b border-slate-700">
                        <th className="p-4">Subject</th>
                        <th className="p-4">Topic</th>
                        <th className="p-4">Score</th>
                        <th className="p-4">Grade</th>
                        <th className="p-4">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.recentGrades.map((grade, idx) => (
                        <tr key={idx} className="border-b border-slate-700/50">
                          <td className="p-4 text-white">{grade.subject}</td>
                          <td className="p-4 text-slate-300">{grade.topic}</td>
                          <td className="p-4 text-white font-medium">{grade.percentage}%</td>
                          <td className={`p-4 font-bold ${getGradeColor(grade.grade)}`}>
                            {grade.grade}
                          </td>
                          <td className="p-4 text-slate-400">
                            {new Date(grade.date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
