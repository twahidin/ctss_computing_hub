import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  FiPlus,
  FiFileText,
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiLoader,
  FiChevronDown,
  FiChevronUp,
  FiEdit,
  FiEdit3,
  FiTrash2,
  FiSend,
  FiEye,
  FiUpload,
  FiDownload,
  FiRefreshCw,
  FiAlertCircle,
  FiAward,
  FiTarget,
  FiZap,
  FiSettings,
  FiX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Question {
  id: string;
  question: string;
  type: string;
  marks: number;
  markingScheme?: string;
  modelAnswer?: string;
  topic?: string;
  difficulty?: string;
}

interface Assignment {
  _id: string;
  title: string;
  subject: string;
  topic: string;
  grade: string;
  class: string;
  totalMarks: number;
  questions: Question[];
  learningOutcomesPdf?: string;
  resourcePdfs?: string[];
  dueDate?: string;
  status: 'draft' | 'published' | 'archived';
  difficulty: string;
  allowDraftSubmissions: boolean;
  requiresApproval: boolean;
  stats?: {
    totalStudents: number;
    draftCount: number;
    finalCount: number;
    pendingApprovalCount: number;
    approvedCount: number;
    returnedCount: number;
    notSubmittedCount: number;
    averageScore: number | null;
  };
  submissions?: any[];
  notSubmitted?: { _id: string; name: string; username: string }[];
  createdAt: string;
}

interface SubmissionForReview {
  _id: string;
  student: { _id: string; name: string; username: string };
  status: string;
  submittedAt: string;
  marksAwarded?: number;
  marksTotal?: number;
  percentage?: number;
  grade?: string;
}

type ModalType = 'create' | 'generate' | 'review' | 'bulk' | null;

