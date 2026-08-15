/**
 * TwoFactorService — TOTP operations, encryption, backup codes.
 * Handles 2FA setup, verification, and management.
 */

import * as OTPAuth from 'otpauth';
import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface UserTwoFactor {
  id: string;
  user_id: string;
  tenant_id: string;
  secret: string;
  enabled: boolean;
  backup_codes: string[];
  created_at: string;
  updated_at: string;
}

export interface TwoFactorSetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorStatus {
  enabled: boolean;
  createdAt: string | null;
}

// ═══════════════════════════════════════════════════════════
// ENCRYPTION UTILITIES
// ═══════════════════════════════════════════════════════════

// Default encryption key - in production, use environment variable
const DEFAULT_ENCRYPTION_KEY = 'rhproject-2fa-encryption-key-2024';

/**
 * Encrypt a value using AES-256-GCM
 */
export async function encryptValue(value: string, encryptionKey?: string): Promise<string> {
  const key = encryptionKey || DEFAULT_ENCRYPTION_KEY;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(value)
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a value using AES-256-GCM
 */
export async function decryptValue(encrypted: string, encryptionKey?: string): Promise<string> {
  const key = encryptionKey || DEFAULT_ENCRYPTION_KEY;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));

  // Decode from base64
  const combined = new Uint8Array(
    atob(encrypted).split('').map((c) => c.charCodeAt(0))
  );

  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encryptedData
  );

  return new TextDecoder().decode(decrypted);
}

// ═══════════════════════════════════════════════════════════
// TOTP UTILITIES
// ═══════════════════════════════════════════════════════════

/**
 * Generate a new TOTP secret
 */
export function generateSecret(): OTPAuth.Secret {
  return new OTPAuth.Secret({ size: 20 });
}

/**
 * Generate otpauth:// URI for QR code
 */
export function generateQrCodeUrl(
  secret: OTPAuth.Secret,
  email: string,
  issuer = 'RhProject'
): string {
  const totp = new OTPAuth.TOTP({
    issuer,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  return totp.toString();
}

/**
 * Verify a TOTP code
 */
export function verifyTotpCode(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: 'RhProject',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

// ═══════════════════════════════════════════════════════════
// BACKUP CODE UTILITIES
// ═══════════════════════════════════════════════════════════

/**
 * Generate random backup codes
 */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    const code = Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 8);
    codes.push(code);
  }
  return codes;
}

/**
 * Hash a backup code using SHA-256
 */
export async function hashBackupCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify a backup code against its hash
 */
export async function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): Promise<{ valid: boolean; index: number }> {
  const hashedCode = await hashBackupCode(code);
  const index = hashedCodes.indexOf(hashedCode);
  return { valid: index !== -1, index };
}

// ═══════════════════════════════════════════════════════════
// 2FA STATUS
// ═══════════════════════════════════════════════════════════

/**
 * Get 2FA status for a user
 */
export async function getTwoFactorStatus(userId: string): Promise<TwoFactorStatus> {
  const { data, error } = await supabase
    .from('user_2fa')
    .select('enabled, created_at')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { enabled: false, createdAt: null };
  }

  return {
    enabled: data.enabled,
    createdAt: data.created_at,
  };
}

// ═══════════════════════════════════════════════════════════
// 2FA SETUP
// ═══════════════════════════════════════════════════════════

/**
 * Initiate 2FA setup - generates secret, QR code URL, and backup codes
 * Does NOT save to database yet - call confirmTwoFactorSetup after verification
 */
export function initiateTwoFactorSetup(
  userId: string,
  email: string
): TwoFactorSetupResult {
  const secret = generateSecret();
  const qrCodeUrl = generateQrCodeUrl(secret, email);
  const backupCodes = generateBackupCodes();

  return {
    secret: secret.base32,
    qrCodeUrl,
    backupCodes,
  };
}

/**
 * Confirm 2FA setup - verifies TOTP code and saves to database
 */
