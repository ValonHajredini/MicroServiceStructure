export class FileMetadataDto {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  service: string;
  status: string;
  createdAt: Date;
}

export class PresignedUrlResponseDto {
  fileId: string;
  uploadUrl: string;
  expiresAt: string;
  storageKey: string;
  metadata: FileMetadataDto;
}

export class FileDownloadResponseDto {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  service: string;
  downloadUrl: string;
  expiresAt: string;
  createdAt: Date;
  uploadedBy: {
    id: string;
  };
}

export class FileDeleteResponseDto {
  id: string;
  status: string;
  deletedAt: Date;
}

export class FileConfirmResponseDto {
  id: string;
  status: string;
}
