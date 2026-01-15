import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  FiUpload,
  FiFileText,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiUser,
  FiBook,
  FiChevronDown,
  FiChevronUp,
  FiThumbsUp,
  FiTarget,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Assignment {
  _id: string;
  title: string;
  subject: string;
  topic: string;
  teacher: { _id: string; name: string; username: string };
  dueDate?: string;
  allowDraftSubmissions: boolean;
}

interface Teacher {
  _id: string;
  name: string;
  username: string;
}

interface QuestionFeedback {
  questionNumber: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  canBeImproved: boolean;
  suggestedApproach?: string;
}

interface FeedbackResult {
  overallFeedback: string;
  overallStrengths: string[];
  overallImprovements: string[];
  questionFeedback: QuestionFeedback[];
}

export default function FeedbackHelpPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [dragActive, setDragActive] = useState(false);

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
        // Filter assignments that allow draft submissions
        setAssignments(data.filter((a: Assignment) => a.allowDraftSubmissions));
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

    setUploading(true);
    setFeedback(null);

    try {
      // Upload the file
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('assignmentId', selectedAssignment._id);
      formData.append('submissionType', 'draft');

      const uploadRes = await fetch('/api/submissions', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        throw new Error(error.message || 'Failed to upload');
      }

      const submission = await uploadRes.json();
      setUploading(false);
      setProcessing(true);

      // Generate feedback
      const feedbackRes = await fetch('/api/feedback/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission._id }),
      });

      if (!feedbackRes.ok) {
        const error = await feedbackRes.json();
        throw new Error(error.message || 'Failed to generate feedback');
      }

      const result = await feedbackRes.json();
      setFeedback(result.feedback);
      toast.success('Feedback generated successfully!');
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
        <title>Feedback & Help | Computing 7155 Portal</title>
      </Head>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            📝 Assignment Feedback & Help
          </h1>
          <p className="text-slate-400">
            Upload your draft work to get first-level feedback before final submission
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <FiUpload className="mr-2 text-indigo-400" />
              Upload Your Work
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
                }}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Choose an assignment...</option>
                {assignments.map((assignment) => (
                  <option key={assignment._id} value={assignment._id}>
                    {assignment.title} - {assignment.subject} ({assignment.teacher.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Assignment Info */}
            {selectedAssignment && (
              <div className="mb-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                <h3 className="font-medium text-white mb-2">{selectedAssignment.title}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-slate-400">
                  <div className="flex items-center">
                    <FiBook className="mr-2" />
                    {selectedAssignment.subject}
                  </div>
                  <div className="flex items-center">
                    <FiUser className="mr-2" />
                    {selectedAssignment.teacher.name}
                  </div>
                </div>
                {selectedAssignment.dueDate && (
                  <p className="mt-2 text-sm text-amber-400">
                    Due: {new Date(selectedAssignment.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {/* File Upload */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
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
              <FiFileText className="mx-auto text-4xl text-slate-500 mb-4" />
              {file ? (
                <div>
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-sm text-slate-400 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-slate-300">
                    Drag & drop your PDF here, or click to browse
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    Maximum file size: 10MB
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!selectedAssignment || !file || uploading || processing}
              className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {uploading || processing ? (
                <>
                  <FiLoader className="animate-spin mr-2" />
                  {uploading ? 'Uploading...' : 'Generating Feedback...'}
                </>
              ) : (
                <>
                  <FiCheckCircle className="mr-2" />
                  Get Feedback
                </>
              )}
            </button>

            <p className="mt-3 text-xs text-slate-500 text-center">
              This is draft feedback to help you improve. It won't count as your final submission.
            </p>
          </div>

          {/* Feedback Section */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <FiTarget className="mr-2 text-green-400" />
              Your Feedback
            </h2>

            {processing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FiLoader className="animate-spin text-4xl text-indigo-500 mb-4" />
                <p className="text-slate-400">Analyzing your work...</p>
                <p className="text-sm text-slate-500 mt-2">This may take a moment</p>
              </div>
            ) : feedback ? (
              <div className="space-y-4">
                {/* Overall Feedback */}
                <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                  <h3 className="font-medium text-white mb-2">Overall Feedback</h3>
                  <p className="text-slate-300 text-sm">{feedback.overallFeedback}</p>
                </div>

                {/* Strengths */}
                {feedback.overallStrengths.length > 0 && (
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                    <h3 className="font-medium text-green-400 mb-2 flex items-center">
                      <FiThumbsUp className="mr-2" />
                      What You Did Well
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

                {/* Question-by-Question Feedback */}
                <div className="space-y-2">
                  <h3 className="font-medium text-white">Question Feedback</h3>
                  {feedback.questionFeedback.map((qf) => (
                    <div
                      key={qf.questionNumber}
                      className="border border-slate-600/50 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleQuestion(qf.questionNumber)}
                        className="w-full p-3 bg-slate-700/30 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
                      >
                        <span className="text-white font-medium">
                          Question {qf.questionNumber}
                          {qf.canBeImproved && (
                            <span className="ml-2 text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                              Can improve
                            </span>
                          )}
                        </span>
                        {expandedQuestions.has(qf.questionNumber) ? (
                          <FiChevronUp className="text-slate-400" />
                        ) : (
                          <FiChevronDown className="text-slate-400" />
                        )}
                      </button>
                      {expandedQuestions.has(qf.questionNumber) && (
                        <div className="p-3 bg-slate-800/30 space-y-3">
                          <p className="text-sm text-slate-300">{qf.feedback}</p>
                          
                          {qf.strengths.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-green-400 mb-1">Strengths:</p>
                              <ul className="text-xs text-slate-400 space-y-0.5">
                                {qf.strengths.map((s, i) => (
                                  <li key={i}>• {s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {qf.improvements.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-amber-400 mb-1">To Improve:</p>
                              <ul className="text-xs text-slate-400 space-y-0.5">
                                {qf.improvements.map((i, idx) => (
                                  <li key={idx}>• {i}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {qf.suggestedApproach && (
                            <div className="p-2 bg-indigo-500/10 rounded border border-indigo-500/30">
                              <p className="text-xs font-medium text-indigo-400 mb-1">💡 Hint:</p>
                              <p className="text-xs text-slate-300">{qf.suggestedApproach}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FiFileText className="text-4xl text-slate-600 mb-4" />
                <p className="text-slate-400">
                  Upload your assignment to receive feedback
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Our AI will analyze your work and provide helpful suggestions
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">💡 Tips for Better Feedback</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-700/30 rounded-lg">
              <h3 className="font-medium text-white mb-2">Clear Handwriting</h3>
              <p className="text-sm text-slate-400">
                If handwritten, ensure your writing is clear and legible for accurate text extraction.
              </p>
            </div>
            <div className="p-4 bg-slate-700/30 rounded-lg">
              <h3 className="font-medium text-white mb-2">Label Questions</h3>
              <p className="text-sm text-slate-400">
                Clearly mark each question number (e.g., "Q1:", "Question 2:") for better analysis.
              </p>
            </div>
            <div className="p-4 bg-slate-700/30 rounded-lg">
              <h3 className="font-medium text-white mb-2">Complete Answers</h3>
              <p className="text-sm text-slate-400">
                Include your working and reasoning, not just final answers, for more helpful feedback.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
