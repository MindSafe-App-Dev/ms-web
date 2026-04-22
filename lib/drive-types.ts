export type DriveFeature = 'audio' | 'camera' | 'sms';

export interface DriveConnectionStatus {
  connected: boolean;
  accountEmail?: string;
  rootFolderName: string;
  rootFolderId?: string;
  connectedAt?: string;
  features: DriveFeature[];
}

export interface DriveUploadRequest {
  deviceName: string;
  feature: DriveFeature;
  fileName: string;
  mimeType: string;
}

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  webViewLink?: string;
  folderPath: string;
  uploadedAt: string;
}
