import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadAvatarToS3 } from '@/lib/aws/s3'

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}))

// Mock environment variables
const mockEnv = {
  AWS_REGION: 'us-east-1',
  AWS_ACCESS_KEY_ID: 'test-access-key',
  AWS_SECRET_ACCESS_KEY: 'test-secret-key',
  AWS_S3_BUCKET: 'test-bucket',
}

// Mock File.prototype.arrayBuffer
Object.defineProperty(File.prototype, 'arrayBuffer', {
  value: function() {
    return Promise.resolve(new ArrayBuffer(this.size))
  },
  writable: true,
  configurable: true,
})

describe('Avatar Upload S3 Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock environment variables
    Object.entries(mockEnv).forEach(([key, value]) => {
      vi.stubEnv(key, value)
    })
  })

  describe('uploadAvatarToS3', () => {
    it('validates file type correctly', async () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })
      
      await expect(uploadAvatarToS3('user123', invalidFile)).rejects.toThrow(
        'Invalid file type. Allowed types: image/jpeg, image/jpg, image/png, image/webp, image/gif'
      )
    })

    it('validates file size correctly', async () => {
      // Create a file larger than 5MB
      const largeContent = 'x'.repeat(6 * 1024 * 1024) // 6MB
      const largeFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' })
      
      await expect(uploadAvatarToS3('user123', largeFile)).rejects.toThrow(
        'File size exceeds 5MB limit'
      )
    })

    it('accepts valid image files', async () => {
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock successful S3 upload
      const { S3Client } = await import('@aws-sdk/client-s3')
      const mockSend = vi.fn().mockResolvedValue({})
      const mockS3Client = { send: mockSend }
      vi.mocked(S3Client).mockImplementation(() => mockS3Client as any)
      
      const result = await uploadAvatarToS3('user123', validFile)
      
      expect(result).toEqual({
        filename: expect.stringMatching(/^avatar-\d+\.jpg$/),
        url: expect.stringContaining('test-bucket.s3.us-east-1.amazonaws.com/avatars/user123/avatar-'),
        key: expect.stringMatching(/^avatars\/user123\/avatar-\d+\.jpg$/),
      })
      
      expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('generates unique filenames with timestamps', async () => {
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock successful S3 upload
      const { S3Client } = await import('@aws-sdk/client-s3')
      const mockSend = vi.fn().mockResolvedValue({})
      const mockS3Client = { send: mockSend }
      vi.mocked(S3Client).mockImplementation(() => mockS3Client as any)
      
      const result1 = await uploadAvatarToS3('user123', validFile)
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const result2 = await uploadAvatarToS3('user123', validFile)
      
      expect(result1.filename).not.toBe(result2.filename)
      expect(result1.key).not.toBe(result2.key)
    })

    it('handles different image file types', async () => {
      const fileTypes = [
        { type: 'image/jpeg', ext: 'jpg' },
        { type: 'image/png', ext: 'png' },
        { type: 'image/webp', ext: 'webp' },
        { type: 'image/gif', ext: 'gif' },
      ]
      
      // Mock successful S3 upload
      const { S3Client } = await import('@aws-sdk/client-s3')
      const mockSend = vi.fn().mockResolvedValue({})
      const mockS3Client = { send: mockSend }
      vi.mocked(S3Client).mockImplementation(() => mockS3Client as any)
      
      for (const fileType of fileTypes) {
        const file = new File(['image content'], `test.${fileType.ext}`, { type: fileType.type })
        const result = await uploadAvatarToS3('user123', file)
        
        expect(result.filename).toMatch(new RegExp(`avatar-\\d+\\.${fileType.ext}$`))
        expect(result.key).toMatch(new RegExp(`avatars/user123/avatar-\\d+\\.${fileType.ext}$`))
      }
    })

    it('uses correct S3 folder structure', async () => {
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock successful S3 upload
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
      const mockSend = vi.fn().mockResolvedValue({})
      const mockS3Client = { send: mockSend }
      vi.mocked(S3Client).mockImplementation(() => mockS3Client as any)
      
      await uploadAvatarToS3('user123', validFile)
      
      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: expect.stringMatching(/^avatars\/user123\/avatar-\d+\.jpg$/),
          ContentType: 'image/jpeg',
          ContentDisposition: 'inline',
          CacheControl: 'max-age=31536000',
        })
      )
    })

    it('handles S3 upload errors', async () => {
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock S3 upload failure
      const { S3Client } = await import('@aws-sdk/client-s3')
      const mockSend = vi.fn().mockRejectedValue(new Error('S3 upload failed'))
      const mockS3Client = { send: mockSend }
      vi.mocked(S3Client).mockImplementation(() => mockS3Client as unknown)
      
      await expect(uploadAvatarToS3('user123', validFile)).rejects.toThrow(
        'Failed to upload file: S3 upload failed'
      )
    })

    it('handles missing environment variables', async () => {
      // Clear environment variables
      vi.unstubAllEnvs()
      
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      await expect(uploadAvatarToS3('user123', validFile)).rejects.toThrow(
        /AWS.*environment variable/
      )
    })
  })
})