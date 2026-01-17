import { useState, useEffect, useRef } from 'react';
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
  FiBell,
  FiX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

interface ParsedPdf {
  filename: string;
  extractedText: string;
  numPages?: number;
  uploadedAt: Date;
}

interface Assignment {
  _id: string;
  title: string;
  subject: string;
  topic: string;
  grade: string;
  class: string;
  totalMarks: number;
  questionPdf?: ParsedPdf;
  answerPdf?: ParsedPdf;
  dueDate?: string;
  status: 'draft' | 'published' | 'archived';
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

type ModalType = 'create' | 'review' | 'bulk' | null;

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
    totalMarks: 100,
    allowDraftSubmissions: true,
    requiresApproval: true,
  });
  
  // School classes for dropdown
  const [schoolClasses, setSchoolClasses] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  
  // PDF file uploads
  const [questionPdf, setQuestionPdf] = useState<ParsedPdf | null>(null);
  const [answerPdf, setAnswerPdf] = useState<ParsedPdf | null>(null);
  const [uploadingQuestionPdf, setUploadingQuestionPdf] = useState(false);
  const [uploadingAnswerPdf, setUploadingAnswerPdf] = useState(false);
  
  // File input refs
  const questionPdfInputRef = useRef<HTMLInputElement>(null);
  const answerPdfInputRef = useRef<HTMLInputElement>(null);
  
  // Bulk upload states
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkUploadFiles, setBulkUploadFiles] = useState<File[]>([]);
  const [bulkUploadProgress, setBulkUploadProgress] = useState<{
    total: number;
    processed: number;
    results: { filename: string; student?: string; success: boolean; error?: string }[];
  } | null>(null);

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

    if (!questionPdf) {
      toast.error('Please upload the question PDF');
      return;
    }

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          questionPdf: questionPdf,
          answerPdf: answerPdf,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }

      toast.success('Assignment created successfully!');
      setModalOpen(null);
      resetForm();
      fetchAssignments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create assignment');
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

  const handleDeleteAssignment = async (assignmentId: string, title: string) => {
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete "${title}"?\n\nIf there are submissions, it will be archived instead.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }

      const data = await res.json();
      
      if (data.archived) {
        toast.success('Assignment archived (has existing submissions)');
      } else {
        toast.success('Assignment deleted successfully');
      }
      
      setExpandedAssignment(null);
      fetchAssignments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete assignment');
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
      totalMarks: 100,
      allowDraftSubmissions: true,
      requiresApproval: true,
    });
    setQuestionPdf(null);
    setAnswerPdf(null);
    setBulkUploadFiles([]);
    setBulkUploadProgress(null);
  };

  // Upload and parse PDF files
  const uploadAndParsePdf = async (file: File, type: 'question' | 'answer'): Promise<ParsedPdf | null> => {
    const formDataObj = new FormData();
    formDataObj.append('file', file);
    formDataObj.append('type', type);

    try {
      const res = await fetch('/api/teacher/upload-pdf', {
        method: 'POST',
        body: formDataObj,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }

      const data = await res.json();
      return data.pdf;
    } catch (error: any) {
      toast.error(error.message || 'Failed to process PDF');
      return null;
    }
  };

  const handleQuestionPdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Question PDF must be under 10MB');
      e.target.value = '';
      return;
    }

    setUploadingQuestionPdf(true);
    const parsed = await uploadAndParsePdf(file, 'question');
    if (parsed) {
      setQuestionPdf(parsed);
      toast.success(`Question PDF uploaded (${parsed.numPages} page(s))`);
    }
    setUploadingQuestionPdf(false);
    e.target.value = '';
  };

  const handleAnswerPdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Answer PDF must be under 10MB');
      e.target.value = '';
      return;
    }

    setUploadingAnswerPdf(true);
    const parsed = await uploadAndParsePdf(file, 'answer');
    if (parsed) {
      setAnswerPdf(parsed);
      toast.success(`Answer PDF uploaded (${parsed.numPages} page(s))`);
    }
    setUploadingAnswerPdf(false);
    e.target.value = '';
  };

  // Handle bulk upload of student submissions
  const handleBulkUploadFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.type === 'application/pdf');
    if (validFiles.length !== files.length) {
      toast.error('Only PDF files are allowed');
    }
    setBulkUploadFiles(validFiles);
    e.target.value = '';
  };

  const processBulkUpload = async () => {
    if (!selectedAssignment || bulkUploadFiles.length === 0) return;

    setBulkUploading(true);
    setBulkUploadProgress({
      total: bulkUploadFiles.length,
      processed: 0,
      results: [],
    });

    const results: { filename: string; student?: string; success: boolean; error?: string }[] = [];

    for (const file of bulkUploadFiles) {
      try {
        // Extract student username from filename (expected format: username_submission.pdf)
        const filenameWithoutExt = file.name.replace('.pdf', '');
        const username = filenameWithoutExt.split('_')[0];

        const formDataObj = new FormData();
        formDataObj.append('pdf', file);
        formDataObj.append('assignmentId', selectedAssignment._id);
        formDataObj.append('studentUsername', username);

        const res = await fetch('/api/teacher/bulk-upload-submission', {
          method: 'POST',
          body: formDataObj,
        });

        const data = await res.json();
        
        if (res.ok) {
          results.push({ filename: file.name, student: data.studentName, success: true });
        } else {
          results.push({ filename: file.name, success: false, error: data.message });
        }
      } catch (error: any) {
        results.push({ filename: file.name, success: false, error: error.message });
      }

      setBulkUploadProgress(prev => prev ? {
        ...prev,
        processed: prev.processed + 1,
        results: [...prev.results, results[results.length - 1]],
      } : null);
    }

    setBulkUploading(false);
    
    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} submission(s). Students will be notified.`);
      fetchAssignments();
    }
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
              📋 Assignment Dashboard
            </h1>
            <p className="text-slate-400">
              Create, manage, and track class assignments
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
                Create your first assignment by uploading question and answer PDFs
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
                      {assignment.questionPdf && (
                        <button
                          onClick={() => window.open(`/api/assignments/${assignment._id}/question-pdf`, '_blank')}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 flex items-center"
                        >
                          <FiDownload className="mr-1" />
                          Download Questions
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setBulkUploadFiles([]);
                          setBulkUploadProgress(null);
                          setModalOpen('bulk');
                        }}
                        className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-500 flex items-center"
                      >
                        <FiUpload className="mr-1" />
                        Bulk Upload Submissions
                      </button>
                      <button
                        onClick={async () => {
                          // Notify students about this assignment
                          try {
                            const res = await fetch('/api/notifications', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                classGroup: assignment.class,
                                type: 'assignment_new',
                                title: 'New Assignment Available',
                                message: `A new assignment "${assignment.title}" has been posted for ${assignment.subject} - ${assignment.topic}`,
                                assignmentId: assignment._id,
                                actionUrl: '/student/dashboard',
                              }),
                            });
                            if (res.ok) {
                              const data = await res.json();
                              toast.success(`Notified ${data.count} student(s)`);
                            }
                          } catch (error) {
                            toast.error('Failed to send notifications');
                          }
                        }}
                        className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-500 flex items-center"
                      >
                        <FiBell className="mr-1" />
                        Notify Class
                      </button>
                      <button
                        onClick={() => handleDeleteAssignment(assignment._id, assignment.title)}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-500 flex items-center"
                      >
                        <FiTrash2 className="mr-1" />
                        Delete
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
                {/* Title and Class */}
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

                {/* Subject and Topic */}
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

                {/* Question PDF Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Question Paper * <span className="text-slate-500 font-normal">(PDF, max 10MB)</span>
                  </label>
                  {uploadingQuestionPdf ? (
                    <div className="flex items-center justify-center gap-2 bg-slate-700/50 border border-indigo-500 rounded-lg px-3 py-4">
                      <FiLoader className="animate-spin text-indigo-400" />
                      <span className="text-indigo-400 text-sm">Uploading question PDF...</span>
                    </div>
                  ) : questionPdf ? (
                    <div className="bg-slate-700/50 border border-green-500/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <FiFileText className="text-green-400" />
                        <span className="text-white text-sm flex-1 truncate">{questionPdf.filename}</span>
                        <span className="text-slate-400 text-xs">{questionPdf.numPages} page(s)</span>
                        <button
                          onClick={() => setQuestionPdf(null)}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-600 rounded-lg px-3 py-4 cursor-pointer hover:border-indigo-500 transition-colors">
                      <FiUpload className="text-slate-400" />
                      <span className="text-slate-400 text-sm">Click to upload question paper PDF</span>
                      <input
                        ref={questionPdfInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleQuestionPdfChange}
                        className="hidden"
                      />
                    </label>
                  )}
                  <p className="text-xs text-slate-500 mt-1">This PDF will be distributed to students</p>
                </div>

                {/* Answer PDF Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Answer Key <span className="text-slate-500 font-normal">(PDF, max 10MB, optional)</span>
                  </label>
                  {uploadingAnswerPdf ? (
                    <div className="flex items-center justify-center gap-2 bg-slate-700/50 border border-purple-500 rounded-lg px-3 py-4">
                      <FiLoader className="animate-spin text-purple-400" />
                      <span className="text-purple-400 text-sm">Uploading answer PDF...</span>
                    </div>
                  ) : answerPdf ? (
                    <div className="bg-slate-700/50 border border-purple-500/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <FiFileText className="text-purple-400" />
                        <span className="text-white text-sm flex-1 truncate">{answerPdf.filename}</span>
                        <span className="text-slate-400 text-xs">{answerPdf.numPages} page(s)</span>
                        <button
                          onClick={() => setAnswerPdf(null)}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-600 rounded-lg px-3 py-4 cursor-pointer hover:border-purple-500 transition-colors">
                      <FiUpload className="text-slate-400" />
                      <span className="text-slate-400 text-sm">Click to upload answer key PDF</span>
                      <input
                        ref={answerPdfInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleAnswerPdfChange}
                        className="hidden"
                      />
                    </label>
                  )}
                  <p className="text-xs text-slate-500 mt-1">For your reference when marking (not shown to students)</p>
                </div>

                {/* Due Date and Total Marks */}
                <div className="grid grid-cols-2 gap-4">
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
                    <label className="block text-sm font-medium text-slate-300 mb-1">Total Marks</label>
                    <input
                      type="number"
                      value={formData.totalMarks}
                      onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) || 100 })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      min="1"
                    />
                  </div>
                </div>

                {/* Options */}
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
                  disabled={!formData.title || !formData.topic || !formData.class || !formData.subject || !questionPdf}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
                >
                  Create Assignment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Upload Modal */}
        {modalOpen === 'bulk' && selectedAssignment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Bulk Upload Submissions</h2>
                <button onClick={() => setModalOpen(null)} className="text-slate-400 hover:text-white">
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="p-6">
                <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-white mb-1">{selectedAssignment.title}</h4>
                  <p className="text-sm text-slate-400">
                    Class: {selectedAssignment.class} | 
                    Students: {selectedAssignment.stats?.totalStudents || 0}
                  </p>
                </div>

                <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                  <p className="text-sm text-indigo-300 mb-2">
                    <strong>File naming convention:</strong>
                  </p>
                  <code className="text-xs bg-slate-800 px-2 py-1 rounded text-indigo-400">
                    username_submission.pdf
                  </code>
                  <p className="text-xs text-slate-400 mt-2">
                    Example: john_doe_submission.pdf, alice123_submission.pdf
                  </p>
                </div>
                
                {!bulkUploadProgress ? (
                  <>
                    <label className="block border-2 border-dashed border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 transition-colors">
                      <FiUpload className="text-4xl text-slate-500 mx-auto mb-3" />
                      <p className="text-slate-300">Drop PDFs here or click to browse</p>
                      <p className="text-xs text-slate-500 mt-2">
                        Multiple files supported • Students will be notified
                      </p>
                      <input
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={handleBulkUploadFiles}
                        className="hidden"
                      />
                    </label>

                    {bulkUploadFiles.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-white mb-2">
                          Selected Files ({bulkUploadFiles.length})
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {bulkUploadFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm bg-slate-700/30 rounded p-2">
                              <FiFileText className="text-purple-400" />
                              <span className="text-slate-300 flex-1 truncate">{file.name}</span>
                              <span className="text-slate-500 text-xs">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm text-slate-400 mb-1">
                        <span>Processing submissions...</span>
                        <span>{bulkUploadProgress.processed}/{bulkUploadProgress.total}</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                          style={{ width: `${(bulkUploadProgress.processed / bulkUploadProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Results */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {bulkUploadProgress.results.map((result, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-center gap-2 text-sm p-2 rounded ${
                            result.success 
                              ? 'bg-green-500/10 border border-green-500/30' 
                              : 'bg-red-500/10 border border-red-500/30'
                          }`}
                        >
                          {result.success ? (
                            <FiCheckCircle className="text-green-400" />
                          ) : (
                            <FiAlertCircle className="text-red-400" />
                          )}
                          <span className={result.success ? 'text-green-300' : 'text-red-300'}>
                            {result.filename}
                          </span>
                          {result.student && (
                            <span className="text-slate-500 text-xs">→ {result.student}</span>
                          )}
                          {result.error && (
                            <span className="text-red-400 text-xs ml-auto">{result.error}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setModalOpen(null);
                    setBulkUploadFiles([]);
                    setBulkUploadProgress(null);
                  }}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500"
                >
                  {bulkUploadProgress ? 'Close' : 'Cancel'}
                </button>
                {!bulkUploadProgress && bulkUploadFiles.length > 0 && (
                  <button
                    onClick={processBulkUpload}
                    disabled={bulkUploading}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 flex items-center"
                  >
                    {bulkUploading ? (
                      <>
                        <FiLoader className="animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FiUpload className="mr-2" />
                        Upload & Notify Students
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