export async function confirmTwoFactorSetup(
  userId: string,
  tenantId: string,
  totpCode: string,
  secret: string,
  backupCodes: string[]
): Promise<{ success: boolean; error?: string }> {
  // Verify the TOTP code
  const isValid = verifyTotpCode(secret, totpCode);
  if (!isValid) {
    return { success: false, error: 'Invalid verification code' };
  }

  // Hash backup codes
  const hashedCodes = await Promise.all(backupCodes.map(hashBackupCode));

  // Encrypt the secret
  const encryptedSecret = await encryptValue(secret);

  // Save to database
  const { error } = await supabase.from('user_2fa').upsert(
    {
      user_id: userId,
      tenant_id: tenantId,
      secret: encryptedSecret,
      enabled: true,
      backup_codes: JSON.stringify(hashedCodes),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ═══════════════════════════════════════════════════════════
// 2FA VERIFICATION
// ═══════════════════════════════════════════════════════════

/**
 * Verify a TOTP code for a user
 */
export async function verifyTwoFactor(
  userId: string,
  totpCode: string
): Promise<{ valid: boolean; error?: string }> {
  // Get the user's 2FA config
  const { data, error } = await supabase
    .from('user_2fa')
    .select('secret, enabled')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { valid: false, error: '2FA not configured' };
  }

  if (!data.enabled) {
    return { valid: false, error: '2FA is not enabled' };
  }

  // Decrypt the secret
  const secret = await decryptValue(data.secret);

  // Verify the TOTP code
  const isValid = verifyTotpCode(secret, totpCode);
  return { valid: isValid };
}

/**
 * Validate a backup code for a user
 */
export async function validateBackupCode(
  userId: string,
  backupCode: string
): Promise<{ valid: boolean; error?: string }> {
  // Get the user's 2FA config
  const { data, error } = await supabase
    .from('user_2fa')
    .select('backup_codes, enabled')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { valid: false, error: '2FA not configured' };
  }

  if (!data.enabled) {
    return { valid: false, error: '2FA is not enabled' };
  }

  // Parse hashed codes
  const hashedCodes: string[] = JSON.parse(data.backup_codes || '[]');

  // Verify the backup code
  const { valid, index } = await verifyBackupCode(backupCode, hashedCodes);

  if (!valid) {
    return { valid: false, error: 'Invalid backup code' };
  }

  // Remove the used code
  hashedCodes.splice(index, 1);

  // Update the database
  const { error: updateError } = await supabase
    .from('user_2fa')
    .update({ backup_codes: JSON.stringify(hashedCodes) })
    .eq('user_id', userId);

  if (updateError) {
    return { valid: false, error: 'Failed to update backup codes' };
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════
// 2FA DISABLE
// ═══════════════════════════════════════════════════════════

/**
 * Disable 2FA for a user
 */
export async function disableTwoFactor(
  userId: string,
  totpCode: string
): Promise<{ success: boolean; error?: string }> {
  // First verify the TOTP code
  const { valid, error: verifyError } = await verifyTwoFactor(userId, totpCode);
  if (!valid) {
    return { success: false, error: verifyError || 'Invalid verification code' };
  }

  // Disable 2FA
  const { error } = await supabase
    .from('user_2fa')
    .update({
      enabled: false,
      secret: '',
      backup_codes: '[]',
    })
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ═══════════════════════════════════════════════════════════
// BACKUP CODE REGENERATION
// ═══════════════════════════════════════════════════════════

/**
 * Regenerate backup codes for a user
 */
export async function regenerateBackupCodes(
  userId: string,
  totpCode: string
): Promise<{ backupCodes: string[]; error?: string }> {
  // First verify the TOTP code
  const { valid, error: verifyError } = await verifyTwoFactor(userId, totpCode);
  if (!valid) {
    return { backupCodes: [], error: verifyError || 'Invalid verification code' };
  }

  // Generate new backup codes
  const newBackupCodes = generateBackupCodes();
  const hashedCodes = await Promise.all(newBackupCodes.map(hashBackupCode));

  // Update the database
  const { error } = await supabase
    .from('user_2fa')
    .update({ backup_codes: JSON.stringify(hashedCodes) })
    .eq('user_id', userId);

  if (error) {
    return { backupCodes: [], error: error.message };
  }

  return { backupCodes: newBackupCodes };
}

/**
 * Get remaining backup codes count (without revealing codes)
 */
export async function getBackupCodesCount(
  userId: string
): Promise<{ count: number; error?: string }> {
  const { data, error } = await supabase
    .from('user_2fa')
    .select('backup_codes')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { count: 0, error: error?.message };
  }

  const codes: string[] = JSON.parse(data.backup_codes || '[]');
  return { count: codes.length };
}
