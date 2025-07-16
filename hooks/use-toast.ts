"use client"

import { toast as sonnerToast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function toast({ title, description, action }: ToastProps) {
  return sonnerToast(title, {
    description,
    action: action && {
      label: action.label,
      onClick: action.onClick,
    },
  })
}

export function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
  }
}
