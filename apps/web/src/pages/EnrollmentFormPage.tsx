// EnrollmentFormPage — public page for family enrollment form (no auth required)

import { useParams } from 'react-router-dom';
import EnrollmentForm from '../features/office-desk/components/EnrollmentForm';

export default function EnrollmentFormPage() {
  const { formToken } = useParams<{ formToken: string }>();

  if (!formToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Invalid form link</div>
      </div>
    );
  }

  return <EnrollmentForm formToken={formToken} />;
}
