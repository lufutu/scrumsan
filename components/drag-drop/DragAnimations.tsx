'use client'

import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'motion/react'

/**
 * Animated card wrapper that provides smooth drag feedback
 */
export function DraggableCard({
  children,
  isDragging,
  className
}: {
  children: React.ReactNode
  isDragging: boolean
  className?: string
}) {
  return (
    <motion.div
      layout
      initial={false}
      animate={{
        scale: isDragging ? 1.05 : 1,
        rotate: isDragging ? 2 : 0,
        opacity: isDragging ? 0.9 : 1,
      }}
      transition={{
        type: "spring",
        damping: 20,
        stiffness: 300
      }}
      className={cn(
        'transition-shadow duration-200',
        isDragging && 'shadow-2xl ring-2 ring-blue-400 ring-opacity-50 z-50',
        className
      )}
    >
      {children}
    </motion.div>
  )
}

/**
 * Smooth reorder animation for list items
 */
export function ReorderItem({
  children,
  id,
  className
}: {
  children: React.ReactNode
  id: string
  className?: string
}) {
  return (
    <motion.div
      layout
      layoutId={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        type: "spring",
        damping: 25,
        stiffness: 300
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Container that animates when items are added/removed
 */
export function AnimatedList({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        layout
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Placeholder that appears when dragging over empty area
 */
export function DragPlaceholder({
  isVisible,
  message = "Drop here",
  className
}: {
  isVisible: boolean
  message?: string
  className?: string
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'flex items-center justify-center p-8 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50/50',
            className
          )}
        >
          <p className="text-blue-600 font-medium animate-pulse">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Visual feedback for valid/invalid drop zones
 */
export function DropZoneFeedback({
  canDrop,
  isOver,
  children,
  className
}: {
  canDrop: boolean
  isOver: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative transition-all duration-200',
        isOver && canDrop && 'ring-2 ring-green-400 bg-green-50/20',
        isOver && !canDrop && 'ring-2 ring-red-400 bg-red-50/20',
        className
      )}
    >
      {children}
      {isOver && !canDrop && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Cannot drop here
          </div>
        </div>
      )}
    </div>
  )
}