'use client'

import React, { useState, useCallback } from 'react'
import { 
  AlertTriangle, 
  Trash2, 
  UserX, 
  LogOut, 
  Shield, 
  Archive,
  X,
  CheckCircle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/animate-ui/radix/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'destructive' | 'warning' | 'info'
  requireConfirmation?: boolean
  confirmationText?: string
  confirmationPlaceholder?: string
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
  icon?: React.ReactNode
  additionalInfo?: React.ReactNode
  checkboxes?: Array<{
    id: string
    label: string
    required?: boolean
    defaultChecked?: boolean
  }>
}

const variantConfig = {
  destructive: {
    icon: AlertTriangle,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100',
    confirmButtonVariant: 'destructive' as const,
    borderColor: 'border-red-200'
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-600',
    iconBg: 'bg-yellow-100',
    confirmButtonVariant: 'default' as const,
    borderColor: 'border-yellow-200'
  },
  info: {
    icon: CheckCircle,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    confirmButtonVariant: 'default' as const,
    borderColor: 'border-blue-200'
  }
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive',
  requireConfirmation = false,
  confirmationText,
  confirmationPlaceholder = 'Type to confirm',
  onConfirm,
  isLoading = false,
  icon,
  additionalInfo,
  checkboxes = []
}: ConfirmationDialogProps) {
  const [confirmationInput, setConfirmationInput] = useState('')
  const [checkboxStates, setCheckboxStates] = useState<Record<string, boolean>>(
    checkboxes.reduce((acc, checkbox) => ({
      ...acc,
      [checkbox.id]: checkbox.defaultChecked || false
    }), {})
  )

  const config = variantConfig[variant]
  const IconComponent = icon || config.icon

  // Check if confirmation is valid
  const isConfirmationValid = !requireConfirmation || 
    (confirmationText && confirmationInput.trim() === confirmationText.trim())

  // Check if all required checkboxes are checked
  const areRequiredCheckboxesChecked = checkboxes
    .filter(checkbox => checkbox.required)
    .every(checkbox => checkboxStates[checkbox.id])

  const canConfirm = isConfirmationValid && areRequiredCheckboxesChecked && !isLoading

  const handleConfirm = useCallback(async () => {
    if (!canConfirm) return

    try {
      await onConfirm()
    } catch (error) {
      // Error handling is done by the parent component
      console.error('Confirmation action failed:', error)
    }
  }, [canConfirm, onConfirm])

  const handleCheckboxChange = useCallback((checkboxId: string, checked: boolean) => {
    setCheckboxStates(prev => ({
      ...prev,
      [checkboxId]: checked
    }))
  }, [])

  // Reset state when dialog closes
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setConfirmationInput('')
      setCheckboxStates(
        checkboxes.reduce((acc, checkbox) => ({
          ...acc,
          [checkbox.id]: checkbox.defaultChecked || false
        }), {})
      )
    }
    onOpenChange(open)
  }, [onOpenChange, checkboxes])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full ${config.iconBg} ${config.borderColor} border`}>
              <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <DialogTitle className="text-lg font-semibold">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Additional info */}
          {additionalInfo && (
            <div className={`p-3 rounded-lg border ${config.borderColor} bg-gray-50`}>
              {additionalInfo}
            </div>
          )}

          {/* Checkboxes */}
          {checkboxes.length > 0 && (
            <div className="space-y-3">
              {checkboxes.map((checkbox) => (
                <div key={checkbox.id} className="flex items-start gap-3">
                  <Checkbox
                    id={checkbox.id}
                    checked={checkboxStates[checkbox.id]}
                    onCheckedChange={(checked) => 
                      handleCheckboxChange(checkbox.id, checked as boolean)
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label 
                      htmlFor={checkbox.id} 
                      className="text-sm font-medium cursor-pointer"
                    >
                      {checkbox.label}
                      {checkbox.required && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Required
                        </Badge>
                      )}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Confirmation input */}
          {requireConfirmation && confirmationText && (
            <div className="space-y-2">
              <Label htmlFor="confirmation" className="text-sm font-medium">
                Type <code className="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono">
                  {confirmationText}
                </code> to confirm:
              </Label>
              <Input
                id="confirmation"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder={confirmationPlaceholder}
                className={
                  requireConfirmation && confirmationInput && !isConfirmationValid
                    ? 'border-red-300 focus:border-red-500'
                    : ''
                }
                autoComplete="off"
                spellCheck={false}
              />
              {requireConfirmation && confirmationInput && !isConfirmationValid && (
                <p className="text-xs text-red-600">
                  Text doesn't match. Please type exactly: {confirmationText}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>
          <Button
            variant={config.confirmButtonVariant}
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Specialized confirmation dialogs for common use cases
interface MemberRemovalConfirmationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberName: string
  isOwnAccount?: boolean
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
  additionalActions?: React.ReactNode
}

export function MemberRemovalConfirmation({
  open,
  onOpenChange,
  memberName,
  isOwnAccount = false,
  onConfirm,
  isLoading = false,
  additionalActions
}: MemberRemovalConfirmationProps) {
  const title = isOwnAccount ? 'Leave Organization' : 'Remove Member'
  const description = isOwnAccount
    ? `Are you sure you want to leave this organization? You will lose access to all projects and data.`
    : `Are you sure you want to remove ${memberName} from this organization? This action cannot be undone.`

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmText={isOwnAccount ? 'Leave Organization' : 'Remove Member'}
      variant="destructive"
      requireConfirmation={true}
      confirmationText={isOwnAccount ? 'LEAVE' : 'REMOVE'}
      onConfirm={onConfirm}
      isLoading={isLoading}
      icon={isOwnAccount ? <LogOut className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
      additionalInfo={additionalActions}
    />
  )
}

interface PermissionSetDeletionConfirmationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  permissionSetName: string
  memberCount: number
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}

export function PermissionSetDeletionConfirmation({
  open,
  onOpenChange,
  permissionSetName,
  memberCount,
  onConfirm,
  isLoading = false
}: PermissionSetDeletionConfirmationProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Permission Set"
      description={`Are you sure you want to delete the "${permissionSetName}" permission set? ${memberCount > 0 ? `${memberCount} member${memberCount === 1 ? '' : 's'} will be reassigned to default permissions.` : ''}`}
      confirmText="Delete Permission Set"
      variant="destructive"
      requireConfirmation={true}
      confirmationText="DELETE"
      onConfirm={onConfirm}
      isLoading={isLoading}
      icon={<Shield className="w-5 h-5" />}
      additionalInfo={
        memberCount > 0 ? (
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4" />
            <span>
              {memberCount} member{memberCount === 1 ? '' : 's'} will be affected
            </span>
          </div>
        ) : undefined
      }
    />
  )
}

interface DataDeletionConfirmationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  itemType: string
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
  additionalWarnings?: string[]
}

export function DataDeletionConfirmation({
  open,
  onOpenChange,
  itemName,
  itemType,
  onConfirm,
  isLoading = false,
  additionalWarnings = []
}: DataDeletionConfirmationProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${itemType}`}
      description={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
      confirmText={`Delete ${itemType}`}
      variant="destructive"
      requireConfirmation={true}
      confirmationText="DELETE"
      onConfirm={onConfirm}
      isLoading={isLoading}
      icon={<Trash2 className="w-5 h-5" />}
      additionalInfo={
        additionalWarnings.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              <span>Additional effects:</span>
            </div>
            <ul className="text-sm text-amber-700 space-y-1 ml-6">
              {additionalWarnings.map((warning, index) => (
                <li key={index} className="list-disc">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        ) : undefined
      }
    />
  )
}