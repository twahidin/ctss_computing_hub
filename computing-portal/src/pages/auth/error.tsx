import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

export default function AuthError() {
  const router = useRouter();
  const { error } = router.query;

  const getErrorMessage = (error: string | string[] | undefined) => {
    switch (error) {
      case 'CredentialsSignin':
        return 'Invalid email or password. Please try again.';
      case 'SessionRequired':
        return 'Please sign in to access this page.';
      case 'AccessDenied':
        return 'You do not have permission to access this resource.';
      default:
        return 'An authentication error occurred. Please try again.';
    }
  };

  return (
    <>
      <Head>
        <title>Error | Computing 7155 Portal</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500 to-red-700 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <span className="text-6xl">⚠️</span>
            <h1 className="text-3xl font-bold text-white mt-4">
              Authentication Error
            </h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <p className="text-gray-600 mb-6">
              {getErrorMessage(error)}
            </p>

            <div className="space-y-3">
              <Link
                href="/auth/login"
                className="block w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Try Again
              </Link>
              <Link
                href="/"
                className="block w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