export default function TeacherAssignmentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState<ModalType>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionForReview | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    topic: '',
    grade: 'Secondary 3',
    class: '',
    dueDate: '',
    difficulty: 'medium',
    allowDraftSubmissions: true,
    requiresApproval: true,
    numQuestions: 10,
  });
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  
  // School classes for dropdown
  const [schoolClasses, setSchoolClasses] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  
  // PDF file uploads with extracted text
  interface ParsedPdf {
    filename: string;
    extractedText: string;
    numPages?: number;
    uploadedAt: Date;
  }
  const [learningOutcomesPdf, setLearningOutcomesPdf] = useState<ParsedPdf | null>(null);
  const [resourcePdfs, setResourcePdfs] = useState<ParsedPdf[]>([]);
  const [uploadingLearningOutcomes, setUploadingLearningOutcomes] = useState(false);
  const [uploadingResources, setUploadingResources] = useState(false);
  
  // Manual text input options
  const [showLearningOutcomesTextInput, setShowLearningOutcomesTextInput] = useState(false);
  const [learningOutcomesText, setLearningOutcomesText] = useState('');
  const [showResourceTextInput, setShowResourceTextInput] = useState(false);
  const [resourceText, setResourceText] = useState('');

  // Redirect non-teachers
  useEffect(() => {
    if (status === 'authenticated' && !['teacher', 'admin', 'super_admin'].includes(session?.user?.profile || '')) {
      router.push('/feedback-help');
    }
  }, [session, status, router]);

  // Fetch assignments
  useEffect(() => {
    if (session && ['teacher', 'admin', 'super_admin'].includes(session.user.profile)) {
      fetchAssignments();
      fetchSchoolClasses();
    }
  }, [session]);

  const fetchSchoolClasses = async () => {
    try {
      setLoadingClasses(true);
      const res = await fetch('/api/teacher/school-classes');
      if (res.ok) {
        const data = await res.json();
        setSchoolClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Failed to fetch school classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/teacher/assignments?withStats=true');
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!formData.title || !formData.topic || !formData.class || !formData.subject) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!learningOutcomesPdf) {
      toast.error('Please upload a learning outcomes PDF');
      return;
    }

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          questions: generatedQuestions,
          totalMarks: generatedQuestions.reduce((sum, q) => sum + q.marks, 0) || 100,
          learningOutcomesPdf: learningOutcomesPdf, // Full parsed PDF object with extracted text
          resourcePdfs: resourcePdfs, // Array of parsed PDF objects with extracted text
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }

      toast.success('Assignment created! PDF content stored in database.');
      setModalOpen(null);
      resetForm();
      fetchAssignments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create assignment');
    }
  };

  const handleGenerateQuestions = async () => {
    if (!formData.topic) {
      toast.error('Please enter a topic');
      return;
    }

    if (!learningOutcomesPdf) {
      toast.error('Please upload a learning outcomes PDF');
      return;
    }

    setGeneratingQuestions(true);
    try {
      // Use extracted text from PDF for question generation
      const learningOutcomesText = learningOutcomesPdf.extractedText;
      
      // Combine with resource PDFs text if available
      const resourceTexts = resourcePdfs.map(pdf => pdf.extractedText).join('\n\n');
      
      const res = await fetch('/api/teacher/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: formData.subject,
          topic: formData.topic,
          learningOutcomes: [learningOutcomesText], // Send full extracted text
          additionalContext: resourceTexts || undefined, // Additional context from resources
          numQuestions: formData.numQuestions,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }

      const data = await res.json();
      setGeneratedQuestions(data.questions);
      toast.success(`Generated ${data.questions.length} questions from PDF content!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate questions');
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handlePublishAssignment = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      });

      if (!res.ok) throw new Error('Failed to publish');

      toast.success('Assignment published!');
      fetchAssignments();
    } catch (error) {
      toast.error('Failed to publish assignment');
    }
  };

  const handleApproveSubmission = async (submissionId: string, action: 'approve' | 'return') => {
    try {
      const res = await fetch('/api/teacher/approve-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          action,
        }),
      });

      if (!res.ok) throw new Error('Failed to process');

      toast.success(action === 'approve' ? 'Submission approved!' : 'Submission returned to student');
      fetchAssignments();
      setSelectedSubmission(null);
    } catch (error) {
      toast.error('Failed to process submission');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subject: '',
      topic: '',
      grade: 'Secondary 3',
      class: '',
      dueDate: '',
      difficulty: 'medium',
      allowDraftSubmissions: true,
      requiresApproval: true,
      numQuestions: 10,
    });
    setGeneratedQuestions([]);
    setLearningOutcomesPdf(null);
    setResourcePdfs([]);
    // Reset text inputs
    setShowLearningOutcomesTextInput(false);
    setLearningOutcomesText('');
    setShowResourceTextInput(false);
    setResourceText('');
  };

  // Handle saving manual text input
  const handleSaveLearningOutcomesText = () => {
    if (!learningOutcomesText.trim()) {
      toast.error('Please enter some text');
      return;
    }
    setLearningOutcomesPdf({
      filename: 'Manual Text Input',
      extractedText: learningOutcomesText.trim(),
      numPages: 1,
      uploadedAt: new Date(),
    });
    setShowLearningOutcomesTextInput(false);
    toast.success('Learning outcomes text saved!');
  };

  const handleSaveResourceText = () => {
    if (!resourceText.trim()) {
      toast.error('Please enter some text');
      return;
    }
    const newResource: ParsedPdf = {
      filename: `Manual Text Input ${resourcePdfs.length + 1}`,
      extractedText: resourceText.trim(),
      numPages: 1,
      uploadedAt: new Date(),
    };
    setResourcePdfs(prev => [...prev, newResource].slice(0, 3));
    setResourceText('');
    setShowResourceTextInput(false);
    toast.success('Resource text saved!');
  };

  // Upload and parse PDF files
  const uploadAndParsePdf = async (file: File, type: 'learningOutcomes' | 'resource'): Promise<ParsedPdf | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const res = await fetch('/api/teacher/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }

      const data = await res.json();
      return type === 'learningOutcomes' ? data.pdf : data.pdfs?.[0];
    } catch (error: any) {
      toast.error(error.message || 'Failed to process PDF');
      return null;
    }
  };

  const handleLearningOutcomesPdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Learning outcomes PDF must be under 2MB');
      e.target.value = '';
      return;
    }

    setUploadingLearningOutcomes(true);
    const parsed = await uploadAndParsePdf(file, 'learningOutcomes');
    if (parsed) {
      setLearningOutcomesPdf(parsed);
      toast.success(`Extracted ${parsed.numPages} page(s) from PDF`);
    }
    setUploadingLearningOutcomes(false);
    e.target.value = '';
  };

  const handleResourcePdfsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    for (const file of files) {
      if (resourcePdfs.length + validFiles.length >= 3) {
        toast.error('Maximum 3 resource files allowed');
        break;
      }
      if (file.type !== 'application/pdf') {
        toast.error(`${file.name} is not a PDF file`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setUploadingResources(true);
      const newPdfs: ParsedPdf[] = [];
      
      for (const file of validFiles) {
        const parsed = await uploadAndParsePdf(file, 'resource');
        if (parsed) {
          newPdfs.push(parsed);
        }
      }
      
      if (newPdfs.length > 0) {
        setResourcePdfs(prev => [...prev, ...newPdfs].slice(0, 3));
        toast.success(`Processed ${newPdfs.length} resource PDF(s)`);
      }
      setUploadingResources(false);
    }
    e.target.value = '';
  };

  const removeResourcePdf = (index: number) => {
    setResourcePdfs(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      case 'published':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'archived':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FiLoader className="animate-spin text-4xl text-indigo-500" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Assignment Dashboard | Computing 7155 Portal</title>
      </Head>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              📋 AI Assignment Dashboard
            </h1>
            <p className="text-slate-400">
              Create, manage, and track assignments with AI-powered features
            </p>
          </div>
          <div className="flex gap-3 mt-4 sm:mt-0">
            <button
              onClick={() => {
                resetForm();
                setModalOpen('create');
              }}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-500 hover:to-purple-500 flex items-center"
            >
              <FiPlus className="mr-2" />
              New Assignment
            </button>
            <button
              onClick={fetchAssignments}
              className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              <FiRefreshCw />
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Assignments</p>
                <p className="text-2xl font-bold text-white">{assignments.length}</p>
              </div>
              <FiFileText className="text-3xl text-indigo-400" />
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Published</p>
                <p className="text-2xl font-bold text-white">
                  {assignments.filter(a => a.status === 'published').length}
                </p>
              </div>
              <FiCheckCircle className="text-3xl text-green-400" />
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Pending Approval</p>
                <p className="text-2xl font-bold text-white">
                  {assignments.reduce((sum, a) => sum + (a.stats?.pendingApprovalCount || 0), 0)}
                </p>
              </div>
              <FiClock className="text-3xl text-amber-400" />
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Submissions</p>
                <p className="text-2xl font-bold text-white">
                  {assignments.reduce((sum, a) => sum + (a.stats?.finalCount || 0), 0)}
                </p>
              </div>
              <FiUsers className="text-3xl text-purple-400" />
            </div>
          </div>
        </div>

        {/* Assignments List */}
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-12 text-center">
              <FiFileText className="text-5xl text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">No Assignments Yet</h3>
              <p className="text-slate-400 mb-4">
                Create your first assignment with AI-generated questions
              </p>
              <button
                onClick={() => setModalOpen('create')}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-500 hover:to-purple-500"
              >
                Create Assignment
              </button>
            </div>
          ) : (
            assignments.map((assignment) => (
              <div
                key={assignment._id}
                className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden"
              >
                {/* Assignment Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-slate-700/30 transition-colors"
                  onClick={() => setExpandedAssignment(
                    expandedAssignment === assignment._id ? null : assignment._id
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{assignment.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded border ${getStatusBadge(assignment.status)}`}>
                          {assignment.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                        <span>{assignment.subject} - {assignment.topic}</span>
                        <span>Class: {assignment.class}</span>
                        <span>Marks: {assignment.totalMarks}</span>
                        {assignment.dueDate && (
                          <span className="text-amber-400">
                            Due: {new Date(assignment.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {assignment.stats && (
                        <div className="flex items-center gap-4 mr-4">
                          <div className="text-center">
                            <p className="text-lg font-bold text-white">
                              {assignment.stats.finalCount}/{assignment.stats.totalStudents}
                            </p>
                            <p className="text-xs text-slate-400">Submitted</p>
                          </div>
                          {assignment.stats.averageScore !== null && (
                            <div className="text-center">
                              <p className="text-lg font-bold text-green-400">
                                {assignment.stats.averageScore}%
                              </p>
                              <p className="text-xs text-slate-400">Avg Score</p>
                            </div>
                          )}
                        </div>
                      )}
                      {expandedAssignment === assignment._id ? (
                        <FiChevronUp className="text-slate-400" />
                      ) : (
                        <FiChevronDown className="text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedAssignment === assignment._id && (
                  <div className="border-t border-slate-700/50 p-4">
                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {assignment.status === 'draft' && (
                        <button
                          onClick={() => handlePublishAssignment(assignment._id)}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-500 flex items-center"
                        >
                          <FiSend className="mr-1" />
                          Publish
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setFormData({
                            ...formData,
                            subject: assignment.subject,
                            topic: assignment.topic,
                            class: assignment.class,
                          });
                          setModalOpen('generate');
                        }}
                        className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-500 flex items-center"
                      >
                        <FiZap className="mr-1" />
                        Generate Differentiated PDFs
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setModalOpen('bulk');
                        }}
                        className="px-3 py-1.5 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-500 flex items-center"
                      >
                        <FiUpload className="mr-1" />
                        Bulk Upload
                      </button>
                    </div>

                    {/* Submission Stats */}
                    {assignment.stats && (
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                        <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-white">{assignment.stats.draftCount}</p>
                          <p className="text-xs text-slate-400">Drafts</p>
                        </div>
                        <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-white">{assignment.stats.finalCount}</p>
                          <p className="text-xs text-slate-400">Final</p>
                        </div>
                        <div className="bg-amber-500/10 rounded-lg p-3 text-center border border-amber-500/30">
                          <p className="text-lg font-bold text-amber-400">{assignment.stats.pendingApprovalCount}</p>
                          <p className="text-xs text-amber-400">Pending</p>
                        </div>
                        <div className="bg-green-500/10 rounded-lg p-3 text-center border border-green-500/30">
                          <p className="text-lg font-bold text-green-400">{assignment.stats.approvedCount}</p>
                          <p className="text-xs text-green-400">Approved</p>
                        </div>
                        <div className="bg-blue-500/10 rounded-lg p-3 text-center border border-blue-500/30">
                          <p className="text-lg font-bold text-blue-400">{assignment.stats.returnedCount}</p>
                          <p className="text-xs text-blue-400">Returned</p>
                        </div>
                        <div className="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/30">
                          <p className="text-lg font-bold text-red-400">{assignment.stats.notSubmittedCount}</p>
                          <p className="text-xs text-red-400">Not Submitted</p>
                        </div>
                      </div>
                    )}

                    {/* Submissions Table */}
                    {assignment.submissions && assignment.submissions.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-white mb-2">Submissions</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-slate-400 border-b border-slate-700">
                                <th className="pb-2">Student</th>
                                <th className="pb-2">Status</th>
                                <th className="pb-2">Score</th>
                                <th className="pb-2">Grade</th>
                                <th className="pb-2">Submitted</th>
                                <th className="pb-2">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {assignment.submissions.map((sub) => (
                                <tr key={sub._id} className="border-b border-slate-700/50">
                                  <td className="py-2 text-white">
                                    {sub.student?.name || 'Unknown'}
                                    <span className="text-slate-500 text-xs ml-1">
                                      ({sub.student?.username})
                                    </span>
                                  </td>
                                  <td className="py-2">
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                      sub.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                      sub.status === 'completed' ? 'bg-amber-500/20 text-amber-400' :
                                      sub.status === 'returned' ? 'bg-blue-500/20 text-blue-400' :
                                      'bg-slate-500/20 text-slate-400'
                                    }`}>
                                      {sub.status}
                                    </span>
                                  </td>
                                  <td className="py-2 text-white">
                                    {sub.marksAwarded !== undefined 
                                      ? `${sub.marksAwarded}/${sub.marksTotal}` 
                                      : '-'}
                                  </td>
                                  <td className="py-2 text-white">{sub.grade || '-'}</td>
                                  <td className="py-2 text-slate-400">
                                    {new Date(sub.submittedAt).toLocaleDateString()}
                                  </td>
                                  <td className="py-2">
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => {
                                          setSelectedSubmission(sub);
                                          setSelectedAssignment(assignment);
                                          setModalOpen('review');
                                        }}
                                        className="p-1 text-slate-400 hover:text-white"
                                      >
                                        <FiEye size={16} />
                                      </button>
                                      {sub.status === 'completed' && (
                                        <>
                                          <button
                                            onClick={() => handleApproveSubmission(sub._id, 'approve')}
                                            className="p-1 text-green-400 hover:text-green-300"
                                            title="Approve"
                                          >
                                            <FiCheckCircle size={16} />
                                          </button>
                                          <button
                                            onClick={() => handleApproveSubmission(sub._id, 'return')}
                                            className="p-1 text-blue-400 hover:text-blue-300"
                                            title="Return to Student"
                                          >
                                            <FiSend size={16} />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Not Submitted List */}
                    {assignment.notSubmitted && assignment.notSubmitted.length > 0 && (
                      <div>
                        <h4 className="font-medium text-white mb-2 flex items-center">
                          <FiAlertCircle className="mr-2 text-red-400" />
                          Not Submitted ({assignment.notSubmitted.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {assignment.notSubmitted.map((student) => (
                            <span
                              key={student._id}
                              className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded border border-red-500/30"
                            >
                              {student.name} ({student.username})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Create Assignment Modal */}
        {modalOpen === 'create' && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Create New Assignment</h2>
                <button onClick={() => setModalOpen(null)} className="text-slate-400 hover:text-white">
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      placeholder="e.g., Python Lists Quiz"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Class *</label>
                    <select
                      value={formData.class}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      disabled={loadingClasses}
                    >
                      <option value="">Select a class</option>
                      {schoolClasses.map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                    {schoolClasses.length === 0 && !loadingClasses && (
                      <p className="text-xs text-amber-400 mt-1">No classes configured for your school</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Subject *</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      placeholder="e.g., Computing, Mathematics"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Topic *</label>
                    <input
                      type="text"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      placeholder="e.g., Python Lists and Iteration"
                    />
                  </div>
                </div>

                {/* Learning Outcomes - PDF Upload or Text Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-300">
                      Learning Outcomes * <span className="text-slate-500 font-normal">(PDF max 2MB)</span>
                    </label>
                    {!learningOutcomesPdf && !uploadingLearningOutcomes && (
                      <button
                        type="button"
                        onClick={() => setShowLearningOutcomesTextInput(true)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        <FiEdit3 size={12} />
                        Or enter text manually
                      </button>
                    )}
                  </div>
                  {uploadingLearningOutcomes ? (
                    <div className="flex items-center justify-center gap-2 bg-slate-700/50 border border-indigo-500 rounded-lg px-3 py-4">
                      <FiLoader className="animate-spin text-indigo-400" />
                      <span className="text-indigo-400 text-sm">Processing PDF & extracting text...</span>
                    </div>
                  ) : learningOutcomesPdf ? (
                    <div className="bg-slate-700/50 border border-green-500/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <FiFileText className="text-green-400" />
                        <span className="text-white text-sm flex-1 truncate">{learningOutcomesPdf.filename}</span>
                        <span className="text-slate-400 text-xs">
                          {learningOutcomesPdf.numPages} page(s)
                        </span>
                        <button
                          onClick={() => setLearningOutcomesPdf(null)}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-slate-400 bg-slate-800/50 rounded p-2 max-h-20 overflow-y-auto">
                        <span className="text-green-400">✓ Text:</span>{' '}
                        {learningOutcomesPdf.extractedText.substring(0, 200)}
                        {learningOutcomesPdf.extractedText.length > 200 && '...'}
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-600 rounded-lg px-3 py-4 cursor-pointer hover:border-indigo-500 transition-colors">
                      <FiUpload className="text-slate-400" />
                      <span className="text-slate-400 text-sm">Click to upload learning outcomes PDF</span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleLearningOutcomesPdfChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Text Input Dialog for Learning Outcomes */}
                {showLearningOutcomesTextInput && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-2xl w-full">
                      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Enter Learning Outcomes</h3>
                        <button 
                          onClick={() => {
                            setShowLearningOutcomesTextInput(false);
                            setLearningOutcomesText('');
                          }}
                          className="text-slate-400 hover:text-white"
                        >
                          <FiX size={20} />
                        </button>
                      </div>
                      <div className="p-4">
                        <textarea
                          value={learningOutcomesText}
                          onChange={(e) => setLearningOutcomesText(e.target.value)}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm min-h-[200px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Enter the learning outcomes or syllabus content here...&#10;&#10;Example:&#10;- Students should be able to understand Python lists&#10;- Students should be able to use iteration (for loops, while loops)&#10;- Students should understand list methods (append, remove, etc.)"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                          This text will be used to generate questions and assess student submissions.
                        </p>
                      </div>
                      <div className="p-4 border-t border-slate-700 flex justify-end gap-3">
                        <button
                          onClick={() => {
                            setShowLearningOutcomesTextInput(false);
                            setLearningOutcomesText('');
                          }}
                          className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveLearningOutcomesText}
                          disabled={!learningOutcomesText.trim()}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
                        >
                          Save Text
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resource PDFs Upload or Text Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-300">
                      Resources <span className="text-slate-500 font-normal">(max 3 items, PDF 5MB each)</span>
                    </label>
                    {resourcePdfs.length < 3 && !uploadingResources && (
                      <button
                        type="button"
                        onClick={() => setShowResourceTextInput(true)}
                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        <FiEdit3 size={12} />
                        Or enter text manually
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {resourcePdfs.map((pdf, idx) => (
                      <div key={idx} className="bg-slate-700/50 border border-purple-500/50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <FiFileText className="text-purple-400" />
                          <span className="text-white text-sm flex-1 truncate">{pdf.filename}</span>
                          <span className="text-slate-400 text-xs">
                            {pdf.numPages} page(s)
                          </span>
                          <button
                            onClick={() => removeResourcePdf(idx)}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            <FiX size={16} />
                          </button>
                        </div>
                        <div className="mt-1 text-xs text-slate-500 truncate">
                          ✓ {pdf.extractedText.substring(0, 100)}...
                        </div>
                      </div>
                    ))}
                    {uploadingResources ? (
                      <div className="flex items-center justify-center gap-2 bg-slate-700/50 border border-purple-500 rounded-lg px-3 py-3">
                        <FiLoader className="animate-spin text-purple-400" />
                        <span className="text-purple-400 text-sm">Processing PDF(s)...</span>
                      </div>
                    ) : resourcePdfs.length < 3 && (
                      <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-600 rounded-lg px-3 py-3 cursor-pointer hover:border-purple-500 transition-colors">
                        <FiUpload className="text-slate-400" />
                        <span className="text-slate-400 text-sm">
                          Click to upload resource PDF ({resourcePdfs.length}/3)
                        </span>
                        <input
                          type="file"
                          accept=".pdf"
                          multiple
                          onChange={handleResourcePdfsChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Text Input Dialog for Resources */}
                {showResourceTextInput && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-2xl w-full">
                      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Enter Resource Content</h3>
                        <button 
                          onClick={() => {
                            setShowResourceTextInput(false);
                            setResourceText('');
                          }}
                          className="text-slate-400 hover:text-white"
                        >
                          <FiX size={20} />
                        </button>
                      </div>
                      <div className="p-4">
                        <textarea
                          value={resourceText}
                          onChange={(e) => setResourceText(e.target.value)}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm min-h-[200px] focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Enter additional resource content, notes, or reference material here...&#10;&#10;This could include:&#10;- Code examples&#10;- Additional explanations&#10;- Reference notes&#10;- Model answers"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                          Resource {resourcePdfs.length + 1} of 3 - This text will be used as additional context for question generation.
                        </p>
                      </div>
                      <div className="p-4 border-t border-slate-700 flex justify-end gap-3">
                        <button
                          onClick={() => {
                            setShowResourceTextInput(false);
                            setResourceText('');
                          }}
                          className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveResourceText}
                          disabled={!resourceText.trim()}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50"
                        >
                          Save Text
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Difficulty</label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Questions</label>
                    <input
                      type="number"
                      value={formData.numQuestions}
                      onChange={(e) => setFormData({ ...formData, numQuestions: parseInt(e.target.value) || 10 })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      min="1"
                      max="20"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.allowDraftSubmissions}
                      onChange={(e) => setFormData({ ...formData, allowDraftSubmissions: e.target.checked })}
                      className="mr-2"
                    />
                    Allow Draft Submissions
                  </label>
                  <label className="flex items-center text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.requiresApproval}
                      onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                      className="mr-2"
                    />
                    Require Teacher Approval
                  </label>
                </div>

                {/* Generate Questions Button */}
                <div className="border-t border-slate-700 pt-4">
                  <button
                    onClick={handleGenerateQuestions}
                    disabled={generatingQuestions || !formData.topic || !learningOutcomesPdf}
                    className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 flex items-center justify-center"
                  >
                    {generatingQuestions ? (
                      <>
                        <FiLoader className="animate-spin mr-2" />
                        Generating Questions...
                      </>
                    ) : (
                      <>
                        <FiZap className="mr-2" />
                        Generate AI Questions
                      </>
                    )}
                  </button>
                  {!learningOutcomesPdf && (
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      Upload learning outcomes PDF to enable AI question generation
                    </p>
                  )}
                </div>

                {/* Generated Questions Preview */}
                {generatedQuestions.length > 0 && (
                  <div className="border border-slate-600 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-2">
                      Generated Questions ({generatedQuestions.length})
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {generatedQuestions.map((q, idx) => (
                        <div key={q.id} className="text-sm text-slate-300 bg-slate-700/30 p-2 rounded">
                          <span className="text-indigo-400">Q{idx + 1}:</span> {q.question.substring(0, 100)}...
                          <span className="text-slate-500 ml-2">({q.marks} marks)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => setModalOpen(null)}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAssignment}
                  disabled={!formData.title || !formData.topic || !formData.class}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
                >
                  Create Assignment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Generate Differentiated PDFs Modal */}
        {modalOpen === 'generate' && selectedAssignment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-lg w-full">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Generate Differentiated PDFs</h2>
                <button onClick={() => setModalOpen(null)} className="text-slate-400 hover:text-white">
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="p-6">
                <p className="text-slate-300 mb-4">
                  Generate personalized question sets for each student based on their ability level and learning profile.
                </p>
                
                <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-white mb-2">{selectedAssignment.title}</h4>
                  <p className="text-sm text-slate-400">
                    Class: {selectedAssignment.class} | 
                    Students: {selectedAssignment.stats?.totalStudents || 0}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                    <FiTarget className="text-green-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-green-400">Above Grade</p>
                      <p className="text-xs text-slate-400">Challenging, higher-order thinking questions</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                    <FiTarget className="text-blue-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-blue-400">At Grade</p>
                      <p className="text-xs text-slate-400">Standard complexity, grade-appropriate</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                    <FiTarget className="text-amber-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-amber-400">Below Grade</p>
                      <p className="text-xs text-slate-400">Scaffolded, foundational questions</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-4">
                  Each PDF will include the student's username at the top for easy identification.
                </p>
              </div>

              <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => setModalOpen(null)}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    toast.success('PDF generation feature coming soon!');
                    setModalOpen(null);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500"
                >
                  <FiDownload className="inline mr-2" />
                  Generate PDFs
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Upload Modal */}
        {modalOpen === 'bulk' && selectedAssignment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-lg w-full">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Bulk Upload Submissions</h2>
                <button onClick={() => setModalOpen(null)} className="text-slate-400 hover:text-white">
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="p-6">
                <p className="text-slate-300 mb-4">
                  Upload scanned PDFs of student submissions for {selectedAssignment.title}
                </p>
                
                <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center">
                  <FiUpload className="text-4xl text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-300">Drop PDFs here or click to browse</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Multiple files supported
                  </p>
                </div>

                <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
                  <h4 className="font-medium text-white text-sm mb-2">Or connect to Google Drive</h4>
                  <button className="w-full py-2 px-4 bg-white text-gray-800 rounded-lg hover:bg-gray-100 flex items-center justify-center text-sm font-medium">
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 mr-2" />
                    Connect Google Drive
                  </button>
                </div>
              </div>

              <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => setModalOpen(null)}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    toast.success('Bulk upload feature coming soon!');
                    setModalOpen(null);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-500 hover:to-purple-500"
                >
                  Upload & Process
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
