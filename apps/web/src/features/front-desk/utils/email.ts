export async function sendEmail(payload: { inquiry_id: string; subject: string; body: string; recipient_email: string }): Promise<void> {
  const response = await fetch('/api/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error('Failed to send email');
}
