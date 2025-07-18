'use client'

import { useState, useCallback } from 'react'
import { TaskFormData, defaultFormData } from '@/components/scrum/TaskForm'

interface UseTaskFormProps {
  initialData?: Partial<TaskFormData>
  onSuccess?: () => void
}

interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export const useTaskForm = ({ initialData, onSuccess }: UseTaskFormProps = {}) => {
  const [formData, setFormData] = useState<TaskFormData>({
    ...defaultFormData,
    ...initialData
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = useCallback((): ValidationResult => {
    const newErrors: Record<string, string> = {}
    
    // Required field validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    
    // Story points validation
    if (formData.estimationType === 'story_points' && formData.storyPoints < 0) {
      newErrors.storyPoints = 'Story points must be positive'
    }
    
    // Effort units validation
    if (formData.estimationType === 'effort_units' && formData.effortUnits < 0) {
      newErrors.effortUnits = 'Effort units must be positive'
    }
    
    // Custom field validation would go here
    // This could be enhanced to validate custom fields based on their types and constraints
    
    setErrors(newErrors)
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    }
  }, [formData])

  const submitForm = useCallback(async (endpoint: string, additionalData: Record<string, any> = {}) => {
    const validation = validateForm()
    if (!validation.isValid) {
      return { success: false, errors: validation.errors }
    }

    setIsLoading(true)
    try {
      // Transform data for API
      const submitData = {
        ...formData,
        // Map assigneeIds to assignees array (if provided)
        assignees: formData.assigneeIds?.length > 0 ? formData.assigneeIds.map(id => ({ id })) : undefined,
        // Map reviewerIds to reviewers array (if provided)  
        reviewers: formData.reviewerIds?.length > 0 ? formData.reviewerIds.map(id => ({ id })) : undefined,
        // Remove the original arrays to avoid confusion
        assigneeIds: undefined,
        reviewerIds: undefined,
        ...additionalData
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit form')
      }

      const result = await response.json()
      
      // Reset form on success
      setFormData(defaultFormData)
      setErrors({})
      onSuccess?.()
      
      return { success: true, data: result }
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred'
      setErrors({ submit: errorMessage })
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [formData, validateForm, onSuccess])

  const updateForm = useCallback(async (taskId: string, additionalData: Record<string, any> = {}) => {
    const validation = validateForm()
    if (!validation.isValid) {
      return { success: false, errors: validation.errors }
    }

    setIsLoading(true)
    try {
      // Transform data for API (same as submitForm)
      const updateData = {
        ...formData,
        // Map assigneeIds to assignees array (if provided)
        assignees: formData.assigneeIds?.length > 0 ? formData.assigneeIds.map(id => ({ id })) : undefined,
        // Map reviewerIds to reviewers array (if provided)  
        reviewers: formData.reviewerIds?.length > 0 ? formData.reviewerIds.map(id => ({ id })) : undefined,
        // Remove the original arrays to avoid confusion
        assigneeIds: undefined,
        reviewerIds: undefined,
        ...additionalData
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update task')
      }

      const result = await response.json()
      onSuccess?.()
      
      return { success: true, data: result }
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred'
      setErrors({ submit: errorMessage })
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [formData, validateForm, onSuccess])

  const resetForm = useCallback(() => {
    setFormData({ ...defaultFormData, ...initialData })
    setErrors({})
  }, [initialData])

  return {
    formData,
    setFormData,
    errors,
    isLoading,
    validateForm,
    submitForm,
    updateForm,
    resetForm
  }
}