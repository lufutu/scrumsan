"use client"

import * as React from "react"
import { useState, useRef, useCallback, useMemo } from "react"
import { Upload, X, Camera, Crop, RotateCw, Check, AlertCircle } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { EnhancedAvatar } from "@/components/ui/enhanced-avatar"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { 
  handleAvatarError, 
  validateAvatarFile, 
  createAvatarRetryFunction,
  AvatarErrorType 
} from "@/lib/avatar-error-handling"

export interface AvatarUploadProps {
  /**
   * Current avatar URL
   */
  currentAvatar?: string | null
  
  /**
   * Fallback seed for generating avatar when no image is provided
   */
  fallbackSeed: string
  
  /**
   * Upload handler that returns the uploaded file URL
   */
  onUpload: (file: File) => Promise<string>
  
  /**
   * Remove handler for removing current avatar
   */
  onRemove: () => Promise<void>
  
  /**
   * Maximum file size in MB
   */
  maxSize?: number
  
  /**
   * Allowed file types
   */
  allowedTypes?: string[]
  
  /**
   * Whether the component is disabled
   */
  disabled?: boolean
  
  /**
   * Custom class name
   */
  className?: string
  
  /**
   * Size variant for the avatar preview
   */
  size?: "sm" | "md" | "lg" | "xl" | "2xl"
  
  /**
   * Whether to show the cropping interface
   */
  enableCropping?: boolean
  
  /**
   * Aspect ratio for cropping (1 = square, 16/9 = landscape, etc.)
   */
  cropAspectRatio?: number
  
  /**
   * Maximum number of retry attempts for failed uploads
   */
  maxRetries?: number
  
  /**
   * Whether to show detailed error messages
   */
  showDetailedErrors?: boolean
  
  /**
   * Custom error handler
   */
  onError?: (error: Error, context: string) => void
}

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error' | 'retrying'
  progress: number
  error?: string
  retryCount?: number
  canRetry?: boolean
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_MB = 5

