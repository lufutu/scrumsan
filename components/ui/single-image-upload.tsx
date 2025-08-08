'use client';

import * as React from 'react';
import { Upload, X, Image as ImageIcon, Camera } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SingleImageUploadProps {
  value?: string | null; // Current image URL
  onChange: (file: File | null) => void;
  onRemove?: () => void;
  accept?: string;
  maxSize?: number; // in MB
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  showFileName?: boolean;
  aspectRatio?: 'square' | 'landscape' | 'portrait' | 'auto';
  variant?: 'default' | 'compact';
}

export function SingleImageUpload({
  value,
  onChange,
  onRemove,
  accept = 'image/*',
  maxSize = 5,
  disabled = false,
  className,
  placeholder = 'Upload image',
  showFileName = true,
  aspectRatio = 'square',
  variant = 'default',
}: SingleImageUploadProps) {
  const [dragOver, setDragOver] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [currentFile, setCurrentFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Clean up preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file';
    }

    // Check file size
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > maxSize) {
      return `File size must be less than ${maxSize}MB`;
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    // Clean up previous preview
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }

    // Create new preview
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setCurrentFile(file);
    onChange(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemoveImage = () => {
    // Clean up preview
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    
    setPreview(null);
    setCurrentFile(null);
    onChange(null);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Call external remove handler if provided
    onRemove?.();
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  // Determine what image to show
  const displayImage = preview || value;
  const fileName = currentFile?.name || (value ? 'Current image' : '');
  const fileSize = currentFile ? `${(currentFile.size / 1024 / 1024).toFixed(2)} MB` : '';

  // Get aspect ratio classes
  const getAspectRatioClass = () => {
    // For compact variant, don't apply any size constraints
    if (variant === 'compact') {
      return 'aspect-square';
    }
    
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square';
      case 'landscape':
        return 'aspect-video';
      case 'portrait':
        return 'aspect-[3/4]';
      default:
        return 'min-h-[120px]';
    }
  };

  return (
    <div className={cn(variant !== 'compact' && 'space-y-3', className)}>
      {displayImage ? (
        // Image Preview Mode
        <div className="space-y-3">
          <div className="relative group">
            <div
              className={cn(
                'relative overflow-hidden rounded-lg border-2 border-dashed border-gray-200 bg-gray-50',
                getAspectRatioClass(),
                variant !== 'compact' && 'max-w-xs' // Only limit width for default variant
              )}
            >
              <Image
                src={displayImage}
                alt="Preview"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 320px"
              />
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleClick}
                    disabled={disabled}
                  >
                    <Camera className="w-4 h-4 mr-1" />
                    Change
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={handleRemoveImage}
                    disabled={disabled}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Remove button - always visible on mobile */}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full p-0 md:hidden"
              onClick={handleRemoveImage}
              disabled={disabled}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          {/* File info */}
          {showFileName && fileName && variant !== 'compact' && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">{fileName}</p>
              {fileSize && (
                <p className="text-xs text-gray-500">{fileSize}</p>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClick}
                  disabled={disabled}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Change Image
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveImage}
                  disabled={disabled}
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Upload Drop Zone Mode
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg transition-colors cursor-pointer',
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400',
            disabled && 'opacity-50 cursor-not-allowed',
            getAspectRatioClass(),
            variant !== 'compact' && 'min-h-[120px]' // Only apply min-height for default variant
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1">
            {variant === 'compact' ? (
              // Compact variant - just show icon
              <ImageIcon className="w-4 h-4 text-gray-400" />
            ) : (
              // Default variant - full upload UI
              <div className={cn(
                'flex flex-col items-center gap-2',
                dragOver && 'scale-105 transition-transform'
              )}>
                <div className="p-3 rounded-full bg-gray-100">
                  <ImageIcon className="w-6 h-6 text-gray-600" />
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    {dragOver ? 'Drop image here' : placeholder}
                  </p>
                  <p className="text-xs text-gray-500">
                    Drag & drop or click to browse
                  </p>
                  <p className="text-xs text-gray-400">
                    PNG, JPG, WebP or SVG • Max {maxSize}MB
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}