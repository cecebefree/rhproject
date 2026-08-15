// TwoFactorSetupModal — 3-step wizard for 2FA setup

import { useState, useCallback, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useTwoFactorSetup } from '../../../hooks/useTwoFactor';
import { useResponsive } from '../../../components/MobileNav';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  tenantId: string;
  email: string;
  onSetupComplete: () => void;
}

type SetupStep = 1 | 2 | 3;

export function TwoFactorSetupModal({
  isOpen,
  onClose,
  userId,
  tenantId,
  email,
  onSetupComplete,
}: TwoFactorSetupModalProps) {
  const { isMobile } = useResponsive();
  const { setupResult, setup, confirm, clearSetup, loading, error } = useTwoFactorSetup();
  const [currentStep, setCurrentStep] = useState<SetupStep>(1);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [codesSaved, setCodesSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize setup when modal opens
  useEffect(() => {
    if (isOpen && !setupResult) {
      setup(userId, email);
    }
  }, [isOpen, userId, email, setup, setupResult]);

  // Generate QR code when setupResult changes
  useEffect(() => {
    if (setupResult?.qrCodeUrl) {
      QRCode.toDataURL(setupResult.qrCodeUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }).then((url) => {
        setQrCodeDataUrl(url);
      });
    }
  }, [setupResult?.qrCodeUrl]);

  // Focus TOTP input when step 2 is shown
  useEffect(() => {
    if (currentStep === 2 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentStep]);

  // Handle TOTP verification
  const handleVerifyTotp = useCallback(async () => {
    if (totpCode.length !== 6) return;

    const success = await confirm(userId, tenantId, totpCode, setupResult?.backupCodes || []);
    if (success) {
      setCurrentStep(3);
      setTotpCode('');
    }
  }, [totpCode, userId, tenantId, confirm, setupResult]);

  // Handle TOTP input change (only allow digits, max 6)
  const handleTotpChange = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setTotpCode(digits);
  }, []);

  // Handle key down for TOTP input
  const handleTotpKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && totpCode.length === 6) {
        handleVerifyTotp();
      }
    },
    [totpCode, handleVerifyTotp]
  );

  // Copy backup codes to clipboard
  const handleCopyCodes = useCallback(() => {
    if (setupResult?.backupCodes) {
      navigator.clipboard.writeText(setupResult.backupCodes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [setupResult]);

  // Handle completion
  const handleComplete = useCallback(() => {
    clearSetup();
    setCurrentStep(1);
    setQrCodeDataUrl(null);
    setTotpCode('');
    setCodesSaved(false);
    setCopied(false);
    onSetupComplete();
    onClose();
  }, [clearSetup, onSetupComplete, onClose]);

  // Handle close
  const handleClose = useCallback(() => {
    clearSetup();
    setCurrentStep(1);
    setQrCodeDataUrl(null);
    setTotpCode('');
    setCodesSaved(false);
    setCopied(false);
    onClose();
  }, [clearSetup, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`bg-white rounded-lg shadow-xl ${
          isMobile ? 'w-full mx-4' : 'max-w-md w-full mx-4'
        } max-h-[90vh] overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {currentStep === 1 && 'Set Up 2FA'}
            {currentStep === 2 && 'Verify Code'}
            {currentStep === 3 && 'Save Backup Codes'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Step 1: QR Code */}
          {currentStep === 1 && (
            <div className="text-center">
              {loading ? (
                <div className="py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-sm text-gray-500">Generating QR code...</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>

                  {qrCodeDataUrl && (
                    <div className="mb-4">
                      <img
                        src={qrCodeDataUrl}
                        alt="2FA QR Code"
                        className="mx-auto"
                        style={{ width: '200px', height: '200px' }}
                      />
                    </div>
                  )}

                  {/* Manual entry */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Or enter this code manually:</p>
                    <div className="bg-gray-100 p-2 rounded font-mono text-sm break-all">
                      {setupResult?.secret}
                    </div>
                  </div>

                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Continue
                  </button>
                </>
              )}
            </div>
          )}

          {/* Step 2: Verify TOTP */}
          {currentStep === 2 && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Enter the 6-digit code from your authenticator app
              </p>

              <div className="mb-4">
                <input
                  ref={inputRef}
                  type="text"
                  value={totpCode}
                  onChange={(e) => handleTotpChange(e.target.value)}
                  onKeyDown={handleTotpKeyDown}
                  placeholder="000000"
                  maxLength={6}
                  className="w-48 px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleVerifyTotp}
                disabled={totpCode.length !== 6 || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          )}

          {/* Step 3: Backup Codes */}
          {currentStep === 3 && setupResult && (
            <div>
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800 font-medium">
                  Save these backup codes in a safe place
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Each code can only be used once. You won&apos;t be able to see these codes again.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <div className="grid grid-cols-2 gap-2">
                  {setupResult.backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="font-mono text-sm bg-white p-2 rounded border border-gray-200"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={handleCopyCodes}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  {copied ? 'Copied!' : 'Copy All Codes'}
                </button>
              </div>

              <label className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={codesSaved}
                  onChange={(e) => setCodesSaved(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">I&apos;ve saved these backup codes</span>
              </label>

              <button
                onClick={handleComplete}
                disabled={!codesSaved}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Complete Setup
              </button>
            </div>
          )}
        </div>

        {/* Progress indicator */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex justify-center gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full ${
                  step === currentStep
                    ? 'bg-blue-600'
                    : step < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
