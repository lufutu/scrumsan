import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Create S3 client lazily to ensure environment variables are loaded
function createS3Client() {
  const region = process.env.AWS_REGION
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(`Missing AWS credentials: region=${!!region}, accessKeyId=${!!accessKeyId}, secretAccessKey=${!!secretAccessKey}`)
  }
  
  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

function getBucketName() {
  const bucketName = process.env.AWS_S3_BUCKET
  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET environment variable is not set')
  }
  return bucketName
}

/**
 * Upload a file to S3
 * @param file - The file to upload
 * @param folder - The folder path within the bucket (e.g., 'organizations/logos', 'task-attachments')
 * @param customFileName - Optional custom filename, otherwise generates timestamped name
 */
export async function uploadFileToS3(
  file: File,
  folder: string,
  customFileName?: string
): Promise<{ url: string; path: string; key: string }> {
  // Generate filename
  const timestamp = Date.now()
  const fileExt = file.name.split('.').pop()
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const fileName = customFileName || `${timestamp}_${cleanFileName}`
  
  // Create S3 key (full path in bucket)
  const key = `${folder}/${fileName}`
  
  // Convert File to Buffer
  const buffer = Buffer.from(await file.arrayBuffer())
  
  const bucketName = getBucketName()
  const s3Client = createS3Client()
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: file.type,
    ContentDisposition: 'inline',
    CacheControl: 'max-age=31536000', // 1 year cache
  })
  
  try {
    await s3Client.send(command)
    
    // Generate public URL (note: may not be accessible if bucket blocks public access)
    const region = process.env.AWS_REGION
    const url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`
    
    return {
      url,
      path: key,
      key
    }
  } catch (error) {
    console.error('Error uploading file to S3:', error)
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Delete a file from S3
 * @param key - The S3 key (full path) of the file to delete
 */
export async function deleteFileFromS3(key: string): Promise<void> {
  const bucketName = getBucketName()
  const s3Client = createS3Client()
  
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  })
  
  try {
    await s3Client.send(command)
  } catch (error) {
    console.error('Error deleting file from S3:', error)
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Extract S3 key from URL
 * @param url - The full S3 URL
 */
export function extractS3KeyFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    
    // Handle different S3 URL formats
    if (urlObj.hostname.includes('.s3.') && urlObj.hostname.includes('.amazonaws.com')) {
      // https://bucket.s3.region.amazonaws.com/path/file.jpg
      const key = urlObj.pathname.substring(1); // Remove leading slash
      return key;
    } else if (urlObj.hostname.includes('s3.amazonaws.com')) {
      // https://s3.region.amazonaws.com/bucket/path/file.jpg
      const pathParts = urlObj.pathname.split('/')
      const key = pathParts.slice(2).join('/'); // Remove leading slash and bucket name
      return key;
    }
    
    throw new Error('Invalid S3 URL format')
  } catch (error) {
    throw new Error(`Invalid S3 URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Delete a file using its URL
 * @param url - The full S3 URL of the file
 */
export async function deleteFileFromS3ByUrl(url: string): Promise<void> {
  const key = extractS3KeyFromUrl(url)
  await deleteFileFromS3(key)
}

/**
 * Generate a signed URL for private file access
 * @param key - The S3 key of the file
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 */
export async function getSignedUrlForS3File(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const bucketName = getBucketName()
  const s3Client = createS3Client()
  
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  })
  
  try {
    return await getSignedUrl(s3Client, command, { expiresIn })
  } catch (error) {
    console.error('Error generating signed URL:', error)
    throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Upload organization logo to S3
 * @param organizationId - The organization ID
 * @param file - The logo file
 */
export async function uploadOrganizationLogoToS3(
  organizationId: string,
  file: File
): Promise<{ filename: string; url: string; key: string }> {
  const folder = `organizations/${organizationId}/logos`
  const result = await uploadFileToS3(file, folder)
  
  return {
    filename: result.path.split('/').pop()!,
    url: result.url,
    key: result.key
  }
}

/**
 * Upload board logo to S3
 * @param boardId - The board ID
 * @param file - The logo file
 */
export async function uploadBoardLogoToS3(
  boardId: string,
  file: File
): Promise<{ filename: string; url: string; key: string }> {
  const folder = `boards/${boardId}/logos`
  const result = await uploadFileToS3(file, folder)
  
  return {
    filename: result.path.split('/').pop()!,
    url: result.url,
    key: result.key
  }
}

/**
 * Upload task attachment to S3
 * @param taskId - The task ID
 * @param file - The attachment file
 */
export async function uploadTaskAttachmentToS3(
  taskId: string,
  file: File
): Promise<{ filename: string; url: string; key: string }> {
  const folder = `tasks/${taskId}/attachments`
  const result = await uploadFileToS3(file, folder)
  
  return {
    filename: result.path.split('/').pop()!,
    url: result.url,
    key: result.key
  }
}

/**
 * Upload user avatar to S3
 * @param userId - The user ID
 * @param file - The avatar file
 */
export async function uploadAvatarToS3(
  userId: string,
  file: File
): Promise<{ filename: string; url: string; key: string }> {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`)
  }
  
  // Validate file size (5MB max)
  const maxSizeInBytes = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSizeInBytes) {
    throw new Error(`File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
  }
  
  const folder = `avatars/${userId}`
  
  // Generate a custom filename with timestamp to avoid conflicts
  const timestamp = Date.now()
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const customFileName = `avatar-${timestamp}.${fileExt}`
  
  const result = await uploadFileToS3(file, folder, customFileName)
  
  return {
    filename: result.path.split('/').pop()!,
    url: result.url,
    key: result.key
  }
}

// Legacy compatibility functions for existing code
export const uploadFile = uploadFileToS3
export const deleteFile = deleteFileFromS3ByUrl