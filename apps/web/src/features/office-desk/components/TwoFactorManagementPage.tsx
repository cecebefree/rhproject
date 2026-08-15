// TwoFactorManagementPage — 2FA status, enable/disable, backup codes

import { useState, useCallback } from 'react';
import {
  useTwoFactorStatus,
  useTwoFactorDisable,
  useTwoFactorRegenerate,
  useBackupCodesCount,
} from '../../../hooks/useTwoFactor';
import { TwoFactorSetupModal } from './TwoFactorSetupModal';
import { useResponsive } from '../../../components/MobileNav';

interface TwoFactorManagementPageProps {
  userId: string;
  tenantId: string;
  email: string;
}

export function TwoFactorManagementPage({
  userId,
  tenantId,
  email,
}: TwoFactorManagementPageProps) {
  const { isMobile } = useResponsive();
  const {
    enabled,
    createdAt,
    loading: statusLoading,
    refresh: refreshStatus,
  } = useTwoFactorStatus(userId);
  const { disable, loading: disableLoading } = useTwoFactorDisable();
  const { regenerate, loading: regenerateLoading } = useTwoFactorRegenerate();
  const { count: backupCodesCount, refresh: refreshBackupCount } = useBackupCodesCount(userId);

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [regenerateCode, setRegenerateCode] = useState('');
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Handle setup complete
  const handleSetupComplete = useCallback(() => {
    refreshStatus();
    refreshBackupCount();
  }, [refreshStatus, refreshBackupCount]);

  // Handle disable 2FA
  const handleDisable = useCallback(async () => {
    if (disableCode.length !== 6) return;

    const success = await disable(userId, disableCode);
    if (success) {
      setShowDisableModal(false);
      setDisableCode('');
      refreshStatus();
      refreshBackupCount();
    }
  }, [userId, disableCode, disable, refreshStatus, refreshBackupCount]);

  // Handle regenerate backup codes
  const handleRegenerate = useCallback(async () => {
    if (regenerateCode.length !== 6) return;

    const codes = await regenerate(userId, regenerateCode);
    if (codes.length > 0) {
      setNewBackupCodes(codes);
      setShowRegenerateModal(false);
      setRegenerateCode('');
      refreshBackupCount();
    }
  }, [userId, regenerateCode, regenerate, refreshBackupCount]);

  // Handle copy new backup codes
  const handleCopyNewCodes = useCallback(() => {
    navigator.clipboard.writeText(newBackupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [newBackupCodes]);

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div
        className={`p-4 rounded-lg border ${
          enabled
            ? 'bg-green-50 border-green-200'
            : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              enabled ? 'bg-green-100' : 'bg-gray-100'
            }`}
          >
            <span className="text-xl">{enabled ? '🔒' : '🔓'}</span>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              Two-Factor Authentication: {enabled ? 'Enabled' : 'Disabled'}
            </h3>
            {enabled && createdAt && (
              <p className="text-sm text-gray-500">
                Enabled on {new Date(createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-4">
        {enabled ? (
          <>
            {/* Backup Codes Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Backup Codes</h4>
              <p className="text-sm text-gray-600 mb-3">
                You have {backupCodesCount} backup codes remaining.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRegenerateModal(true)}
                  disabled={regenerateLoading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {regenerateLoading ? 'Regenerating...' : 'Regenerate Codes'}
                </button>
              </div>
            </div>

            {/* Disable 2FA */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Disable 2FA</h4>
              <p className="text-sm text-gray-600 mb-3">
                This will remove the extra layer of security from your account.
              </p>
              <button
                onClick={() => setShowDisableModal(true)}
                disabled={disableLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {disableLoading ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </div>
          </>
        ) : (
          /* Enable 2FA */
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Enable 2FA</h4>
            <p className="text-sm text-gray-600 mb-3">
              Add an extra layer of security to your account by enabling two-factor authentication.
            </p>
            <button
              onClick={() => setShowSetupModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Enable 2FA
            </button>
          </div>
        )}
      </div>

      {/* New Backup Codes Display */}
      {newBackupCodes.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">New Backup Codes</h4>
          <p className="text-sm text-yellow-700 mb-3">
            Save these codes in a safe place. Each code can only be used once.
          </p>
          <div className="bg-white p-3 rounded-md mb-3">
            <div className="grid grid-cols-2 gap-2">
              {newBackupCodes.map((code, index) => (
                <div
                  key={index}
                  className="font-mono text-sm bg-gray-50 p-2 rounded border border-gray-200"
                >
                  {code}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleCopyNewCodes}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            {copied ? 'Copied!' : 'Copy All Codes'}
          </button>
        </div>
      )}

      {/* Setup Modal */}
      <TwoFactorSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        userId={userId}
        tenantId={tenantId}
        email={email}
        onSetupComplete={handleSetupComplete}
      />

      {/* Disable Modal */}
      {showDisableModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDisableModal(false);
              setDisableCode('');
            }
          }}
        >
          <div
            className={`bg-white rounded-lg shadow-xl ${
              isMobile ? 'w-full mx-4' : 'max-w-sm w-full mx-4'
            } p-6`}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Disable 2FA</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your authenticator code to confirm disabling 2FA.
            </p>
            <input
              type="text"
              value={disableCode}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                setDisableCode(digits);
              }}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDisableModal(false);
                  setDisableCode('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable}
                disabled={disableCode.length !== 6 || disableLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {disableLoading ? 'Disabling...' : 'Disable'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Modal */}
      {showRegenerateModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRegenerateModal(false);
              setRegenerateCode('');
            }
          }}
        >
          <div
            className={`bg-white rounded-lg shadow-xl ${
              isMobile ? 'w-full mx-4' : 'max-w-sm w-full mx-4'
            } p-6`}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Regenerate Backup Codes</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your authenticator code to generate new backup codes.
            </p>
            <input
              type="text"
              value={regenerateCode}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                setRegenerateCode(digits);
              }}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRegenerateModal(false);
                  setRegenerateCode('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                disabled={regenerateCode.length !== 6 || regenerateLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {regenerateLoading ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
