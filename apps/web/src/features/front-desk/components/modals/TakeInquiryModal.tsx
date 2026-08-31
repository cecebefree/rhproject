import { Inquiry } from '../../index';

interface TakeInquiryModalProps {
  inquiry: Inquiry | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentCounselorId: string;
}

export function TakeInquiryModal({ inquiry, isOpen, onClose, onSuccess, currentCounselorId }: TakeInquiryModalProps) {
  return <div></div>;
}
