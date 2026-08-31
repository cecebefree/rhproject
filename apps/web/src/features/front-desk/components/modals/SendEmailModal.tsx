import { Inquiry } from '../../index';

interface SendEmailModalProps {
  inquiry: Inquiry | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SendEmailModal({ inquiry, isOpen, onClose, onSuccess }: SendEmailModalProps) {
  return <div></div>;
}
