/**
 * ContractSigner — Public page for viewing and signing enrollment contracts.
 * Supports digital signature (canvas pad) and PDF upload.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface Contract {
  id: string;
  contract_type: string;
  version: number;
  pdf_storage_path: string;
  signed_pdf_storage_path: string | null;
  status: string;
  sent_at: string | null;
  signed_at: string | null;
  signature_method: string | null;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

interface ContractSignerProps {
  contractId: string;
}

export default function ContractSigner({ contractId }: ContractSignerProps) {
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [contractHtml, setContractHtml] = useState<string | null>(null);
  const [signatureMethod, setSignatureMethod] = useState<'digital' | 'pdf_upload'>('digital');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Load contract
  useEffect(() => {
    async function loadContract() {
      try {
        const { data, error } = await supabase
          .from('office_desk.contracts')
          .select('*')
          .eq('id', contractId)
          .single();

        if (error || !data) {
          setError('Contract not found');
          return;
        }

        if (data.status === 'signed') {
          setSigned(true);
          setLoading(false);
          return;
        }

        if (data.status === 'voided') {
          setError('This contract has been voided');
          return;
        }

        setContract(data as Contract);

        // Load HTML content from storage
        if (data.pdf_storage_path) {
          const { data: htmlData } = await supabase.storage
            .from('contracts')
            .download(data.pdf_storage_path);

          if (htmlData) {
            const html = await htmlData.text();
            setContractHtml(html);
          }
        }

        setLoading(false);
      } catch {
        setError('Failed to load contract');
        setLoading(false);
      }
    }

    loadContract();
  }, [contractId]);

  // Canvas drawing handlers
  const getCanvasPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    lastPoint.current = getCanvasPoint(e);
  }, [getCanvasPoint]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const point = getCanvasPoint(e);
    if (!ctx || !point || !lastPoint.current) return;

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.strokeStyle = 'rgb(0, 0, 0)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    lastPoint.current = point;
  }, [getCanvasPoint]);

  const stopDrawing = useCallback(() => {
    isDrawing.current = false;
    lastPoint.current = null;
  }, []);

  async function handleSign() {
    if (!contract) return;

    setSigning(true);
    setError(null);

    try {
      let signatureData: Record<string, unknown> = {};

      if (signatureMethod === 'digital') {
        const canvas = canvasRef.current;
        if (!canvas || canvas.toDataURL() === canvas.toDataURL('image/png').replace('data:image/png;base64,', '')) {
          throw new Error('Please provide a signature');
        }
        signatureData = {
          signature_image: canvas.toDataURL(),
          signed_at: new Date().toISOString(),
        };
      } else if (signatureMethod === 'pdf_upload' && uploadedFile) {
        // Upload signed PDF
        const fileName = `signed/${contractId}_${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('contracts')
          .upload(fileName, uploadedFile);

        if (uploadError) {
          throw new Error('Failed to upload signed PDF');
        }

        signatureData = {
          file_name: uploadedFile.name,
          file_path: fileName,
          signed_at: new Date().toISOString(),
        };

        // Update contract with signed PDF path
        await supabase
          .from('office_desk.contracts')
          .update({ signed_pdf_storage_path: fileName })
          .eq('id', contractId);
      }

      // Sign contract
      const { error: signError } = await supabase.functions.invoke('sign-contract', {
        body: {
          contract_id: contractId,
          signature_method: signatureMethod,
          signature_data: signatureData,
        },
      });

      if (signError) {
        throw new Error(signError.message);
      }

      setSigned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign contract');
    } finally {
      setSigning(false);
    }
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading contract...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-lg font-medium mb-2">Error</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <div className="text-green-500 text-lg font-medium mb-2">Contract Signed!</div>
          <div className="text-gray-600 mb-4">
            Thank you for signing the enrollment contract. Our office team will review and finalize
            your enrollment.
          </div>
          <div className="text-sm text-gray-500">
            You will receive an email confirmation shortly.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Enrollment Contract</h1>
          <p className="text-gray-600">
            Please review the contract below and sign to confirm your enrollment.
          </p>
        </div>

        {/* Contract Preview */}
        {contractHtml && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Contract Preview</h2>
            <div
              className="border rounded p-4 max-h-96 overflow-auto"
              dangerouslySetInnerHTML={{ __html: contractHtml }}
            />
          </div>
        )}

        {/* Signature Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Sign Contract</h2>

          {/* Signature Method Selection */}
          <div className="flex gap-4 mb-6">
            <label className="flex items-center">
              <input
                type="radio"
                value="digital"
                checked={signatureMethod === 'digital'}
                onChange={() => setSignatureMethod('digital')}
                className="mr-2"
              />
              <span>Digital Signature</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="pdf_upload"
                checked={signatureMethod === 'pdf_upload'}
                onChange={() => setSignatureMethod('pdf_upload')}
                className="mr-2"
              />
              <span>Upload Signed PDF</span>
            </label>
          </div>

          {signatureMethod === 'digital' ? (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Draw your signature in the box below using your mouse or finger.
              </p>
              <div className="border rounded-lg p-2 mb-4 bg-white">
                <canvas
                  ref={canvasRef}
                  className="w-full h-40 cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <button
                type="button"
                onClick={clearSignature}
                className="text-sm text-gray-500 hover:text-gray-700 mb-4"
              >
                Clear Signature
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Download the contract, sign it, and upload the signed PDF.
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                className="border rounded px-3 py-2 w-full"
              />
            </div>
          )}

          <button
            onClick={handleSign}
            disabled={signing || (signatureMethod === 'pdf_upload' && !uploadedFile)}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 mt-4"
          >
            {signing ? 'Signing...' : 'Sign Contract'}
          </button>
        </div>
      </div>
    </div>
  );
}
