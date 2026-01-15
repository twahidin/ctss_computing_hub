import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  FiUpload,
  FiFileText,
  FiCheckCircle,
  FiLoader,
  FiBook,
  FiCalendar,
  FiAward,
  FiDownload,
  FiChevronDown,
  FiChevronUp,
  FiAlertTriangle,
  FiClock,
  FiThumbsUp,
  FiTarget,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Assignment {
  _id: string;
  title: string;
  subject: string;
  topic: string;
  grade: string;
  class: string;
  totalMarks: number;
  teacher: { _id: string; name: string; username: string };
  dueDate?: string;
  requiresApproval: boolean;
}

interface QuestionFeedback {
  questionNumber: number;
  studentAnswer?: string;
  feedback: string;
  strengths: string[];
  improvements: string[];
  marksAwarded: number;
  marksPossible: number;
  isCorrect: boolean;
  canBeImproved: boolean;
  suggestedAnswer?: string;
}

interface FeedbackResult {
  overallFeedback: string;
  overallStrengths: string[];
  overallImprovements: string[];
  questionFeedback: QuestionFeedback[];
  totalMarksAwarded: number;
  totalMarksPossible: number;
  percentage: number;
  grade: string;
}

interface SubmissionResult {
  _id: string;
  status: string;
  marksAwarded?: number;
  marksTotal?: number;
  percentage?: number;
  grade?: string;
}

