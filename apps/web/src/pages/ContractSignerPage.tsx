// ContractSignerPage — public page for viewing and signing enrollment contracts

import { useParams } from 'react-router-dom';
import ContractSigner from '../features/office-desk/components/ContractSigner';

export default function ContractSignerPage() {
  const { contractId } = useParams<{ contractId: string }>();

  if (!contractId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Invalid contract link</div>
      </div>
    );
  }

  return <ContractSigner contractId={contractId} />;
}
