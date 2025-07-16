"use client"

import { useState } from "react"
import { useSupabase } from "@/providers/supabase-provider"
import { v4 as uuidv4 } from "uuid"

type FileUploadOptions = {
  bucket: string
  path?: string
  fileTypes?: string[]
  maxSizeMB?: number
}

export function useFileUpload(options: FileUploadOptions) {
  const { supabase } = useSupabase()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const { bucket, path = "", fileTypes, maxSizeMB = 50 } = options

  const uploadFile = async (file: File) => {
    // Reset state
    setIsUploading(true)
    setProgress(0)
    setError(null)

    try {
      // Validate file type if fileTypes is provided
      if (fileTypes && fileTypes.length > 0) {
        const isValidType = fileTypes.includes(file.type)
        if (!isValidType) {
          throw new Error(`Invalid file type. Allowed types: ${fileTypes.join(", ")}`)
        }
      }

      // Validate file size
      const fileSizeInMB = file.size / (1024 * 1024)
      if (fileSizeInMB > maxSizeMB) {
        throw new Error(`File size exceeds the maximum allowed size of ${maxSizeMB}MB`)
      }

      // Generate a unique file name to prevent collisions
      const fileExt = file.name.split(".").pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = path ? `${path}/${fileName}` : fileName

      // Upload the file
      const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        onUploadProgress: (progress) => {
          const percent = Math.round((progress.loaded / progress.total) * 100)
          setProgress(percent)
        },
      })

      if (error) {
        throw error
      }

      // Get the public URL if the bucket is public
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath)

      return {
        path: data.path,
        fullPath: `${bucket}/${data.path}`,
        publicUrl: publicUrlData.publicUrl,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error during file upload"))
      throw err
    } finally {
      setIsUploading(false)
    }
  }

  const deleteFile = async (filePath: string) => {
    try {
      const { error } = await supabase.storage.from(bucket).remove([filePath])

      if (error) {
        throw error
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error during file deletion"))
      throw err
    }
  }

  return {
    uploadFile,
    deleteFile,
    isUploading,
    progress,
    error,
  }
}
