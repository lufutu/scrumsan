'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Drag Preview/Shadow Component
 * 
 * Creates a visual preview of the dragged task that follows the cursor
 * Similar to the shadows in the Pragmatic Board example
 */

interface DragPreviewProps {
  isDragging: boolean
  dragData?: {
    taskId: string
    title: string
    taskType: string
  }
  children: React.ReactNode
}

export function DragPreview({ isDragging, dragData, children }: DragPreviewProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      console.log('🖱️ Mouse move:', { x: e.clientX, y: e.clientY })
      setPosition({
        x: e.clientX + 10, // Offset slightly from cursor
        y: e.clientY + 10
      })
    }

    console.log('🎯 Setting up mouse move listener for drag preview')
    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    
    return () => {
      console.log('🧹 Cleaning up mouse move listener')
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [isDragging])
  
  // Log position changes
  useEffect(() => {
    console.log('📍 DragPreview position updated:', position)
  }, [position])

  if (!mounted || !isDragging) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        pointerEvents: 'none',
        transform: 'rotate(5deg)',
        opacity: 0.8
      }}
      className="shadow-2xl"
    >
      <div className="bg-white border-2 border-blue-300 rounded-lg p-3 max-w-64">
        {children}
      </div>
    </div>,
    document.body
  )
}

/**
 * Drag Preview Content Component
 * Simple representation of the task being dragged
 */
interface DragPreviewContentProps {
  title: string
  taskType: string
  itemCode?: string
}

export function DragPreviewContent({ title, taskType, itemCode }: DragPreviewContentProps) {
  return (
    <div className="flex items-center space-x-2">
      <div className="w-4 h-4 bg-blue-500 rounded flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {title}
        </div>
        {itemCode && (
          <div className="text-xs text-gray-500">
            {itemCode}
          </div>
        )}
      </div>
    </div>
  )
}