export function AvatarUpload({
  currentAvatar,
  fallbackSeed,
  onUpload,
  onRemove,
  maxSize = MAX_SIZE_MB,
  allowedTypes = ALLOWED_TYPES,
  disabled = false,
  className,
  size = "xl",
  enableCropping = true,
  cropAspectRatio = 1, // Square by default
  maxRetries = 3,
  showDetailedErrors = true,
  onError,
}: AvatarUploadProps) {
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>({ 
    status: 'idle', 
    progress: 0, 
    retryCount: 0,
    canRetry: true
  })
  const [showCropper, setShowCropper] = useState(false)
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Clean up preview URL on unmount or when file changes
  React.useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const validateFile = useCallback(async (file: File): Promise<string | null> => {
    // Use the centralized validation function
    const validationError = validateAvatarFile(file, {
      maxSize,
      allowedTypes
    })

    if (validationError) {
      return validationError.message
    }

    // Check if it's actually an image by trying to create an image element
    return new Promise<string | null>((resolve) => {
      const img = new Image()
      img.onload = () => {
        // Check minimum dimensions
        if (img.width < 50 || img.height < 50) {
          resolve('Image must be at least 50x50 pixels')
        } else {
          resolve(null)
        }
        URL.revokeObjectURL(img.src)
      }
      img.onerror = () => {
        resolve('Invalid image file')
        URL.revokeObjectURL(img.src)
      }
      img.src = URL.createObjectURL(file)
    })
  }, [allowedTypes, maxSize])

  const handleFileSelect = useCallback(async (file: File) => {
    const error = await validateFile(file)
    if (error) {
      toast.error(error)
      return
    }

    // Clean up previous preview
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }

    // Create new preview
    const newPreviewUrl = URL.createObjectURL(file)
    setPreviewUrl(newPreviewUrl)
    setSelectedFile(file)
    
    // Show cropper if enabled
    if (enableCropping) {
      setShowCropper(true)
    }
  }, [validateFile, previewUrl, enableCropping])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [disabled, handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }, [disabled])

  const cropImage = useCallback(async (file: File, cropArea: CropArea): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current
      const img = new Image()
      
      img.onload = () => {
        if (!canvas) {
          reject(new Error('Canvas not available'))
          return
        }
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }

        // Calculate actual crop dimensions based on image size
        const scaleX = img.naturalWidth / img.width
        const scaleY = img.naturalHeight / img.height
        
        const cropX = cropArea.x * scaleX
        const cropY = cropArea.y * scaleY
        const cropWidth = cropArea.width * scaleX
        const cropHeight = cropArea.height * scaleY

        // Set canvas size to crop size
        canvas.width = cropWidth
        canvas.height = cropHeight

        // Draw cropped image
        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        )

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create cropped image'))
            return
          }
          
          // Create new file from blob
          const croppedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          })
          
          resolve(croppedFile)
        }, file.type, 0.9)
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image for cropping'))
      }
      
      img.src = URL.createObjectURL(file)
    })
  }, [])

  const handleUpload = useCallback(async (isRetry = false) => {
    if (!selectedFile) return

    const currentRetryCount = isRetry ? (uploadState.retryCount || 0) + 1 : 0
    const canRetry = currentRetryCount < maxRetries

    setUploadState({ 
      status: isRetry ? 'retrying' : 'uploading', 
      progress: 0,
      retryCount: currentRetryCount,
      canRetry,
      error: undefined
    })

    let progressInterval: NodeJS.Timeout | null = null

    try {
      let fileToUpload = selectedFile

      // Apply cropping if enabled and crop area is set
      if (enableCropping && showCropper) {
        try {
          fileToUpload = await cropImage(selectedFile, cropArea)
        } catch (cropError) {
          throw new Error(`Image cropping failed: ${cropError instanceof Error ? cropError.message : 'Unknown error'}`)
        }
      }

      // Simulate progress updates
      progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 20, 90)
        }))
      }, 200)

      // Upload the file with timeout
      const uploadPromise = onUpload(fileToUpload)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
      })

      const uploadedUrl = await Promise.race([uploadPromise, timeoutPromise])
      
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      
      setUploadState({ 
        status: 'success', 
        progress: 100,
        retryCount: currentRetryCount,
        canRetry: false
      })
      
      // Clean up
      setSelectedFile(null)
      setShowCropper(false)
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      
      toast.success('Avatar uploaded successfully!')
      
    } catch (error) {
      if (progressInterval) {
        clearInterval(progressInterval)
      }

      // Use centralized error handling
      const avatarError = handleAvatarError(error, 'upload', {
        showToast: false, // We'll handle toast manually
        logError: true
      })
      
      setUploadState({ 
        status: 'error', 
        progress: 0, 
        error: avatarError.message,
        retryCount: currentRetryCount,
        canRetry: canRetry && avatarError.canRetry
      })

      // Call custom error handler
      onError?.(error instanceof Error ? error : new Error(avatarError.message), 'upload')

      // Show appropriate error message
      if (canRetry && avatarError.canRetry) {
        toast.error(`Upload failed (attempt ${currentRetryCount + 1}/${maxRetries}). ${avatarError.message}`, {
          action: {
            label: 'Retry',
            onClick: () => handleUpload(true)
          }
        })
      } else if (showDetailedErrors) {
        toast.error(`Upload failed: ${avatarError.message}`)
      } else {
        toast.error('Failed to upload avatar. Please try again.')
      }
    }
  }, [selectedFile, enableCropping, showCropper, cropArea, cropImage, onUpload, previewUrl, uploadState.retryCount, maxRetries, onError, showDetailedErrors])

  const handleRemove = useCallback(async () => {
    if (!currentAvatar) return

    try {
      await onRemove()
      toast.success('Avatar removed successfully!')
    } catch (error) {
      toast.error('Failed to remove avatar')
    }
  }, [currentAvatar, onRemove])

  const handleCancel = useCallback(() => {
    setSelectedFile(null)
    setShowCropper(false)
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setUploadState({ status: 'idle', progress: 0 })
  }, [previewUrl])

  const displayImage = previewUrl || currentAvatar

  return (
    <div className={cn("space-y-4", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
      
      {/* Hidden canvas for cropping */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Avatar Preview */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <EnhancedAvatar
            src={displayImage}
            fallbackSeed={fallbackSeed}
            size={size}
            className="border-4 border-background shadow-lg"
          />
          
          {/* Upload status overlay */}
          {uploadState.status === 'uploading' && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <div className="text-white text-center">
                <div className="text-xs font-medium mb-1">
                  {Math.round(uploadState.progress)}%
                </div>
                <Progress 
                  value={uploadState.progress} 
                  className="w-12 h-1"
                />
              </div>
            </div>
          )}
          
          {/* Success indicator */}
          {uploadState.status === 'success' && (
            <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
          
          {/* Error indicator */}
          {uploadState.status === 'error' && (
            <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1">
              <AlertCircle className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClick}
            disabled={disabled || uploadState.status === 'uploading'}
          >
            <Camera className="w-4 h-4 mr-1" />
            {currentAvatar ? 'Change' : 'Upload'}
          </Button>
          
          {currentAvatar && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={disabled || uploadState.status === 'uploading'}
            >
              <X className="w-4 h-4 mr-1" />
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Drop Zone (shown when no image selected) */}
      {!selectedFile && !currentAvatar && (
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg transition-colors cursor-pointer p-6',
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <div className="flex flex-col items-center text-center">
            <div className={cn(
              'flex flex-col items-center gap-2',
              dragOver && 'scale-105 transition-transform'
            )}>
              <div className="p-3 rounded-full bg-gray-100">
                <Upload className="w-6 h-6 text-gray-600" />
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">
                  {dragOver ? 'Drop avatar here' : 'Upload avatar'}
                </p>
                <p className="text-xs text-gray-500">
                  Drag & drop or click to browse
                </p>
                <p className="text-xs text-gray-400">
                  {allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} • Max {maxSize}MB
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview and Cropping Interface */}
      {selectedFile && previewUrl && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Preview & Crop</h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={uploadState.status === 'uploading'}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleUpload(false)}
                    disabled={uploadState.status === 'uploading' || uploadState.status === 'retrying'}
                  >
                    {uploadState.status === 'uploading' || uploadState.status === 'retrying' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                        {uploadState.status === 'retrying' ? 'Retrying...' : 'Uploading...'}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-1" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Image Preview */}
              <div className="relative max-w-sm mx-auto">
                <Image
                  ref={imageRef}
                  src={previewUrl}
                  alt="Avatar preview"
                  width={300}
                  height={300}
                  className="rounded-lg object-cover"
                />
                
                {/* Basic crop overlay (simplified for now) */}
                {enableCropping && showCropper && (
                  <div className="absolute inset-4 border-2 border-white border-dashed rounded-lg pointer-events-none">
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-gray-400 rounded-full"></div>
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-gray-400 rounded-full"></div>
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-gray-400 rounded-full"></div>
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-gray-400 rounded-full"></div>
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              {/* Upload Progress */}
              {(uploadState.status === 'uploading' || uploadState.status === 'retrying') && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      {uploadState.status === 'retrying' 
                        ? `Retrying... (${(uploadState.retryCount || 0) + 1}/${maxRetries})`
                        : 'Uploading...'
                      }
                    </span>
                    <span>{Math.round(uploadState.progress)}%</span>
                  </div>
                  <Progress value={uploadState.progress} />
                </div>
              )}

              {/* Error Message with Retry Option */}
              {uploadState.status === 'error' && uploadState.error && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-red-800 mb-1">
                        Upload Failed
                      </p>
                      <p className="text-sm text-red-700">
                        {showDetailedErrors ? uploadState.error : 'Please try again or contact support if the problem persists.'}
                      </p>
                      {uploadState.retryCount && uploadState.retryCount > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          Attempted {uploadState.retryCount} time{uploadState.retryCount > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {uploadState.canRetry && (
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpload(true)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Retry Upload ({(uploadState.retryCount || 0) + 1}/{maxRetries})
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}