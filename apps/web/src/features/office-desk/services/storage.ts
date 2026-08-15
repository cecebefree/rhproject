/**
 * Storage service — File upload handling for contact note attachments.
 * Uses Supabase Storage for file uploads.
 */

import { supabase } from './supabase';

const BUCKET_NAME = 'contact-notes';

export interface UploadResult {
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
}

export interface UploadError {
  message: string;
  code?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Upload a file to Supabase Storage for contact note attachments.
 */
export async function uploadNoteAttachment(
  file: File,
  contactId: string,
  noteId: string,
  deskId: string
): Promise<{ data: UploadResult | null; error: UploadError | null }> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      data: null,
      error: {
        message: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`,
        code: 'FILE_TOO_LARGE',
      },
    };
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      data: null,
      error: {
        message: `Unsupported file type: ${file.type || 'unknown'}`,
        code: 'UNSUPPORTED_TYPE',
      },
    };
  }

  // Build storage path
  const fileExt = file.name.split('.').pop() || 'bin';
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${deskId}/${contactId}/${noteId}/${Date.now()}_${sanitizedFileName}`;

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    return {
      data: null,
      error: {
        message: uploadError.message || 'Failed to upload file',
        code: 'UPLOAD_FAILED',
      },
    };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(uploadData.path);

  return {
    data: {
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
    },
    error: null,
  };
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteNoteAttachment(
  filePath: string
): Promise<{ error: UploadError | null }> {
  const { error: deleteError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (deleteError) {
    return {
      error: {
        message: deleteError.message || 'Failed to delete file',
        code: 'DELETE_FAILED',
      },
    };
  }

  return { error: null };
}

/**
 * Get file info from Supabase Storage.
 */
export async function getFileInfo(
  filePath: string
): Promise<{ data: { size: number; contentType: string } | null; error: UploadError | null }> {
  const { data: fileInfo, error: infoError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(filePath.split('/').slice(0, -1).join('/'), {
      search: filePath.split('/').pop(),
    });

  if (infoError) {
    return {
      data: null,
      error: {
        message: infoError.message || 'Failed to get file info',
      },
    };
  }

  const file = fileInfo?.[0];
  if (!file) {
    return {
      data: null,
      error: { message: 'File not found' },
    };
  }

  return {
    data: {
      size: file.metadata?.size || 0,
      contentType: file.metadata?.mimetype || 'application/octet-stream',
    },
    error: null,
  };
}
