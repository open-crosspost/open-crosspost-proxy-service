import { Buffer } from 'node:buffer';

/**
 * Attempt to detect MIME type from buffer content using magic numbers
 * @param buffer The buffer to analyze
 * @returns The detected MIME type or a default type
 */
export function detectMimeType(buffer: Buffer): string {
  const header = buffer.slice(0, 4);
  
  // Check magic numbers
  if (header.toString('hex').startsWith('89504e47')) {
    return 'image/png';
  }
  if (header.toString('hex').startsWith('ffd8')) {
    return 'image/jpeg';
  }
  if (header.toString('ascii').startsWith('GIF8')) {
    return 'image/gif';
  }
  if (header.toString('hex').startsWith('1a45dfa3')) {
    return 'video/webm';
  }
  // MP4 header can vary, but often starts with ftyp at byte 4
  if (buffer.slice(4, 8).toString('ascii') === 'ftyp') {
    return 'video/mp4';
  }

  return 'application/octet-stream';
}

/**
   * Convert media data to buffer
   * @param data The media data to convert
   * @returns The media data as a buffer
   */
export async function convertToBuffer(data: string | Blob): Promise<Buffer> {
  if (typeof data === 'string') {
    // Handle base64 data
    if (data.startsWith('data:')) {
      // Extract base64 data from data URL
      const base64Data = data.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    } else {
      // Assume it's a URL or file path
      return Buffer.from(data);
    }
  } else {
    // Handle Blob data
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
