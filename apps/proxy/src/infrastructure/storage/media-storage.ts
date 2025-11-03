import { FileLike } from 'formdata-node';
import { PinataSDK } from 'pinata';

export interface MediaUploadResult {
  cid: string;
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}

export interface MediaMetadata {
  name?: string;
  keyvalues?: Record<string, string>;
  groupId?: string;
}

export class MediaStorage {
  constructor(
    private pinata: PinataSDK,
    private pinataGateway: string = 'https://gateway.pinata.cloud/ipfs',
  ) {}

  /**
   * Upload a file to IPFS via Pinata
   * @param file - A Blob, File, or FileLike (Node/Web compatible)
   * @param metadata - Optional metadata (name, keyvalues, group ID)
   * @returns MediaUploadResult with CID and access URL
   */
  async uploadFile(
    file: FileLike,
    metadata: MediaMetadata = {},
  ): Promise<MediaUploadResult> {
    try {
      let upload = this.pinata.upload.public.file(file);

      if (metadata.name) upload = upload.name(metadata.name);
      if (metadata.keyvalues) upload = upload.keyvalues(metadata.keyvalues);
      if (metadata.groupId) upload = upload.group(metadata.groupId);

      const result = await upload;

      return {
        cid: result.cid,
        name: result.name,
        url: `${this.pinataGateway}/${result.cid}`,
        size: result.size,
        mimeType: result.mime_type,
      };
    } catch (error) {
      console.error('Media upload failed:', error);
      throw new Error('Failed to upload media');
    }
  }

  /**
   * Upload a JSON object to IPFS
   */
  async uploadJson<T extends object>(
    json: T,
    metadata: MediaMetadata = {},
  ): Promise<MediaUploadResult> {
    try {
      let upload = this.pinata.upload.public.json(json);

      if (metadata.name) upload = upload.name(metadata.name);
      if (metadata.keyvalues) upload = upload.keyvalues(metadata.keyvalues);
      if (metadata.groupId) upload = upload.group(metadata.groupId);

      const result = await upload;

      return {
        cid: result.cid,
        name: result.name,
        url: `${this.pinataGateway}/${result.cid}`,
      };
    } catch (error) {
      console.error('JSON upload failed:', error);
      throw new Error('Failed to upload JSON');
    }
  }

  /**
   * Upload from a remote URL (e.g., image on another host)
   */
  async uploadFromUrl(
    url: string,
    metadata: MediaMetadata = {},
  ): Promise<MediaUploadResult> {
    try {
      let upload = this.pinata.upload.public.url(url);

      if (metadata.name) upload = upload.name(metadata.name);
      if (metadata.keyvalues) upload = upload.keyvalues(metadata.keyvalues);
      if (metadata.groupId) upload = upload.group(metadata.groupId);

      const result = await upload;

      return {
        cid: result.cid,
        name: result.name,
        url: `${this.pinataGateway}/${result.cid}`,
        size: result.size,
        mimeType: result.mime_type,
      };
    } catch (error) {
      console.error('URL upload failed:', error);
      throw new Error('Failed to upload from URL');
    }
  }
}
