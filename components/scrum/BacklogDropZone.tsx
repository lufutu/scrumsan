"use client"

import { useState, useRef, useEffect } from 'react'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArchiveRestore } from 'lucide-react'
import { DragDataTypes } from '@/lib/optimistic-drag-drop'
import { DropZoneHighlight } from '@/components/drag-drop/DropIndicator'

interface BacklogDropZoneProps {
  isDragOver?: boolean
  draggedTask?: any | null
}

export function BacklogDropZone({
  isDragOver = false,
  draggedTask = null
}: BacklogDropZoneProps) {
  const [isDraggedOver, setIsDraggedOver] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Setup drop target functionality
  useEffect(() => {
    const element = dropRef.current
    if (!element) return

    return dropTargetForElements({
      element,
      canDrop: ({ source }) => DragDataTypes.isTask(source.data),
      getData: () => ({
        type: 'backlog',
        sprintId: null
      }),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: () => {
        setIsDraggedOver(false)
        // Drop handling will be managed by DragDropProvider
      }
    })
  }, [])

  return (
    <div className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 border-dashed w-80 flex-shrink-0">
      <DropZoneHighlight 
        isActive={isDraggedOver || isDragOver} 
        className="h-full"
      >
        <div
          ref={dropRef}
          className={cn(
            "h-full overflow-hidden flex flex-col min-h-[600px]",
            (isDraggedOver || isDragOver) && "bg-blue-50 border-blue-300 border-solid"
          )}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-100/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <h3 className="font-semibold text-lg text-gray-700">Backlog</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                  Drop Zone
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Move tasks here to return them to the Product Backlog
            </p>
          </div>

          {/* Drop Zone Content */}
          <div className="flex-1 p-6 flex items-center justify-center">
            {(isDraggedOver || isDragOver) ? (
              <div className="text-center text-blue-600 animate-pulse">
                <ArchiveRestore className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm font-medium">Drop to move to backlog</p>
                <p className="text-xs mt-1">Task will be removed from this sprint</p>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <ArrowLeft className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Drag tasks here to move them back to the Product Backlog</p>
                <p className="text-xs mt-1 text-gray-300">Tasks dropped here will leave the current sprint</p>
              </div>
            )}
          </div>
        </div>
      </DropZoneHighlight>
    </div>
  )
}