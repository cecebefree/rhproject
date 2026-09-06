// PDF generation utilities for contracts and invoices
// Uses browser print (works without external deps) or Supabase Edge Function for server-side PDF

export interface ContractPDFData {
  contractId: string;
  title: string;
  terms: any;
  startDate: string | null;
  endDate: string | null;
  studentName: string;
  studentEmail: string;
  courseName: string;
  signedAt: string | null;
  signedBy: string | null;
}

export interface InvoicePDFData {
  invoiceId: string;
  invoiceNumber: string;
  studentName: string;
  courseName: string;
  amount: number;
  status: string;
  createdAt: string;
  dueDate: string | null;
  paidAt: string | null;
}

export function generateContractHTML(data: ContractPDFData): string {
  const terms = data.terms || {};
  const clauses = Array.isArray(terms.clauses) ? terms.clauses : [];
  const monthlyAmount = terms.monthly_amount ?? terms.amount ?? 0;
  const duration = terms.duration_months ?? terms.duration ?? 12;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', sans-serif; color: #1a242b; max-width: 800px; margin: 0 auto; padding: 40px; }
        .header { text-align: center; border-bottom: 3px solid #E8A020; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #273946; font-size: 28px; margin: 0; }
        .header .subtitle { color: #E8A020; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px; }
        .meta { display: flex; justify-content: space-between; margin: 20px 0; padding: 15px; background: #f8f7f4; border-radius: 8px; }
        .meta div { font-size: 13px; }
        .meta .label { color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; }
        .meta .value { font-weight: 600; margin-top: 4px; }
        .section { margin: 25px 0; }
        .section h2 { color: #273946; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
        .clause { margin: 10px 0; padding: 12px; background: #faf9f6; border-left: 3px solid #E8A020; }
        .amount { font-size: 24px; color: #273946; font-weight: 700; }
        .signature { margin-top: 60px; display: flex; justify-content: space-between; }
        .sig-block { width: 45%; }
        .sig-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 8px; font-size: 12px; color: #6b7280; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${data.title}</h1>
        <div class="subtitle">Redhouse — Enrolment Agreement</div>
      </div>

      <div class="meta">
        <div><div class="label">Student</div><div class="value">${data.studentName}</div></div>
        <div><div class="label">Course</div><div class="value">${data.courseName}</div></div>
        <div><div class="label">Start Date</div><div class="value">${data.startDate ?? 'TBD'}</div></div>
        <div><div class="label">End Date</div><div class="value">${data.endDate ?? 'TBD'}</div></div>
      </div>

      <div class="section">
        <h2>Financial Terms</h2>
        <div class="clause">
          <div>Monthly Payment: <span class="amount">R ${monthlyAmount.toLocaleString()}</span></div>
          <div style="margin-top:8px; color:#6b7280; font-size:13px;">Duration: ${duration} months</div>
        </div>
      </div>

      ${clauses.length > 0 ? `
        <div class="section">
          <h2>Terms & Conditions</h2>
          ${clauses.map((c: any, i: number) => `
            <div class="clause">
              <strong>${i + 1}.</strong> ${typeof c === 'string' ? c : c.text || c.title || JSON.stringify(c)}
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="signature">
        <div class="sig-block">
          <div class="sig-line">Student/Guardian Signature</div>
        </div>
        <div class="sig-block">
          <div class="sig-line">Authorized Representative</div>
        </div>
      </div>

      <div class="footer">
        <p>Redhouse Education — ${new Date().getFullYear()} — All rights reserved</p>
        <p>Contract ID: ${data.contractId}</p>
        ${data.signedAt ? `<p>Signed on: ${data.signedAt}</p>` : ''}
      </div>
    </body>
    </html>
  `;
}

export function generateInvoiceHTML(data: InvoicePDFData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', sans-serif; color: #1a242b; max-width: 800px; margin: 0 auto; padding: 40px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
        .logo h1 { color: #273946; font-size: 28px; margin: 0; }
        .logo .subtitle { color: #E8A020; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; }
        .invoice-badge { background: #273946; color: white; padding: 10px 20px; border-radius: 8px; text-align: center; }
        .invoice-badge .number { font-size: 18px; font-weight: 700; }
        .invoice-badge .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; }
        .meta { display: flex; justify-content: space-between; margin: 20px 0; padding: 15px; background: #f8f7f4; border-radius: 8px; }
        .meta div { font-size: 13px; }
        .meta .label { color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; }
        .meta .value { font-weight: 600; margin-top: 4px; }
        .amount-box { text-align: center; padding: 30px; background: #faf9f6; border: 2px solid #E8A020; border-radius: 12px; margin: 20px 0; }
        .amount-box .label { color: #6b7280; text-transform: uppercase; font-size: 12px; letter-spacing: 2px; }
        .amount-box .value { font-size: 36px; color: #273946; font-weight: 700; margin-top: 8px; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .status.paid { background: #d1fae5; color: #065f46; }
        .status.pending { background: #fef3c7; color: #92400e; }
        .status.overdue { background: #fee2e2; color: #991b1b; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">
          <h1>Redhouse</h1>
          <div class="subtitle">Education</div>
        </div>
        <div class="invoice-badge">
          <div class="label">Invoice</div>
          <div class="number">${data.invoiceNumber}</div>
        </div>
      </div>

      <div class="meta">
        <div><div class="label">Student</div><div class="value">${data.studentName}</div></div>
        <div><div class="label">Course</div><div class="value">${data.courseName}</div></div>
        <div><div class="label">Issued</div><div class="value">${data.createdAt}</div></div>
        <div><div class="label">Status</div><div class="value"><span class="status ${data.status}">${data.status}</span></div></div>
      </div>

      <div class="amount-box">
        <div class="label">Amount Due</div>
        <div class="value">R ${data.amount.toLocaleString()}</div>
        ${data.dueDate ? `<div style="margin-top:8px;color:#6b7280;font-size:13px;">Due: ${data.dueDate}</div>` : ''}
        ${data.paidAt ? `<div style="margin-top:8px;color:#059669;font-size:13px;">Paid: ${data.paidAt}</div>` : ''}
      </div>

      <div class="footer">
        <p>Redhouse Education — ${new Date().getFullYear()}</p>
        <p>Invoice ID: ${data.invoiceId}</p>
      </div>
    </body>
    </html>
  `;
}

export function printPDF(html: string, filename: string) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.print();
    win.onafterprint = () => win.close();
  };
}
