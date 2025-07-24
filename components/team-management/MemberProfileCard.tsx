'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Heart, 
  Users, 
  MessageSquare,
  ExternalLink,
  Eye,
  EyeOff,
  Save,
  X,
  Edit,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MemberProfileSkeleton } from '@/components/ui/skeleton'
import { ComponentErrorBoundary } from '@/components/ui/error-boundary'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { OrganizationMember } from '@/hooks/useTeamMembers'
import { useMemberProfile, ProfileUpdateData } from '@/hooks/useMemberProfile'

import { hasPermission } from '@/lib/permission-utils'
import { EngagementManager } from './EngagementManager'
import { TimeOffManager } from './TimeOffManager'
import { TimelineManager } from './TimelineManager'
import { BoardsTab } from './BoardsTab'

interface MemberProfileCardProps {
  member: OrganizationMember
  isOpen: boolean
  onClose: () => void
  currentUserRole: 'owner' | 'admin' | 'member'
  currentUserId: string
  organizationId: string
  initialTab?: string
  onTabChange?: (tab: string) => void
}

interface ProfileField {
  key: keyof ProfileUpdateData
  label: string
  type: 'text' | 'email' | 'tel' | 'url' | 'date' | 'textarea'
  placeholder?: string
  icon?: React.ComponentType<{ className?: string }>
  validation?: (value: string) => string | null
}

const PROFILE_FIELDS: ProfileField[] = [
  {
    key: 'secondaryEmail',
    label: 'Secondary Email',
    type: 'email',
    placeholder: 'secondary@example.com',
    icon: Mail,
    validation: (value) => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Invalid email format'
      }
      return null
    }
  },
  {
    key: 'phone',
    label: 'Phone',
    type: 'tel',
    placeholder: '+1 (555) 123-4567',
    icon: Phone,
    validation: (value) => {
      if (value && !/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, ''))) {
        return 'Invalid phone number format'
      }
      return null
    }
  },
  {
    key: 'address',
    label: 'Address',
    type: 'textarea',
    placeholder: 'Street address, city, state, country',
    icon: MapPin
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    type: 'url',
    placeholder: 'https://linkedin.com/in/username',
    icon: ExternalLink,
    validation: (value) => {
      if (value && value.trim() && 
          !value.match(/^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-]+\/?$/)) {
        return 'Invalid LinkedIn URL format'
      }
      return null
    }
  },
  {
    key: 'skype',
    label: 'Skype',
    type: 'text',
    placeholder: 'skype.username',
    icon: MessageSquare
  },
  {
    key: 'twitter',
    label: 'Twitter',
    type: 'text',
    placeholder: '@username',
    icon: ExternalLink,
    validation: (value) => {
      if (value && value.trim() && 
          !value.match(/^@?[a-zA-Z0-9_]{1,15}$/)) {
        return 'Invalid Twitter handle format'
      }
      return null
    }
  },
  {
    key: 'birthday',
    label: 'Birthday',
    type: 'date',
    icon: Calendar,
    validation: (value) => {
      if (value) {
        const birthDate = new Date(value)
        const today = new Date()
        if (birthDate > today) {
          return 'Birthday cannot be in the future'
        }
      }
      return null
    }
  },
  {
    key: 'maritalStatus',
    label: 'Marital Status',
    type: 'text',
    placeholder: 'Single, Married, etc.',
    icon: Heart
  },
  {
    key: 'family',
    label: 'Family',
    type: 'textarea',
    placeholder: 'Family information',
    icon: Users
  },
  {
    key: 'other',
    label: 'Other Information',
    type: 'textarea',
    placeholder: 'Additional information',
    icon: User
  }
]

