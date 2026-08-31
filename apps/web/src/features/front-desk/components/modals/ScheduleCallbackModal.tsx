import { Inquiry } from '../../index';

interface ScheduleCallbackModalProps {
  inquiry: Inquiry | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ScheduleCallbackModal({ inquiry, isOpen, onClose, onSuccess }: ScheduleCallbackModalProps) {
  return <div></div>;
}
