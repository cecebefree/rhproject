// NoteAttachmentList — Display list of file attachments on a note

import type { ContactNoteAttachment } from '../services/contactNotes';

interface NoteAttachmentListProps {
  attachments: ContactNoteAttachment[];
  onRemove?: (attachmentId: string) => void;
  editable?: boolean;
}

function getFileIcon(fileType: string | null): string {
  if (!fileType) return '📄';
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.includes('pdf')) return '📕';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
  if (fileType.includes('presentation')) return '📽️';
  if (fileType.startsWith('video/')) return '🎥';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType.includes('zip') || fileType.includes('archive')) return '📦';
  return '📄';
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NoteAttachmentList({ attachments, onRemove, editable = false }: NoteAttachmentListProps) {
  if (attachments.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px',
            backgroundColor: '#f7fafc',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        >
          <span style={{ fontSize: '16px' }}>{getFileIcon(attachment.file_type)}</span>
          <a
            href={attachment.file_url}
            target="_blank"
            rel="noopener noreferrer"
            download
            style={{
              flex: 1,
              color: '#3182ce',
              textDecoration: 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {attachment.file_name}
          </a>
          <span style={{ color: '#718096', fontSize: '12px', flexShrink: 0 }}>
            {formatFileSize(attachment.file_size)}
          </span>
          {editable && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(attachment.id)}
              style={{
                padding: '2px 6px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#e53e3e',
                cursor: 'pointer',
                fontSize: '14px',
                flexShrink: 0,
              }}
              title="Remove attachment"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
