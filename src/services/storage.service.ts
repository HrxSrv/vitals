import { supabaseAdmin } from './supabase.service';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

/**
 * Storage service for managing file uploads to Supabase Storage
 * Handles PDF report uploads with proper access policies
 */
export class StorageService {
  private readonly bucketName = 'reports';

  /**
   * Initialize storage bucket if it doesn't exist
   * Should be called on application startup
   */
  async initializeBucket(): Promise<void> {
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

      if (listError) {
        throw new Error(`Failed to list buckets: ${listError.message}`);
      }

      const bucketExists = buckets?.some((bucket) => bucket.name === this.bucketName);

      if (!bucketExists) {
        // Create bucket with private access
        const { error: createError } = await supabaseAdmin.storage.createBucket(this.bucketName, {
          public: false,
          fileSizeLimit: 10485760, // 10MB in bytes
          allowedMimeTypes: ['application/pdf'],
        });

        if (createError) {
          throw new Error(`Failed to create bucket: ${createError.message}`);
        }

        logger.info(`✓ Created storage bucket: ${this.bucketName}`);
      } else {
        logger.info(`✓ Storage bucket exists: ${this.bucketName}`);
      }
    } catch (error) {
      logger.error('✗ Storage bucket initialization failed:', error);
      throw error;
    }
  }

  /**
   * Upload a file to Supabase Storage
   *
   * @param userId - User ID for organizing files
   * @param profileId - Profile ID for organizing files
   * @param file - File buffer to upload
   * @param filename - Original filename
   * @returns Public URL of the uploaded file
   */
  async uploadFile(
    userId: string,
    profileId: string,
    file: Buffer,
    filename: string
  ): Promise<string> {
    try {
      // Generate secure filename with timestamp and random UUID
      const timestamp = Date.now();
      const randomId = crypto.randomUUID();
      const extension = filename.split('.').pop() || 'pdf';
      const securePath = `${userId}/${profileId}/${timestamp}-${randomId}.${extension}`;

      // Upload file to storage
      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .upload(securePath, file, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (error) {
        logger.error('Storage upload error:', error);
        throw new HttpError(500, `Failed to upload file: ${error.message}`, 'STORAGE_ERROR');
      }

      // Get public URL (will require authentication to access due to RLS)
      const { data: urlData } = supabaseAdmin.storage.from(this.bucketName).getPublicUrl(data.path);

      logger.info(`File uploaded successfully: ${data.path}`);
      return urlData.publicUrl;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error during file upload:', error);
      throw new HttpError(500, 'Failed to upload file', 'STORAGE_ERROR');
    }
  }

  /**
   * Download a file from Supabase Storage
   *
   * @param fileUrl - Full URL of the file to download
   * @returns File buffer
   */
  async downloadFile(fileUrl: string): Promise<Buffer> {
    try {
      // Extract path from URL
      const path = this.extractPathFromUrl(fileUrl);

      const { data, error } = await supabaseAdmin.storage.from(this.bucketName).download(path);

      if (error) {
        logger.error('Storage download error:', error);
        throw new HttpError(500, `Failed to download file: ${error.message}`, 'STORAGE_ERROR');
      }

      // Convert Blob to Buffer
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error during file download:', error);
      throw new HttpError(500, 'Failed to download file', 'STORAGE_ERROR');
    }
  }

  /**
   * Delete a file from Supabase Storage
   *
   * @param fileUrl - Full URL of the file to delete
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract path from URL
      const path = this.extractPathFromUrl(fileUrl);

      const { error } = await supabaseAdmin.storage.from(this.bucketName).remove([path]);

      if (error) {
        logger.error('Storage delete error:', error);
        throw new HttpError(500, `Failed to delete file: ${error.message}`, 'STORAGE_ERROR');
      }

      logger.info(`File deleted successfully: ${path}`);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error during file deletion:', error);
      throw new HttpError(500, 'Failed to delete file', 'STORAGE_ERROR');
    }
  }

  /**
   * Create a signed URL for temporary file access
   *
   * @param fileUrl - Full URL of the file
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Signed URL
   */
  async createSignedUrl(fileUrl: string, expiresIn: number = 3600): Promise<string> {
    try {
      const path = this.extractPathFromUrl(fileUrl);

      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .createSignedUrl(path, expiresIn);

      if (error) {
        logger.error('Failed to create signed URL:', error);
        throw new HttpError(500, `Failed to create signed URL: ${error.message}`, 'STORAGE_ERROR');
      }

      return data.signedUrl;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error('Unexpected error creating signed URL:', error);
      throw new HttpError(500, 'Failed to create signed URL', 'STORAGE_ERROR');
    }
  }

  /**
   * Extract file path from full Supabase Storage URL
   *
   * @param fileUrl - Full URL from Supabase Storage
   * @returns File path within the bucket
   */
  private extractPathFromUrl(fileUrl: string): string {
    try {
      const url = new URL(fileUrl);
      // URL format: https://<project>.supabase.co/storage/v1/object/public/reports/<path>
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.indexOf(this.bucketName);

      if (bucketIndex === -1) {
        throw new Error('Invalid file URL: bucket not found');
      }

      return pathParts.slice(bucketIndex + 1).join('/');
    } catch (error) {
      logger.error('Failed to extract path from URL:', error);
      throw new HttpError(400, 'Invalid file URL', 'INVALID_URL');
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
