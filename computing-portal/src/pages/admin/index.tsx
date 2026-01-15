import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Layout } from '@/components';
import { UserProfile, UserListItem, SchoolData, FunctionData, canResetPassword, canApproveUser, canManageUser } from '@/types';

type Tab = 'users' | 'pending' | 'schools' | 'functions';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserListItem[]>([]);
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [functions, setFunctions] = useState<FunctionData[]>([]);
  
  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  // New school form state
  const [newSchool, setNewSchool] = useState({
    schoolName: '',
    schoolCode: '',
    listOfClasses: '',
    listOfLevels: '',
    contactEmail: '',
    address: '',
  });
  
  // Edit school state
  const [showEditSchoolModal, setShowEditSchoolModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolData | null>(null);
  const [editSchoolForm, setEditSchoolForm] = useState({
    schoolName: '',
    schoolCode: '',
    listOfClasses: '',
    listOfLevels: '',
    contactEmail: '',
    address: '',
    isActive: true,
  });
  
  const userProfile = session?.user?.profile as UserProfile;
  const isSuperAdmin = userProfile === 'super_admin';
  const isAdmin = userProfile === 'admin';
  const isTeacher = userProfile === 'teacher';

  // Redirect if not authorized
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login');
      return;
    }
    if (!['teacher', 'admin', 'super_admin'].includes(userProfile)) {
      router.push('/dashboard');
      toast.error('Access denied');
    }
  }, [session, status, router, userProfile]);

  // Fetch data based on active tab
  const fetchData = useCallback(async () => {
    if (!session) return;
    
    setLoading(true);
    try {
      switch (activeTab) {
        case 'users':
          const usersRes = await axios.get('/api/admin/users');
          setUsers(usersRes.data.users);
          break;
        case 'pending':
          const pendingRes = await axios.get('/api/admin/users/pending');
          setPendingUsers(pendingRes.data.pendingUsers);
          break;
        case 'schools':
          if (isSuperAdmin || isAdmin) {
            const schoolsRes = await axios.get('/api/admin/schools');
            setSchools(schoolsRes.data.schools);
          }
          break;
        case 'functions':
          if (isSuperAdmin || isAdmin) {
            const functionsRes = await axios.get('/api/admin/functions');
            setFunctions(functionsRes.data.functions);
          }
          break;
      }
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, session, isSuperAdmin, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle user approval
  const handleApproval = async (userId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      await axios.post('/api/admin/users/approve', {
        userId,
        action,
        rejectionReason: reason,
      });
      toast.success(action === 'approve' ? 'User approved!' : 'User rejected');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process approval');
    }
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!selectedUser || !newPassword) return;
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      await axios.post('/api/admin/users/reset-password', {
        userId: selectedUser._id,
        newPassword,
      });
      toast.success('Password reset successfully');
      setShowPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    }
  };

  // Handle create school
  const handleCreateSchool = async () => {
    if (!newSchool.schoolName || !newSchool.schoolCode) {
      toast.error('School name and code are required');
      return;
    }

    try {
      await axios.post('/api/admin/schools', {
        schoolName: newSchool.schoolName,
        schoolCode: newSchool.schoolCode,
        listOfClasses: newSchool.listOfClasses.split(',').map(c => c.trim()).filter(c => c),
        listOfLevels: newSchool.listOfLevels.split(',').map(l => l.trim()).filter(l => l),
        contactEmail: newSchool.contactEmail,
        address: newSchool.address,
      });
      toast.success('School created successfully');
      setShowSchoolModal(false);
      setNewSchool({
        schoolName: '',
        schoolCode: '',
        listOfClasses: '',
        listOfLevels: '',
        contactEmail: '',
        address: '',
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create school');
    }
  };

  // Open edit school modal
  const openEditSchool = (school: SchoolData) => {
    setEditingSchool(school);
    setEditSchoolForm({
      schoolName: school.schoolName,
      schoolCode: school.schoolCode,
      listOfClasses: school.listOfClasses.join(', '),
      listOfLevels: school.listOfLevels.join(', '),
      contactEmail: school.contactEmail || '',
      address: school.address || '',
      isActive: school.isActive,
    });
    setShowEditSchoolModal(true);
  };

  // Handle update school
  const handleUpdateSchool = async () => {
    if (!editingSchool) return;

    try {
      await axios.put(`/api/admin/schools/${editingSchool._id}`, {
        schoolName: editSchoolForm.schoolName,
        schoolCode: editSchoolForm.schoolCode,
        listOfClasses: editSchoolForm.listOfClasses.split(',').map(c => c.trim()).filter(c => c),
        listOfLevels: editSchoolForm.listOfLevels.split(',').map(l => l.trim()).filter(l => l),
        contactEmail: editSchoolForm.contactEmail,
        address: editSchoolForm.address,
        isActive: editSchoolForm.isActive,
      });
      toast.success('School updated successfully');
      setShowEditSchoolModal(false);
      setEditingSchool(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update school');
    }
  };

  // Handle delete school
  const handleDeleteSchool = async (school: SchoolData) => {
    if (!confirm(`Are you sure you want to delete "${school.schoolName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`/api/admin/schools/${school._id}`);
      toast.success('School deleted successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete school');
    }
  };

  // Render tabs based on user profile
  const getTabs = () => {
    const tabs: { id: Tab; label: string; icon: string }[] = [
      { id: 'pending', label: 'Pending Approvals', icon: '⏳' },
      { id: 'users', label: 'Users', icon: '👥' },
    ];
    
    if (isSuperAdmin || isAdmin) {
      tabs.push({ id: 'schools', label: 'Schools', icon: '🏫' });
      tabs.push({ id: 'functions', label: 'Functions', icon: '⚙️' });
    }
    
    return tabs;
  };

  if (status === 'loading' || !session) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Admin Dashboard | Computing 7155</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-slate-400">
            {isSuperAdmin && 'Super Administrator - Full system access'}
            {isAdmin && `School Administrator - ${session.user.school || 'No school assigned'}`}
            {isTeacher && `Teacher - ${session.user.class || 'No class assigned'}`}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
          {getTabs().map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {tab.id === 'pending' && pendingUsers.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {pendingUsers.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <>
              {/* Pending Approvals Tab */}
              {activeTab === 'pending' && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">Pending Approvals</h2>
                  {pendingUsers.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">No pending approvals</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingUsers.map((user) => (
                        <div
                          key={user._id}
                          className="bg-slate-900/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div>
                            <p className="text-white font-medium">{user.name}</p>
                            <p className="text-slate-400 text-sm">
                              @{user.username} • {user.profile} • {user.school || 'No school'} • Class: {user.class || 'N/A'}
                            </p>
                            <p className="text-slate-500 text-xs mt-1">
                              Registered: {new Date(user.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApproval(user._id, 'approve')}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Rejection reason (optional):');
                                handleApproval(user._id, 'reject', reason || undefined);
                              }}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-white">User Management</h2>
                    {(isSuperAdmin || isAdmin) && (
                      <button
                        onClick={() => setShowUserModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                      >
                        + Add User
                      </button>
                    )}
                  </div>
                  
                  {users.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">No users found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-slate-400 border-b border-slate-700">
                            <th className="pb-3 font-medium">Name</th>
                            <th className="pb-3 font-medium">Username</th>
                            <th className="pb-3 font-medium">Profile</th>
                            <th className="pb-3 font-medium">School</th>
                            <th className="pb-3 font-medium">Class</th>
                            <th className="pb-3 font-medium">Status</th>
                            <th className="pb-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-white">
                          {users.map((user) => (
                            <tr key={user._id} className="border-b border-slate-700/50">
                              <td className="py-3">{user.name}</td>
                              <td className="py-3 text-slate-400">@{user.username}</td>
                              <td className="py-3">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  user.profile === 'super_admin' ? 'bg-purple-500/20 text-purple-300' :
                                  user.profile === 'admin' ? 'bg-orange-500/20 text-orange-300' :
                                  user.profile === 'teacher' ? 'bg-blue-500/20 text-blue-300' :
                                  'bg-slate-500/20 text-slate-300'
                                }`}>
                                  {user.profile}
                                </span>
                              </td>
                              <td className="py-3 text-slate-400">{user.school || '-'}</td>
                              <td className="py-3 text-slate-400">{user.class || '-'}</td>
                              <td className="py-3">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  user.approvalStatus === 'approved' ? 'bg-emerald-500/20 text-emerald-300' :
                                  user.approvalStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                                  'bg-red-500/20 text-red-300'
                                }`}>
                                  {user.approvalStatus}
                                </span>
                              </td>
                              <td className="py-3">
                                <div className="flex space-x-2">
                                  {canResetPassword(userProfile, user.profile as UserProfile) && (
                                    <button
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setShowPasswordModal(true);
                                      }}
                                      className="px-3 py-1 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors"
                                    >
                                      Reset Password
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Schools Tab */}
              {activeTab === 'schools' && (isSuperAdmin || isAdmin) && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-white">School Management</h2>
                    {isSuperAdmin && (
                      <button
                        onClick={() => setShowSchoolModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                      >
                        + Add School
                      </button>
                    )}
                  </div>
                  
                  {schools.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">No schools found</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {schools.map((school) => (
                        <div
                          key={school._id}
                          className="bg-slate-900/50 rounded-xl p-4"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="text-white font-medium">{school.schoolName}</h3>
                              <p className="text-slate-400 text-sm">Code: {school.schoolCode}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              school.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                            }`}>
                              {school.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="text-sm text-slate-400 space-y-1">
                            <p>Classes: {school.listOfClasses.join(', ') || 'None'}</p>
                            <p>Levels: {school.listOfLevels.join(', ') || 'None'}</p>
                          </div>
                          {/* Edit and Delete Buttons */}
                          <div className="flex space-x-2 mt-4 pt-3 border-t border-slate-700/50">
                            <button
                              onClick={() => openEditSchool(school)}
                              className="flex-1 px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors"
                            >
                              ✏️ Edit
                            </button>
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteSchool(school)}
                                className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 transition-colors"
                              >
                                🗑️ Delete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Functions Tab */}
              {activeTab === 'functions' && (isSuperAdmin || isAdmin) && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-white">Function Management</h2>
                    {isSuperAdmin && (
                      <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors">
                        + Add Function
                      </button>
                    )}
                  </div>
                  
                  {functions.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">No functions configured</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {functions.map((func) => (
                        <div
                          key={func._id}
                          className="bg-slate-900/50 rounded-xl p-4"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-white font-medium">{func.functionName}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              func.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                            }`}>
                              {func.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-slate-400 text-sm mb-2">Code: {func.functionCode}</p>
                          <p className="text-slate-500 text-xs">
                            Access: {func.profileFunctionList.join(', ')}
                          </p>
                          {func.isSystemFunction && (
                            <span className="inline-block mt-2 px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                              System Function
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Password Reset Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-semibold text-white mb-4">Reset Password</h3>
            <p className="text-slate-400 mb-4">
              Reset password for <span className="text-white font-medium">{selectedUser.name}</span> (@{selectedUser.username})
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 characters)"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setSelectedUser(null);
                  setNewPassword('');
                }}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordReset}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add School Modal */}
      {showSchoolModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-4">Add New School</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  School Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newSchool.schoolName}
                  onChange={(e) => setNewSchool({ ...newSchool, schoolName: e.target.value })}
                  placeholder="e.g., Springfield Secondary School"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  School Code <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newSchool.schoolCode}
                  onChange={(e) => setNewSchool({ ...newSchool, schoolCode: e.target.value.toUpperCase() })}
                  placeholder="e.g., SSS"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-slate-500 text-xs mt-1">Unique code for the school (will be uppercased)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Classes
                </label>
                <input
                  type="text"
                  value={newSchool.listOfClasses}
                  onChange={(e) => setNewSchool({ ...newSchool, listOfClasses: e.target.value })}
                  placeholder="e.g., 3A, 3B, 3C, 4A, 4B"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-slate-500 text-xs mt-1">Comma-separated list of classes</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Levels
                </label>
                <input
                  type="text"
                  value={newSchool.listOfLevels}
                  onChange={(e) => setNewSchool({ ...newSchool, listOfLevels: e.target.value })}
                  placeholder="e.g., Sec 3, Sec 4, Sec 5"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-slate-500 text-xs mt-1">Comma-separated list of levels</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={newSchool.contactEmail}
                  onChange={(e) => setNewSchool({ ...newSchool, contactEmail: e.target.value })}
                  placeholder="e.g., admin@school.edu.sg"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Address
                </label>
                <textarea
                  value={newSchool.address}
                  onChange={(e) => setNewSchool({ ...newSchool, address: e.target.value })}
                  placeholder="School address"
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowSchoolModal(false);
                  setNewSchool({
                    schoolName: '',
                    schoolCode: '',
                    listOfClasses: '',
                    listOfLevels: '',
                    contactEmail: '',
                    address: '',
                  });
                }}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSchool}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
              >
                Create School
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit School Modal */}
      {showEditSchoolModal && editingSchool && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-4">Edit School</h3>
            
            <div className="space-y-4">
              {isSuperAdmin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      School Name
                    </label>
                    <input
                      type="text"
                      value={editSchoolForm.schoolName}
                      onChange={(e) => setEditSchoolForm({ ...editSchoolForm, schoolName: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      School Code
                    </label>
                    <input
                      type="text"
                      value={editSchoolForm.schoolCode}
                      onChange={(e) => setEditSchoolForm({ ...editSchoolForm, schoolCode: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Classes
                </label>
                <input
                  type="text"
                  value={editSchoolForm.listOfClasses}
                  onChange={(e) => setEditSchoolForm({ ...editSchoolForm, listOfClasses: e.target.value })}
                  placeholder="e.g., 3A, 3B, 3C, 4A, 4B"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-slate-500 text-xs mt-1">Comma-separated list of classes</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Levels
                </label>
                <input
                  type="text"
                  value={editSchoolForm.listOfLevels}
                  onChange={(e) => setEditSchoolForm({ ...editSchoolForm, listOfLevels: e.target.value })}
                  placeholder="e.g., Sec 3, Sec 4, Sec 5"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-slate-500 text-xs mt-1">Comma-separated list of levels</p>
              </div>

              {isSuperAdmin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={editSchoolForm.contactEmail}
                      onChange={(e) => setEditSchoolForm({ ...editSchoolForm, contactEmail: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Address
                    </label>
                    <textarea
                      value={editSchoolForm.address}
                      onChange={(e) => setEditSchoolForm({ ...editSchoolForm, address: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={editSchoolForm.isActive}
                      onChange={(e) => setEditSchoolForm({ ...editSchoolForm, isActive: e.target.checked })}
                      className="w-5 h-5 rounded bg-slate-900/50 border-slate-600 text-indigo-500 focus:ring-indigo-500"
                    />
                    <label htmlFor="isActive" className="text-sm text-slate-300">
                      School is active
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditSchoolModal(false);
                  setEditingSchool(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSchool}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

