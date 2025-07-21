"use client"

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Upload, X, FileText, Image, Video, Archive, File, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'

export interface QueuedFile {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'completed' | 'error'
  progress: number
  error?: string
  result?: any // Upload result from API
}

interface FileUploadQueueProps {
  onFileUpload: (file: File) => Promise<any>
  onFileRemove?: (fileId: string) => void
  onUploadComplete?: (file: QueuedFile, result: any) => void
  onUploadError?: (file: QueuedFile, error: string) => void
  multiple?: boolean
  accept?: string
  maxSize?: number // in MB
  maxFiles?: number
  disabled?: boolean
  className?: string
  children?: React.ReactNode
  showQueue?: boolean
  autoUpload?: boolean
  autoClearCompleted?: boolean // Clear completed files automatically
  autoClearDelay?: number // Delay in ms before clearing (default 2000)
}

const getFileIcon = (type: string, size: 'sm' | 'md' | 'lg' = 'md') => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  }
  const className = sizeClasses[size]
  
  if (type.startsWith('image/')) return <Image className={className} />
  if (type.startsWith('video/')) return <Video className={className} />
  if (type.includes('pdf')) return <FileText className={className} />
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return <Archive className={className} />
  return <File className={className} />
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const generateFileId = () => `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export function FileUploadQueue({
  onFileUpload,
  onFileRemove,
  onUploadComplete,
  onUploadError,
  multiple = true,
  accept = "*/*",
  maxSize = 50, // 50MB default
  maxFiles = 10,
  disabled = false,
  className,
  children,
  showQueue = true,
  autoUpload = true,
  autoClearCompleted = false,
  autoClearDelay = 2000
}: FileUploadQueueProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileQueue, setFileQueue] = useState<QueuedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  // Track timers for auto-clearing
  const clearTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearTimersRef.current.forEach(timer => clearTimeout(timer))
      clearTimersRef.current.clear()
    }
  }, [])

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    const fileSizeInMB = file.size / (1024 * 1024)
    if (fileSizeInMB > maxSize) {
      return `File size exceeds ${maxSize}MB limit`
    }

    // Check file type if accept is specified
    if (accept !== "*/*") {
      const acceptTypes = accept.split(',').map(type => type.trim())
      const isValidType = acceptTypes.some(acceptType => {
        if (acceptType.startsWith('.')) {
          // File extension check
          return file.name.toLowerCase().endsWith(acceptType.toLowerCase())
        } else if (acceptType.includes('/')) {
          // MIME type check
          if (acceptType.endsWith('/*')) {
            return file.type.startsWith(acceptType.slice(0, -1))
          } else {
            return file.type === acceptType
          }
        }
        return false
      })
      
      if (!isValidType) {
        return `File type not allowed. Accepted types: ${accept}`
      }
    }

    return null
  }, [accept, maxSize])

  const addFilesToQueue = useCallback((files: File[]) => {
    const validFiles: QueuedFile[] = []
    const errors: string[] = []

    for (const file of files) {
      // Check max files limit
      if (fileQueue.length + validFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`)
        break
      }

      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push({
          id: generateFileId(),
          file,
          status: 'pending',
          progress: 0
        })
      }
    }

    // Show errors if any
    if (errors.length > 0) {
      console.error('File validation errors:', errors)
      // You can replace this with toast notifications
    }

    // Add valid files to queue
    if (validFiles.length > 0) {
      setFileQueue(prev => {
        const newQueue = multiple ? [...prev, ...validFiles] : validFiles
        return newQueue
      })
      
      // Auto-upload if enabled (moved outside setFileQueue to avoid dependency issues)
      if (autoUpload) {
        // Use setTimeout to ensure state is updated before uploading
        setTimeout(() => {
          validFiles.forEach(queuedFile => {
            uploadFile(queuedFile.id)
          })
        }, 0)
      }
    }
  }, [fileQueue.length, maxFiles, validateFile, multiple, autoUpload])

  const uploadFile = useCallback(async (fileId: string, currentQueue?: QueuedFile[]) => {
    const queue = currentQueue || fileQueue
    const queuedFile = queue.find(f => f.id === fileId)
    if (!queuedFile || queuedFile.status !== 'pending') return

    // Update status to uploading
    setFileQueue(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'uploading', progress: 0 } : f
    ))

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setFileQueue(prev => prev.map(f => {
          if (f.id === fileId && f.status === 'uploading') {
            const newProgress = Math.min(f.progress + Math.random() * 20, 90)
            return { ...f, progress: newProgress }
          }
          return f
        }))
      }, 200)

      // Call the upload function
      const result = await onFileUpload(queuedFile.file)
      
      // Clear progress interval
      clearInterval(progressInterval)

      // Update to completed
      setFileQueue(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'completed', progress: 100, result }
          : f
      ))

      // Call completion callback
      const updatedFile = { ...queuedFile, status: 'completed' as const, progress: 100, result }
      onUploadComplete?.(updatedFile, result)

      // Auto-clear completed file after delay if enabled
      if (autoClearCompleted) {
        const timer = setTimeout(() => {
          setFileQueue(prev => prev.filter(f => f.id !== fileId))
          clearTimersRef.current.delete(fileId)
        }, autoClearDelay)
        clearTimersRef.current.set(fileId, timer)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      // Update to error
      setFileQueue(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'error', progress: 0, error: errorMessage }
          : f
      ))

      // Call error callback
      const updatedFile = { ...queuedFile, status: 'error' as const, error: errorMessage }
      onUploadError?.(updatedFile, errorMessage)
    }
  }, [fileQueue, onFileUpload, onUploadComplete, onUploadError, autoClearCompleted, autoClearDelay])

  const removeFile = useCallback((fileId: string) => {
    // Clear any pending auto-clear timer
    const timer = clearTimersRef.current.get(fileId)
    if (timer) {
      clearTimeout(timer)
      clearTimersRef.current.delete(fileId)
    }
    
    setFileQueue(prev => prev.filter(f => f.id !== fileId))
    onFileRemove?.(fileId)
  }, [onFileRemove])

  const retryUpload = useCallback((fileId: string) => {
    setFileQueue(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'pending', progress: 0, error: undefined } : f
    ))
    uploadFile(fileId)
  }, [uploadFile])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsDragOver(false)
    dragCounterRef.current = 0
    
    if (disabled) return

    const { files } = e.dataTransfer
    if (files && files.length > 0) {
      addFilesToQueue(Array.from(files))
    }
  }, [disabled, addFilesToQueue])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files))
    }
    // Clear the input value to allow selecting the same file again
    e.target.value = ''
  }, [addFilesToQueue])

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }, [disabled])

  const uploadAllPending = useCallback(() => {
    fileQueue
      .filter(f => f.status === 'pending')
      .forEach(f => uploadFile(f.id))
  }, [fileQueue, uploadFile])

  const clearCompleted = useCallback(() => {
    setFileQueue(prev => prev.filter(f => f.status !== 'completed'))
  }, [])

  const clearAll = useCallback(() => {
    setFileQueue([])
  }, [])

  const pendingCount = fileQueue.filter(f => f.status === 'pending').length
  const uploadingCount = fileQueue.filter(f => f.status === 'uploading').length
  const completedCount = fileQueue.filter(f => f.status === 'completed').length
  const errorCount = fileQueue.filter(f => f.status === 'error').length

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 cursor-pointer",
          "hover:border-primary/50 hover:bg-muted/50",
          isDragOver && "border-primary bg-primary/10 scale-[1.02]",
          disabled && "cursor-not-allowed opacity-50",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        )}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label="File upload area"
      >
        {children ? (
          children
        ) : (
          <div className="flex flex-col items-center justify-center text-center">
            <Upload className={cn(
              "h-10 w-10 mb-4 transition-colors",
              isDragOver ? "text-primary" : "text-muted-foreground"
            )} />
            <p className="text-sm font-medium mb-2">
              {isDragOver ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              or click to browse files
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              {accept !== "*/*" && (
                <p>Accepted types: {accept}</p>
              )}
              <p>Max size: {maxSize}MB per file</p>
              {multiple && <p>Max files: {maxFiles}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Queue controls */}
      {showQueue && fileQueue.length > 0 && (
        <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              {fileQueue.length} file{fileQueue.length !== 1 ? 's' : ''}
            </span>
            {pendingCount > 0 && (
              <span className="text-orange-600">
                {pendingCount} pending
              </span>
            )}
            {uploadingCount > 0 && (
              <span className="text-blue-600">
                {uploadingCount} uploading
              </span>
            )}
            {completedCount > 0 && (
              <span className="text-green-600">
                {completedCount} completed
              </span>
            )}
            {errorCount > 0 && (
              <span className="text-red-600">
                {errorCount} failed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!autoUpload && pendingCount > 0 && (
              <Button size="sm" onClick={uploadAllPending}>
                Upload All
              </Button>
            )}
            {completedCount > 0 && (
              <Button size="sm" variant="outline" onClick={clearCompleted}>
                Clear Completed
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={clearAll}>
              Clear All
            </Button>
          </div>
        </div>
      )}

      {/* File queue */}
      {showQueue && fileQueue.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {fileQueue.map((queuedFile) => (
            <Card key={queuedFile.id} className="border-l-4 border-l-transparent data-[status=uploading]:border-l-blue-500 data-[status=completed]:border-l-green-500 data-[status=error]:border-l-red-500" data-status={queuedFile.status}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-muted-foreground">
                    {getFileIcon(queuedFile.file.type, 'sm')}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{queuedFile.file.name}</p>
                      <div className="flex items-center gap-1">
                        {queuedFile.status === 'completed' && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                        {queuedFile.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(queuedFile.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(queuedFile.file.size)}</span>
                      <span>•</span>
                      <span className={cn(
                        "capitalize",
                        queuedFile.status === 'completed' && "text-green-600",
                        queuedFile.status === 'error' && "text-red-600",
                        queuedFile.status === 'uploading' && "text-blue-600"
                      )}>
                        {queuedFile.status}
                      </span>
                      {queuedFile.status === 'uploading' && (
                        <>
                          <span>•</span>
                          <span>{Math.round(queuedFile.progress)}%</span>
                        </>
                      )}
                    </div>
                    {queuedFile.status === 'uploading' && (
                      <Progress value={queuedFile.progress} className="h-1" />
                    )}
                    {queuedFile.status === 'error' && queuedFile.error && (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-red-600">{queuedFile.error}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => retryUpload(queuedFile.id)}
                          className="h-6 text-xs"
                        >
                          Retry
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}