export function MemberProfileCard({
  member,
  isOpen,
  onClose,
  currentUserRole,
  currentUserId,
  organizationId,
  initialTab = 'profile',
  onTabChange,
}: MemberProfileCardProps) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [isEditing, setIsEditing] = useState(false)

  // Handle tab changes with URL updates
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab)
    onTabChange?.(newTab)
  }, [onTabChange])

  // Update tab when initialTab changes
  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])
  const [editingField, setEditingField] = useState<string | null>(null)
  const [formData, setFormData] = useState<ProfileUpdateData>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Hooks
  const {
    profile,
    isLoading: profileLoading,
    updateProfile,
    updateVisibility,
    getFieldVisibility,
    canViewField,
    getDefaultVisibility,
    validateProfileData
  } = useMemberProfile(organizationId, member.id)







  // Permission checks
  const isOwnProfile = currentUserId === member.userId
  const canEditProfile = isOwnProfile || 
    hasPermission(currentUserRole, member.permissionSet?.permissions || null, 'teamMembers.manageAll')

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        secondaryEmail: profile.secondaryEmail,
        address: profile.address,
        phone: profile.phone,
        linkedin: profile.linkedin,
        skype: profile.skype,
        twitter: profile.twitter,
        birthday: profile.birthday,
        maritalStatus: profile.maritalStatus,
        family: profile.family,
        other: profile.other,
      })
    } else if (!profileLoading) {
      // Initialize with default values if no profile exists
      setFormData(getDefaultVisibility())
    }
  }, [profile, profileLoading, getDefaultVisibility])

  // Handle field value change
  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value || null }))
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }))
    }
  }, [fieldErrors])

  // Validate single field
  const validateField = useCallback((field: ProfileField, value: string): string | null => {
    if (!field.validation) return null
    return field.validation(value)
  }, [])

  // Handle field save
  const handleFieldSave = useCallback(async (field: ProfileField) => {
    const value = formData[field.key] as string
    const error = validateField(field, value || '')
    
    if (error) {
      setFieldErrors(prev => ({ ...prev, [field.key]: error }))
      return
    }

    setIsSaving(true)
    try {
      await updateProfile({ [field.key]: value })
      setEditingField(null)
      toast.success(`${field.label} updated successfully`)
    } catch (error: unknown) {
      toast.error(error.message || `Failed to update ${field.label.toLowerCase()}`)
    } finally {
      setIsSaving(false)
    }
  }, [formData, validateField, updateProfile])

  // Handle visibility change
  const handleVisibilityChange = useCallback(async (field: string, visibility: 'admin' | 'member') => {
    try {
      await updateVisibility(field, visibility)
      toast.success('Visibility updated')
    } catch (error: unknown) {
      toast.error(error.message || 'Failed to update visibility')
    }
  }, [updateVisibility])

  // Handle bulk save
  const handleBulkSave = useCallback(async () => {
    const errors = validateProfileData(formData)
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error))
      return
    }

    setIsSaving(true)
    try {
      await updateProfile(formData)
      setIsEditing(false)
      toast.success('Profile updated successfully')
    } catch (error: unknown) {
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }, [formData, validateProfileData, updateProfile])

  // Calculate availability
  const calculateAvailability = useCallback((): number => {
    const totalHours = member.workingHoursPerWeek
    const engagedHours = member.engagements
      .filter(e => e.isActive)
      .reduce((sum, e) => sum + e.hoursPerWeek, 0)
    return Math.max(0, totalHours - engagedHours)
  }, [member])



  // Render profile field
  const renderProfileField = useCallback((field: ProfileField) => {
    const value = formData[field.key] as string || ''
    const fieldVisibility = getFieldVisibility(field.key)
    const canView = canViewField(field.key, currentUserRole)
    const isFieldEditing = editingField === field.key
    const fieldError = fieldErrors[field.key]
    const Icon = field.icon

    if (!canView) {
      return null
    }

    return (
      <div key={field.key} className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
            <Label className="text-sm font-medium">{field.label}</Label>
            {canEditProfile && (
              <Select
                value={fieldVisibility}
                onValueChange={(value: 'admin' | 'member') => 
                  handleVisibilityChange(field.key, value)
                }
              >
                <SelectTrigger className="w-20 h-6 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      All
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-1">
                      <EyeOff className="w-3 h-3" />
                      Admin
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          {canEditProfile && !isEditing && !isFieldEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingField(field.key)}
              className="h-6 px-2"
            >
              <Edit className="w-3 h-3" />
            </Button>
          )}
        </div>

        {isFieldEditing ? (
          <div className="space-y-2">
            {field.type === 'textarea' ? (
              <Textarea
                value={value}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className={fieldError ? 'border-destructive' : ''}
                rows={3}
              />
            ) : (
              <Input
                type={field.type}
                value={value}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className={fieldError ? 'border-destructive' : ''}
              />
            )}
            
            {fieldError && (
              <p className="text-sm text-destructive">{fieldError}</p>
            )}
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleFieldSave(field)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingField(null)
                  setFieldErrors(prev => ({ ...prev, [field.key]: '' }))
                }}
              >
                <X className="w-3 h-3" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="min-h-[2rem] flex items-center">
            {value ? (
              <span className="text-sm">
                {field.type === 'date' && value 
                  ? format(new Date(value), 'MMM dd, yyyy')
                  : value
                }
              </span>
            ) : (
              <span className="text-sm text-muted-foreground italic">
                Not provided
              </span>
            )}
          </div>
        )}
      </div>
    )
  }, [
    formData,
    getFieldVisibility,
    canViewField,
    currentUserRole,
    editingField,
    fieldErrors,
    canEditProfile,
    isEditing,
    handleFieldChange,
    handleFieldSave,
    handleVisibilityChange,
    isSaving
  ])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <EnhancedAvatar
              src={member.user.avatarUrl}
              fallbackSeed={member.user.email || member.user.fullName || 'user'}
              size="xl"
              className="w-12 h-12 shrink-0"
              alt={member.user.fullName || member.user.email}
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold truncate">
                {member.user.fullName || member.user.email}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs capitalize">
                  {member.role}
                </Badge>
                {member.jobTitle && (
                  <span className="text-sm text-muted-foreground truncate">
                    {member.jobTitle}
                  </span>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-1 h-auto p-1">
            <TabsTrigger 
              value="profile" 
              className="text-xs sm:text-sm px-2 sm:px-3 py-2"
              aria-label="Profile tab"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger 
              value="engagements" 
              className="text-xs sm:text-sm px-2 sm:px-3 py-2"
              aria-label="Engagements tab"
            >
              <span className="hidden sm:inline">Engagements</span>
              <span className="sm:hidden">Engage</span>
            </TabsTrigger>
            <TabsTrigger 
              value="timeoff" 
              className="text-xs sm:text-sm px-2 sm:px-3 py-2"
              aria-label="Time off tab"
            >
              <span className="hidden sm:inline">Time Off</span>
              <span className="sm:hidden">Time</span>
            </TabsTrigger>
            <TabsTrigger 
              value="timeline" 
              className="text-xs sm:text-sm px-2 sm:px-3 py-2"
              aria-label="Timeline tab"
            >
              Timeline
            </TabsTrigger>
            <TabsTrigger 
              value="boards" 
              className="text-xs sm:text-sm px-2 sm:px-3 py-2"
              aria-label="Boards tab"
            >
              Boards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Contact & Personal Information</h3>
              {canEditProfile && !editingField && (
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        onClick={handleBulkSave}
                        disabled={isSaving}
                        aria-describedby="save-all-desc"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save All
                      </Button>
                      <span id="save-all-desc" className="sr-only">
                        Save all profile changes
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(false)}
                        aria-label="Cancel profile editing"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      aria-label="Edit profile information"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {profileLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-muted rounded w-24" />
                    <div className="h-9 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-6">
                {PROFILE_FIELDS.map(renderProfileField)}
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="font-medium">Working Hours</Label>
                <p className="text-muted-foreground">
                  {member.workingHoursPerWeek}h per week
                </p>
              </div>
              <div>
                <Label className="font-medium">Available Hours</Label>
                <p className="text-muted-foreground">
                  {calculateAvailability()}h per week
                </p>
              </div>
              {member.joinDate && (
                <div>
                  <Label className="font-medium">Join Date</Label>
                  <p className="text-muted-foreground">
                    {format(new Date(member.joinDate), 'MMM dd, yyyy')}
                  </p>
                </div>
              )}
              <div>
                <Label className="font-medium">Member Since</Label>
                <p className="text-muted-foreground">
                  {format(new Date(member.createdAt), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="engagements" className="space-y-4 mt-6">
            <EngagementManager
              member={member}
              organizationId={organizationId}
              canEdit={canEditProfile}
            />
          </TabsContent>

          <TabsContent value="timeoff" className="space-y-4 mt-6">
            <TimeOffManager
              member={member}
              organizationId={organizationId}
              canEdit={canEditProfile}
            />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4 mt-6">
            <TimelineManager
              member={member}
              organizationId={organizationId}
              canEdit={canEditProfile}
            />
          </TabsContent>

          <TabsContent value="boards" className="space-y-4 mt-6">
            <BoardsTab
              member={member}
              organizationId={organizationId}
              currentUserRole={currentUserRole}
              canEdit={canEditProfile}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}