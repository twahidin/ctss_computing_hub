import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Syllabus is temporarily disabled - redirect to Python Lab
export default function SyllabusPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/python');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
    </div>
  );
}
