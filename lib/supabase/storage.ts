import { createClient } from '@/lib/supabase/client'
import { 
  uploadFileToS3, 
  deleteFileFromS3ByUrl, 
  uploadOrganizationLogoToS3,
  extractS3KeyFromUrl 
} from '@/lib/aws/s3'

// Organization logo URL generation is now handled client-side in useOrganizationLogo hook

/**
 * Upload organization logo and return just the filename
 * @param organizationId - The organization ID
 * @param file - The file to upload
 */
export async function uploadOrganizationLogo(
  organizationId: string,
  file: File
): Promise<{ filename: string; publicUrl: string }> {
  try {
    const result = await uploadOrganizationLogoToS3(organizationId, file)
    
    return {
      filename: result.filename,
      publicUrl: result.url
    }
  } catch (error) {
    throw new Error(`Failed to upload logo: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Organization logo existence checking removed - not needed for S3 public URLs

/**
 * Upload a file to S3
 * @param file - The file to upload
 * @param folder - The folder path (replaces bucket concept)
 * @param path - Optional additional path within the folder
 */
export async function uploadFile(
  file: File,
  folder: string,
  path?: string
): Promise<{ url: string; path: string }> {
  try {
    const fullFolder = path ? `${folder}/${path}` : folder
    const result = await uploadFileToS3(file, fullFolder)
    
    return {
      url: result.url,
      path: result.key
    }
  } catch (error) {
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Delete a file from S3 storage
 * @param url - The file URL to delete
 * @param bucket - Unused parameter, kept for compatibility
 */
export async function deleteFile(url: string, bucket?: string): Promise<void> {
  try {
    await deleteFileFromS3ByUrl(url)
  } catch (error) {
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
} 