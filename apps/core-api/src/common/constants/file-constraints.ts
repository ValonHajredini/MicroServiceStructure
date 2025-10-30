export const FILE_CONSTRAINTS = {
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB
  ALLOWED_MIME_TYPES: [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Text
    'text/plain',
    'text/csv',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
  ],
  VALID_SERVICES: ['notes', 'kanban', 'forms'] as const,
  UPLOAD_EXPIRATION: 900, // 15 minutes
  DOWNLOAD_EXPIRATION: 900, // 15 minutes
};

export type ValidService = (typeof FILE_CONSTRAINTS.VALID_SERVICES)[number];
