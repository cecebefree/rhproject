import { Inquiry } from '../../index';

interface EscalateModalProps {
  inquiry: Inquiry | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EscalateModal({ inquiry, isOpen, onClose, onSuccess }: EscalateModalProps) {
  return <div></div>;
}
