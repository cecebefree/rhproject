import React from 'react';
import { RegistrationForm } from '../components/RegistrationForm';
import { useAuth } from '../hooks/useAuth';

export function StudentRegistrationPage() {
  const { signUp } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSuccess = () => {
    setSuccess(true);
  };

  const handleError = (err: string) => {
    setError(err);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-4">
            <h2 className="text-xl font-semibold">Account Created!</h2>
            <p className="mt-2">Please check your email to verify your account.</p>
          </div>
          <a href="/login" className="text-indigo-600 hover:text-indigo-800">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create Your Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              sign in to your existing account
            </a>
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <RegistrationForm onSuccess={handleSuccess} onError={handleError} />
        </div>
      </div>
    </div>
  );
}