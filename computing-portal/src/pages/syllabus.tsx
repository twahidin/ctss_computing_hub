import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiChevronDown, FiChevronRight, FiBook, FiCheckCircle, FiClock } from 'react-icons/fi';
import syllabusModules from '@/data/syllabus';

export default function SyllabusPage() {
  const router = useRouter();
  const { module: activeModuleParam } = router.query;
  const [expandedModules, setExpandedModules] = useState<number[]>(
    activeModuleParam ? [parseInt(activeModuleParam as string)] : [1]
  );
  const [expandedTopics, setExpandedTopics] = useState<string[]>([]);

  const toggleModule = (moduleId: number) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'hard':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getExerciseLink = (exercise: { type: string; id: string }) => {
    switch (exercise.type) {
      case 'notebook':
      case 'coding':
        return `/python?exercise=${exercise.id}`;
      case 'spreadsheet':
        return `/spreadsheet?exercise=${exercise.id}`;
      case 'quiz':
        return `/quiz/${exercise.id}`;
      default:
        return '#';
    }
  };

  return (
    <>
      <Head>
        <title>Syllabus | Computing 7155 Portal</title>
      </Head>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            📚 O-Level Computing Syllabus (7155)
          </h1>
          <p className="text-gray-600 mt-1">
            Browse all modules, topics, and exercises
          </p>
        </div>

        {/* Assessment Overview */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Assessment Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900">Paper 1: Written</h3>
              <p className="text-sm text-blue-700 mt-1">2 hours • 60% • 80 marks</p>
              <p className="text-xs text-blue-600 mt-2">
                MCQ, short-answer, structured questions
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-medium text-green-900">Paper 2: Lab-based</h3>
              <p className="text-sm text-green-700 mt-1">
                2h 30m • 40% • 70 marks
              </p>
              <p className="text-xs text-green-600 mt-2">
                Python programming & Spreadsheets
              </p>
            </div>
          </div>
        </div>

        {/* Modules List */}
        <div className="space-y-4">
          {syllabusModules.map((module) => (
            <div
              key={module.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Module Header */}
              <button
                onClick={() => toggleModule(module.id)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-12 h-12 ${module.color} rounded-xl flex items-center justify-center text-2xl`}
                  >
                    {module.icon}
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Module {module.id}: {module.name}
                    </h2>
                    <p className="text-sm text-gray-500">{module.description}</p>
                  </div>
                </div>
                {expandedModules.includes(module.id) ? (
                  <FiChevronDown className="text-gray-400" size={24} />
                ) : (
                  <FiChevronRight className="text-gray-400" size={24} />
                )}
              </button>

              {/* Module Content */}
              {expandedModules.includes(module.id) && (
                <div className="border-t border-gray-100">
                  {module.topics.map((topic) => (
                    <div key={topic.id} className="border-b border-gray-100 last:border-b-0">
                      {/* Topic Header */}
                      <button
                        onClick={() => toggleTopic(topic.id)}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-500">
                            {topic.id}
                          </span>
                          <span className="font-medium text-gray-900">
                            {topic.name}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {topic.exercises.length} exercises
                          </span>
                        </div>
                        {expandedTopics.includes(topic.id) ? (
                          <FiChevronDown className="text-gray-400" size={20} />
                        ) : (
                          <FiChevronRight className="text-gray-400" size={20} />
                        )}
                      </button>

                      {/* Topic Content */}
                      {expandedTopics.includes(topic.id) && (
                        <div className="px-6 pb-4 bg-gray-50">
                          {/* Learning Outcomes */}
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              Learning Outcomes:
                            </h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {topic.learningOutcomes.map((outcome, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-primary-500 mr-2">•</span>
                                  {outcome}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Exercises */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              Exercises:
                            </h4>
                            <div className="grid gap-2">
                              {topic.exercises.map((exercise) => (
                                <Link
                                  key={exercise.id}
                                  href={getExerciseLink(exercise)}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all"
                                >
                                  <div className="flex items-center space-x-3">
                                    <span className="text-lg">
                                      {exercise.type === 'notebook' || exercise.type === 'coding'
                                        ? '🐍'
                                        : exercise.type === 'spreadsheet'
                                        ? '📊'
                                        : '📝'}
                                    </span>
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        {exercise.title}
                                      </p>
                                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                                        <span className="capitalize">{exercise.type}</span>
                                        <span>•</span>
                                        <span className="flex items-center">
                                          <FiClock className="mr-1" />
                                          {exercise.estimatedTime} min
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <span
                                    className={`text-xs px-2 py-1 rounded ${getDifficultyColor(
                                      exercise.difficulty
                                    )}`}
                                  >
                                    {exercise.difficulty}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-gradient-to-r from-primary-500 to-primary-700 rounded-xl p-6 text-white">
          <h2 className="text-lg font-semibold mb-4">Syllabus at a Glance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-3xl font-bold">5</p>
              <p className="text-primary-200 text-sm">Modules</p>
            </div>
            <div>
              <p className="text-3xl font-bold">
                {syllabusModules.reduce((acc, m) => acc + m.topics.length, 0)}
              </p>
              <p className="text-primary-200 text-sm">Topics</p>
            </div>
            <div>
              <p className="text-3xl font-bold">
                {syllabusModules.reduce(
                  (acc, m) =>
                    acc + m.topics.reduce((a, t) => a + t.exercises.length, 0),
                  0
                )}
              </p>
              <p className="text-primary-200 text-sm">Exercises</p>
            </div>
            <div>
              <p className="text-3xl font-bold">150</p>
              <p className="text-primary-200 text-sm">Total Marks</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
