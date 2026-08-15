// TwoFactorLoginModal — TOTP/backup code entry during login

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTwoFactorVerify } from '../../../hooks/useTwoFactor';
import { useResponsive } from '../../../components/MobileNav';

interface TwoFactorLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onVerifySuccess: () => void;
}

type InputMode = 'totp' | 'backup';

export function TwoFactorLoginModal({
  isOpen,
  onClose,
  userId,
  onVerifySuccess,
}: TwoFactorLoginModalProps) {
  const { isMobile } = useResponsive();
  const { verify, verifyBackup, loading, error } = useTwoFactorVerify();
  const [inputMode, setInputMode] = useState<InputMode>('totp');
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens or mode changes
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, inputMode]);

  // Handle TOTP verification
  const handleVerifyTotp = useCallback(async () => {
    if (totpCode.length !== 6) return;

    const success = await verify(userId, totpCode);
    if (success) {
      setTotpCode('');
      onVerifySuccess();
    }
  }, [totpCode, userId, verify, onVerifySuccess]);

  // Handle backup code verification
  const handleVerifyBackup = useCallback(async () => {
    if (!backupCode.trim()) return;

    const success = await verifyBackup(userId, backupCode);
    if (success) {
      setBackupCode('');
      onVerifySuccess();
    }
  }, [backupCode, userId, verifyBackup, onVerifySuccess]);

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

  // Handle key down for backup code input
  const handleBackupKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && backupCode.trim()) {
        handleVerifyBackup();
      }
    },
    [backupCode, handleVerifyBackup]
  );

  // Toggle input mode
  const toggleMode = useCallback(() => {
    setInputMode((prev) => (prev === 'totp' ? 'backup' : 'totp'));
    setTotpCode('');
    setBackupCode('');
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    setTotpCode('');
    setBackupCode('');
    setInputMode('totp');
    onClose();
  }, [onClose]);

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
          isMobile ? 'w-full mx-4' : 'max-w-sm w-full mx-4'
        } max-h-[90vh] overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h3>
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

          {/* TOTP Input Mode */}
          {inputMode === 'totp' && (
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🔐</span>
                </div>
                <p className="text-sm text-gray-600">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

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
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>

              <button
                onClick={toggleMode}
                className="mt-4 text-sm text-blue-600 hover:text-blue-800"
              >
                Use a backup code instead
              </button>
            </div>
          )}

          {/* Backup Code Input Mode */}
          {inputMode === 'backup' && (
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🔑</span>
                </div>
                <p className="text-sm text-gray-600">
                  Enter one of your backup codes
                </p>
              </div>

              <div className="mb-4">
                <input
                  ref={inputRef}
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value)}
                  onKeyDown={handleBackupKeyDown}
                  placeholder="XXXXXXXX"
                  className="w-full px-4 py-3 text-center text-lg font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleVerifyBackup}
                disabled={!backupCode.trim() || loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify Backup Code'}
              </button>

              <button
                onClick={toggleMode}
                className="mt-4 text-sm text-blue-600 hover:text-blue-800"
              >
                Use authenticator app instead
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
