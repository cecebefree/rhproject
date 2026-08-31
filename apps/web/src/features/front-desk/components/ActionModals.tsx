import { Inquiry } from '../index';
import { sendEmail } from '../utils/email';

export function ActionModals({ inquiry }: { inquiry: Inquiry }) {
  const handleEmailSend = async (subject: string, body: string) => {
    if (!inquiry.contact_email) return;
    await sendEmail({ inquiry_id: inquiry.id, subject, body, recipient_email: inquiry.contact_email });
  };
  return <div></div>;
}