export default function SubmissionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [dragActive, setDragActive] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  // Redirect non-students
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.profile !== 'student') {
      router.push('/teacher/assignments');
    }
  }, [session, status, router]);

  // Fetch assignments
  useEffect(() => {
    if (session) {
      fetchAssignments();
    }
  }, [session]);

  const fetchAssignments = async () => {
    try {
      const res = await fetch('/api/assignments');
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setFeedback(null);
        setSubmission(null);
      } else {
        toast.error('Please upload a PDF file');
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setFeedback(null);
        setSubmission(null);
      } else {
        toast.error('Please upload a PDF file');
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssignment || !file) {
      toast.error('Please select an assignment and upload a PDF');
      return;
    }

    if (!confirmSubmit) {
      setConfirmSubmit(true);
      return;
    }

    setUploading(true);
    setFeedback(null);
    setSubmission(null);
    setConfirmSubmit(false);

    try {
      // Upload the file
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('assignmentId', selectedAssignment._id);
      formData.append('submissionType', 'final');

      const uploadRes = await fetch('/api/submissions', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        throw new Error(error.message || 'Failed to upload');
      }

      const submissionData = await uploadRes.json();
      setUploading(false);
      setProcessing(true);

      // Generate marking
      const feedbackRes = await fetch('/api/feedback/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submissionData._id }),
      });

      if (!feedbackRes.ok) {
        const error = await feedbackRes.json();
        throw new Error(error.message || 'Failed to generate marking');
      }

      const result = await feedbackRes.json();
      setFeedback(result.feedback);
      setSubmission(result.submission);
      toast.success('Assignment submitted and marked!');
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const toggleQuestion = (num: number) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(num)) {
        newSet.delete(num);
      } else {
        newSet.add(num);
      }
      return newSet;
    });
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-400 bg-green-500/20 border-green-500/30';
    if (grade.startsWith('B')) return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    if (grade.startsWith('C')) return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    if (grade.startsWith('D')) return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
    return 'text-red-400 bg-red-500/20 border-red-500/30';
  };

  const isDueSoon = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FiLoader className="animate-spin text-4xl text-indigo-500" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Submit Assignment | Computing 7155 Portal</title>
      </Head>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            📤 Submit Assignment
          </h1>
          <p className="text-slate-400">
            Submit your final work for grading and receive detailed feedback
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <FiUpload className="mr-2 text-indigo-400" />
                Submit Your Work
              </h2>

              {/* Assignment Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Select Assignment
                </label>
                <select
                  value={selectedAssignment?._id || ''}
                  onChange={(e) => {
                    const assignment = assignments.find(a => a._id === e.target.value);
                    setSelectedAssignment(assignment || null);
                    setFeedback(null);
                    setSubmission(null);
                    setConfirmSubmit(false);
                  }}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose an assignment...</option>
                  {assignments.map((assignment) => (
                    <option key={assignment._id} value={assignment._id}>
                      {assignment.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Assignment Info */}
              {selectedAssignment && (
                <div className="mb-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                  <h3 className="font-medium text-white mb-2">{selectedAssignment.title}</h3>
                  <div className="space-y-2 text-sm text-slate-400">
                    <div className="flex items-center">
                      <FiBook className="mr-2" />
                      {selectedAssignment.subject} - {selectedAssignment.topic}
                    </div>
                    <div className="flex items-center">
                      <FiAward className="mr-2" />
                      Total Marks: {selectedAssignment.totalMarks}
                    </div>
                    {selectedAssignment.dueDate && (
                      <div className={`flex items-center ${
                        isOverdue(selectedAssignment.dueDate)
                          ? 'text-red-400'
                          : isDueSoon(selectedAssignment.dueDate)
                            ? 'text-amber-400'
                            : 'text-slate-400'
                      }`}>
                        <FiCalendar className="mr-2" />
                        Due: {new Date(selectedAssignment.dueDate).toLocaleDateString()}
                        {isOverdue(selectedAssignment.dueDate) && ' (Overdue)'}
                        {isDueSoon(selectedAssignment.dueDate) && !isOverdue(selectedAssignment.dueDate) && ' (Due Soon)'}
                      </div>
                    )}
                  </div>
                  {selectedAssignment.requiresApproval && (
                    <p className="mt-2 text-xs text-slate-500 flex items-center">
                      <FiClock className="mr-1" />
                      Teacher approval required before results are final
                    </p>
                  )}
                </div>
              )}

              {/* File Upload */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <FiFileText className="mx-auto text-3xl text-slate-500 mb-3" />
                {file ? (
                  <div>
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-sm text-slate-400 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-300 text-sm">
                      Drop PDF here or click to browse
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              {confirmSubmit ? (
                <div className="mt-4 space-y-2">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-amber-400 text-sm flex items-center">
                      <FiAlertTriangle className="mr-2" />
                      This is a FINAL submission and will be graded.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmSubmit(false)}
                      className="flex-1 py-2 px-4 bg-slate-600 text-white rounded-lg hover:bg-slate-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="flex-1 py-2 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-500 hover:to-emerald-500"
                    >
                      Confirm Submit
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!selectedAssignment || !file || uploading || processing}
                  className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                >
                  {uploading || processing ? (
                    <>
                      <FiLoader className="animate-spin mr-2" />
                      {uploading ? 'Uploading...' : 'Marking...'}
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="mr-2" />
                      Submit for Grading
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <FiAward className="mr-2 text-amber-400" />
                Results & Feedback
              </h2>

              {processing ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <FiLoader className="animate-spin text-5xl text-indigo-500 mb-4" />
                  <p className="text-slate-400 text-lg">Marking your submission...</p>
                  <p className="text-sm text-slate-500 mt-2">This may take a minute</p>
                </div>
              ) : feedback && submission ? (
                <div className="space-y-6">
                  {/* Score Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-700/30 rounded-lg text-center">
                      <p className="text-slate-400 text-sm">Score</p>
                      <p className="text-2xl font-bold text-white">
                        {feedback.totalMarksAwarded}/{feedback.totalMarksPossible}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-700/30 rounded-lg text-center">
                      <p className="text-slate-400 text-sm">Percentage</p>
                      <p className="text-2xl font-bold text-white">
                        {feedback.percentage}%
                      </p>
                    </div>
                    <div className="p-4 bg-slate-700/30 rounded-lg text-center">
                      <p className="text-slate-400 text-sm">Grade</p>
                      <p className={`text-2xl font-bold px-3 py-1 rounded border inline-block ${getGradeColor(feedback.grade)}`}>
                        {feedback.grade}
                      </p>
                    </div>
                  </div>

                  {/* Status Banner */}
                  {selectedAssignment?.requiresApproval && submission.status !== 'approved' && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center">
                      <FiClock className="text-amber-400 mr-2" />
                      <span className="text-amber-400 text-sm">
                        Awaiting teacher approval. Your marks may be adjusted.
                      </span>
                    </div>
                  )}

                  {/* Overall Feedback */}
                  <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                    <h3 className="font-medium text-white mb-2">Overall Feedback</h3>
                    <p className="text-slate-300 text-sm">{feedback.overallFeedback}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Strengths */}
                    {feedback.overallStrengths.length > 0 && (
                      <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                        <h3 className="font-medium text-green-400 mb-2 flex items-center">
                          <FiThumbsUp className="mr-2" />
                          Strengths
                        </h3>
                        <ul className="space-y-1">
                          {feedback.overallStrengths.map((strength, idx) => (
                            <li key={idx} className="text-sm text-slate-300 flex items-start">
                              <span className="text-green-400 mr-2">✓</span>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Improvements */}
                    {feedback.overallImprovements.length > 0 && (
                      <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                        <h3 className="font-medium text-amber-400 mb-2 flex items-center">
                          <FiTarget className="mr-2" />
                          Areas to Improve
                        </h3>
                        <ul className="space-y-1">
                          {feedback.overallImprovements.map((improvement, idx) => (
                            <li key={idx} className="text-sm text-slate-300 flex items-start">
                              <span className="text-amber-400 mr-2">→</span>
                              {improvement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Question-by-Question Feedback */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-white">Question Breakdown</h3>
                    {feedback.questionFeedback.map((qf) => (
                      <div
                        key={qf.questionNumber}
                        className="border border-slate-600/50 rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => toggleQuestion(qf.questionNumber)}
                          className="w-full p-3 bg-slate-700/30 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex items-center">
                            <span className="text-white font-medium">
                              Question {qf.questionNumber}
                            </span>
                            <span className={`ml-3 text-sm px-2 py-0.5 rounded ${
                              qf.isCorrect
                                ? 'bg-green-500/20 text-green-400'
                                : qf.marksAwarded > 0
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-red-500/20 text-red-400'
                            }`}>
                              {qf.marksAwarded}/{qf.marksPossible}
                            </span>
                          </div>
                          {expandedQuestions.has(qf.questionNumber) ? (
                            <FiChevronUp className="text-slate-400" />
                          ) : (
                            <FiChevronDown className="text-slate-400" />
                          )}
                        </button>
                        {expandedQuestions.has(qf.questionNumber) && (
                          <div className="p-4 bg-slate-800/30 space-y-3">
                            {qf.studentAnswer && (
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-1">Your Answer:</p>
                                <p className="text-sm text-slate-400 bg-slate-700/30 p-2 rounded">
                                  {qf.studentAnswer}
                                </p>
                              </div>
                            )}
                            
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">Feedback:</p>
                              <p className="text-sm text-slate-300">{qf.feedback}</p>
                            </div>
                            
                            {qf.strengths.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-green-400 mb-1">Correct Points:</p>
                                <ul className="text-xs text-slate-400 space-y-0.5">
                                  {qf.strengths.map((s, i) => (
                                    <li key={i}>• {s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {qf.improvements.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-amber-400 mb-1">What Was Missing:</p>
                                <ul className="text-xs text-slate-400 space-y-0.5">
                                  {qf.improvements.map((i, idx) => (
                                    <li key={idx}>• {i}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {qf.suggestedAnswer && (
                              <div className="p-2 bg-indigo-500/10 rounded border border-indigo-500/30">
                                <p className="text-xs font-medium text-indigo-400 mb-1">Model Answer:</p>
                                <p className="text-xs text-slate-300">{qf.suggestedAnswer}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Download Button (placeholder for future PDF generation) */}
                  <button
                    className="w-full py-3 px-4 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-600 transition-all flex items-center justify-center opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <FiDownload className="mr-2" />
                    Download Marked PDF (Coming Soon)
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FiFileText className="text-5xl text-slate-600 mb-4" />
                  <p className="text-slate-400 text-lg">
                    Submit your assignment to see results
                  </p>
                  <p className="text-sm text-slate-500 mt-2 max-w-md">
                    Your work will be automatically marked and you'll receive detailed feedback for each question
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
