"use client"

import * as React from "react"
import { useState } from "react"
import { AvatarUpload } from "@/components/profile/avatar-upload"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { uploadAvatarToS3, deleteFileFromS3ByUrl } from "@/lib/aws/s3"
import { toast } from "sonner"

/**
 * Demo component showcasing the Avatar Upload functionality
 * This demonstrates the complete avatar upload workflow including:
 * - File selection with drag & drop
 * - Image preview and basic cropping
 * - File validation (size, type, dimensions)
 * - S3 upload integration
 * - Progress indicators and error handling
 */
export function AvatarUploadDemo() {
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadHistory, setUploadHistory] = useState<Array<{
    timestamp: Date
    filename: string
    url: string
    size: string
  }>>([])

  // Mock user data for demo
  const mockUser = {
    id: "demo-user-123",
    email: "demo@example.com",
    name: "Demo User"
  }

  const handleUpload = async (file: File): Promise<string> => {
    setIsUploading(true)
    
    try {
      // Simulate network delay for demo purposes
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In a real app, this would upload to S3
      // For demo, we'll create a blob URL
      const result = await uploadAvatarToS3(mockUser.id, file)
      
      // Update current avatar
      setCurrentAvatar(result.url)
      
      // Add to upload history
      setUploadHistory(prev => [{
        timestamp: new Date(),
        filename: result.filename,
        url: result.url,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
      }, ...prev.slice(0, 4)]) // Keep last 5 uploads
      
      return result.url
      
    } catch (error) {
      console.error('Upload failed:', error)
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async (): Promise<void> => {
    if (!currentAvatar) return
    
    try {
      // In a real app, this would delete from S3
      await deleteFileFromS3ByUrl(currentAvatar)
      
      setCurrentAvatar(null)
      toast.success('Avatar removed successfully!')
      
    } catch (error) {
      console.error('Remove failed:', error)
      throw error
    }
  }

  const handleReset = () => {
    setCurrentAvatar(null)
    setUploadHistory([])
    toast.info('Demo reset')
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Avatar Upload Demo</h1>
        <p className="text-muted-foreground">
          Showcase of the Avatar Upload component with drag & drop, cropping, and S3 integration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Avatar Upload Component */}
        <Card>
          <CardHeader>
            <CardTitle>Avatar Upload</CardTitle>
            <CardDescription>
              Upload, preview, and crop your avatar image
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarUpload
              currentAvatar={currentAvatar}
              fallbackSeed={mockUser.email}
              onUpload={handleUpload}
              onRemove={handleRemove}
              maxSize={5}
              allowedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']}
              disabled={isUploading}
              size="2xl"
              enableCropping={true}
              cropAspectRatio={1}
            />
          </CardContent>
        </Card>

        {/* Demo Controls & Info */}
        <div className="space-y-6">
          {/* Current State */}
          <Card>
            <CardHeader>
              <CardTitle>Current State</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Avatar Status:</span>
                <Badge variant={currentAvatar ? "default" : "secondary"}>
                  {currentAvatar ? "Uploaded" : "Using Fallback"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Upload Status:</span>
                <Badge variant={isUploading ? "destructive" : "outline"}>
                  {isUploading ? "Uploading..." : "Ready"}
                </Badge>
              </div>
              
              {currentAvatar && (
                <div className="space-y-1">
                  <span className="text-sm font-medium">Current URL:</span>
                  <p className="text-xs text-muted-foreground break-all">
                    {currentAvatar}
                  </p>
                </div>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReset}
                className="w-full"
              >
                Reset Demo
              </Button>
            </CardContent>
          </Card>

          {/* Upload History */}
          {uploadHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Upload History</CardTitle>
                <CardDescription>
                  Recent avatar uploads (demo only)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {uploadHistory.map((upload, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{upload.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {upload.timestamp.toLocaleTimeString()} • {upload.size}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Drag & drop file upload</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Image preview and cropping</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>File validation (size, type, dimensions)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>AWS S3 integration</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Progress indicators</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Error handling and recovery</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Enhanced avatar fallbacks</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Implementation</CardTitle>
          <CardDescription>
            Key aspects of the Avatar Upload component implementation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">File Validation</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Type validation (JPEG, PNG, WebP, GIF)</li>
                <li>• Size limit enforcement (5MB max)</li>
                <li>• Dimension validation (50x50 minimum)</li>
                <li>• Image integrity checking</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Upload Process</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Progress tracking with visual feedback</li>
                <li>• Error handling with retry options</li>
                <li>• Optimistic UI updates</li>
                <li>• Automatic cleanup of temporary files</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Image Processing</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Canvas-based cropping</li>
                <li>• Aspect ratio preservation</li>
                <li>• Quality optimization</li>
                <li>• Preview generation</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Integration</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• AWS S3 upload utilities</li>
                <li>• Enhanced Avatar component</li>
                <li>• React Query for state management</li>
                <li>• Toast notifications for feedback</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}