import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';

interface ModuleCardProps {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  progress: number;
  topicsCount: number;
  exercisesCount: number;
}

export default function ModuleCard({
  id,
  name,
  description,
  icon,
  color,
  progress,
  topicsCount,
  exercisesCount,
}: ModuleCardProps) {
  return (
    <Link
      href={`/syllabus?module=${id}`}
      className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-primary-300 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center text-2xl shadow-sm`}
        >
          {icon}
        </div>
        <FiArrowRight
          className="text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all"
          size={20}
        />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Module {id}: {name}
      </h3>
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{description}</p>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`${color} h-2 rounded-full transition-all duration-300`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center space-x-4 text-xs text-gray-500">
        <span>{topicsCount} topics</span>
        <span>•</span>
        <span>{exercisesCount} exercises</span>
      </div>
    </Link>
  );
}
