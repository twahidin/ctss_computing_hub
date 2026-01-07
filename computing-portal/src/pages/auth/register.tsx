import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import toast from 'react-hot-toast';
import axios from 'axios';

interface School {
  _id: string;
  schoolName: string;
  schoolCode: string;
  listOfClasses: string[];
  listOfLevels: string[];
}

export default function Register() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    schoolId: '',
    level: '',
    class: '',
    password: '',
    confirmPassword: '',
  });

  // Fetch schools on mount
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await axios.get('/api/public/schools');
        setSchools(response.data.schools);
      } catch (error) {
        console.error('Failed to fetch schools:', error);
        toast.error('Failed to load schools. Please refresh the page.');
      }
    };
    fetchSchools();
  }, []);

  // Update selected school when schoolId changes
  useEffect(() => {
    if (formData.schoolId) {
      const school = schools.find(s => s._id === formData.schoolId);
      setSelectedSchool(school || null);
      // Reset level and class when school changes
      setFormData(prev => ({ ...prev, level: '', class: '' }));
    } else {
      setSelectedSchool(null);
    }
  }, [formData.schoolId, schools]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (formData.username.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }

    if (!formData.schoolId || !formData.level || !formData.class) {
      toast.error('Please select your school, level, and class');
      return;
    }

    setLoading(true);

    try {
      await axios.post('/api/auth/register', {
        name: formData.name,
        username: formData.username,
        email: formData.email || undefined,
        schoolId: formData.schoolId,
        level: formData.level,
        class: formData.class,
        password: formData.password,
      });

      toast.success('Registration submitted! Please wait for approval from your teacher or administrator.');
      router.push('/auth/login?registered=true');
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Register | Computing 7155 Portal</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
        <div className="w-full max-w-lg">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 mb-4">
              <span className="text-4xl">💻</span>
            </div>
            <h1 className="text-3xl font-bold text-white mt-4">
              Computing 7155
            </h1>
            <p className="text-indigo-300 mt-2">Create your student account</p>
          </div>

          {/* Registration Form */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Student Registration</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="Your full name"
                />
              </div>

              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })
                  }
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="Choose a username"
                />
                <p className="text-xs text-slate-400 mt-1">Minimum 3 characters, no spaces</p>
              </div>

              {/* Email (Optional) */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Email <span className="text-slate-500">(Optional)</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="student@school.edu.sg"
                />
              </div>

              {/* School Selection */}
              <div>
                <label
                  htmlFor="school"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  School
                </label>
                <select
                  id="school"
                  required
                  value={formData.schoolId}
                  onChange={(e) =>
                    setFormData({ ...formData, schoolId: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                >
                  <option value="">Select your school</option>
                  {schools.map((school) => (
                    <option key={school._id} value={school._id}>
                      {school.schoolName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Level and Class - only show if school is selected */}
              {selectedSchool && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="level"
                      className="block text-sm font-medium text-slate-300 mb-2"
                    >
                      Level
                    </label>
                    <select
                      id="level"
                      required
                      value={formData.level}
                      onChange={(e) =>
                        setFormData({ ...formData, level: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    >
                      <option value="">Select level</option>
                      {selectedSchool.listOfLevels.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="class"
                      className="block text-sm font-medium text-slate-300 mb-2"
                    >
                      Class
                    </label>
                    <select
                      id="class"
                      required
                      value={formData.class}
                      onChange={(e) =>
                        setFormData({ ...formData, class: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    >
                      <option value="">Select class</option>
                      {selectedSchool.listOfClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="••••••••"
                />
                <p className="text-xs text-slate-400 mt-1">Minimum 6 characters</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="••••••••"
                />
              </div>

              {/* Info Box */}
              <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-xl">ℹ️</span>
                  <p className="text-sm text-indigo-200">
                    After registration, your account will need to be approved by your teacher or school administrator before you can log in.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 focus:ring-4 focus:ring-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting registration...
                  </span>
                ) : (
                  'Register'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-slate-400">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
