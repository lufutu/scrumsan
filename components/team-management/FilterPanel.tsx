'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Search, Filter, X, Save, RotateCcw } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { FilterPanelSkeleton } from '@/components/ui/skeleton'
import { ComponentErrorBoundary } from '@/components/ui/error-boundary'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/animate-ui/radix/sheet'
import { Checkbox } from '@/components/ui/checkbox'
import { useCustomRoles } from '@/hooks/useCustomRoles'
import { useProjects } from '@/hooks/useProjects'
import { FilterOptions } from '@/hooks/useTeamMembers'

interface FilterPanelProps {
  organizationId: string
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  onSaveFilter?: (name: string, filters: FilterOptions) => void
  savedFilters?: Array<{ name: string; filters: FilterOptions }>
  onLoadFilter?: (filters: FilterOptions) => void
}

interface HoursRange {
  min: number
  max: number
}

const DEFAULT_ROLES = ['owner', 'admin', 'member']

export function FilterPanel({
  organizationId,
  filters,
  onFiltersChange,
  onSaveFilter,
  savedFilters = [],
  onLoadFilter,
}: FilterPanelProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [saveFilterName, setSaveFilterName] = useState('')

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500) // Increased to 500ms for better performance

  // Fetch custom roles and projects for filter options
  const { roles: customRoles } = useCustomRoles(organizationId)
  const { projects } = useProjects(organizationId)

  // Update search term when filters change externally
  useEffect(() => {
    setSearchTerm(filters.search || '')
  }, [filters.search])

  // Apply debounced search term to filters
  useEffect(() => {
    if (debouncedSearchTerm !== (filters.search || '')) {
      onFiltersChange({
        ...filters,
        search: debouncedSearchTerm.trim() || undefined,
      })
    }
  }, [debouncedSearchTerm, filters, onFiltersChange])

  // Handle search input
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  // Handle role filter changes
  const handleRoleToggle = useCallback((role: string, checked: boolean) => {
    const currentRoles = filters.roles || []
    const newRoles = checked
      ? [...currentRoles, role]
      : currentRoles.filter(r => r !== role)

    onFiltersChange({
      ...filters,
      roles: newRoles.length > 0 ? newRoles : undefined,
    })
  }, [filters, onFiltersChange])

  // Handle project filter changes
  const handleProjectToggle = useCallback((projectId: string, checked: boolean) => {
    const currentProjects = filters.projects || []
    const newProjects = checked
      ? [...currentProjects, projectId]
      : currentProjects.filter(p => p !== projectId)

    onFiltersChange({
      ...filters,
      projects: newProjects.length > 0 ? newProjects : undefined,
    })
  }, [filters, onFiltersChange])

  // Handle hours range changes
  const handleHoursRangeChange = useCallback((
    type: 'totalHours' | 'availabilityHours',
    range: HoursRange | undefined
  ) => {
    onFiltersChange({
      ...filters,
      [type]: range,
    })
  }, [filters, onFiltersChange])

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchTerm('')
    onFiltersChange({})
  }, [onFiltersChange])

  // Save current filter configuration
  const handleSaveFilter = useCallback(() => {
    if (saveFilterName.trim() && onSaveFilter) {
      onSaveFilter(saveFilterName.trim(), filters)
      setSaveFilterName('')
    }
  }, [saveFilterName, filters, onSaveFilter])

  // Count active filters
  const activeFilterCount = [
    filters.roles?.length,
    filters.projects?.length,
    filters.totalHours ? 1 : 0,
    filters.availabilityHours ? 1 : 0,
    filters.search ? 1 : 0,
  ].filter(Boolean).length

  // Get all available roles (default + custom)
  const allRoles = [
    ...DEFAULT_ROLES,
    ...(customRoles?.map(role => role.name) || [])
  ]

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg border">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search members by name, email, or job title..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
            aria-label="Search team members"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Advanced Filters Button */}
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="relative flex-1 sm:flex-none">
                <Filter className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Filters</span>
                <span className="sm:hidden">Filter</span>
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    aria-label={`${activeFilterCount} active filters`}
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md mobile-scroll" aria-describedby="filter-description">
              <SheetHeader>
                <SheetTitle>Filter Members</SheetTitle>
                <SheetDescription id="filter-description">
                  Apply filters to find specific team members
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Saved Filters */}
                {savedFilters.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Saved Filters</Label>
                    <div className="flex flex-wrap gap-2">
                      {savedFilters.map((savedFilter, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => onLoadFilter?.(savedFilter.filters)}
                          className="text-xs"
                        >
                          {savedFilter.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Roles Filter */}
                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium">Roles</legend>
                  <div className="space-y-2" role="group" aria-labelledby="roles-filter-legend">
                    {allRoles.map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${role}`}
                          checked={filters.roles?.includes(role) || false}
                          onCheckedChange={(checked) =>
                            handleRoleToggle(role, checked as boolean)
                          }
                          aria-describedby={`role-${role}-desc`}
                        />
                        <Label
                          htmlFor={`role-${role}`}
                          className="text-sm capitalize cursor-pointer"
                        >
                          {role}
                        </Label>
                        <span id={`role-${role}-desc`} className="sr-only">
                          Filter by {role} role
                        </span>
                      </div>
                    ))}
                  </div>
                </fieldset>

                <Separator />

                {/* Projects Filter */}
                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium">Projects</legend>
                  <div className="space-y-2 max-h-40 overflow-y-auto" role="group" aria-labelledby="projects-filter-legend">
                    {projects?.map((project) => (
                      <div key={project.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`project-${project.id}`}
                          checked={filters.projects?.includes(project.id) || false}
                          onCheckedChange={(checked) =>
                            handleProjectToggle(project.id, checked as boolean)
                          }
                          aria-describedby={`project-${project.id}-desc`}
                        />
                        <Label
                          htmlFor={`project-${project.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {project.name}
                        </Label>
                        <span id={`project-${project.id}-desc`} className="sr-only">
                          Filter by {project.name} project
                        </span>
                      </div>
                    ))}
                    {!projects?.length && (
                      <p className="text-sm text-muted-foreground" role="status">No projects available</p>
                    )}
                  </div>
                </fieldset>

                <Separator />

                {/* Hours Filters */}
                <fieldset className="space-y-4">
                  <legend className="text-sm font-medium">Working Hours</legend>

                  {/* Total Hours Range */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Total Hours per Week</Label>
                    <div className="flex items-center gap-2" role="group" aria-labelledby="total-hours-label">
                      <Input
                        type="number"
                        placeholder="Min"
                        min="0"
                        max="168"
                        value={filters.totalHours?.min || ''}
                        onChange={(e) => {
                          const min = parseInt(e.target.value) || 0
                          const max = filters.totalHours?.max || 168
                          handleHoursRangeChange('totalHours', min || max ? { min, max } : undefined)
                        }}
                        className="w-20"
                        aria-label="Minimum total hours per week"
                      />
                      <span className="text-muted-foreground" aria-hidden="true">to</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        min="0"
                        max="168"
                        value={filters.totalHours?.max || ''}
                        onChange={(e) => {
                          const max = parseInt(e.target.value) || 168
                          const min = filters.totalHours?.min || 0
                          handleHoursRangeChange('totalHours', min || max ? { min, max } : undefined)
                        }}
                        className="w-20"
                        aria-label="Maximum total hours per week"
                      />
                    </div>
                  </div>

                  {/* Available Hours Range */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Available Hours per Week</Label>
                    <div className="flex items-center gap-2" role="group" aria-labelledby="available-hours-label">
                      <Input
                        type="number"
                        placeholder="Min"
                        min="0"
                        max="168"
                        value={filters.availabilityHours?.min || ''}
                        onChange={(e) => {
                          const min = parseInt(e.target.value) || 0
                          const max = filters.availabilityHours?.max || 168
                          handleHoursRangeChange('availabilityHours', min || max ? { min, max } : undefined)
                        }}
                        className="w-20"
                        aria-label="Minimum available hours per week"
                      />
                      <span className="text-muted-foreground" aria-hidden="true">to</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        min="0"
                        max="168"
                        value={filters.availabilityHours?.max || ''}
                        onChange={(e) => {
                          const max = parseInt(e.target.value) || 168
                          const min = filters.availabilityHours?.min || 0
                          handleHoursRangeChange('availabilityHours', min || max ? { min, max } : undefined)
                        }}
                        className="w-20"
                        aria-label="Maximum available hours per week"
                      />
                    </div>
                  </div>
                </fieldset>

                <Separator />

                {/* Save Filter */}
                {onSaveFilter && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Save Current Filter</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Filter name..."
                        value={saveFilterName}
                        onChange={(e) => setSaveFilterName(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveFilter}
                        disabled={!saveFilterName.trim()}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsFilterOpen(false)}
                    className="flex-1"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Clear all filters"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="space-y-2">
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied
          </div>
          <div className="flex flex-wrap gap-2" role="list" aria-label="Active filters">
            {filters.search && (
              <Badge variant="secondary" className="gap-1" role="listitem">
                <span>Search: {filters.search}</span>
                <button
                  type="button"
                  className="w-3 h-3 cursor-pointer hover:text-destructive focus:text-destructive focus:outline-none"
                  onClick={() => onFiltersChange({ ...filters, search: undefined })}
                  aria-label={`Remove search filter: ${filters.search}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {filters.roles?.map((role) => (
              <Badge key={role} variant="secondary" className="gap-1 capitalize" role="listitem">
                <span>Role: {role}</span>
                <button
                  type="button"
                  className="w-3 h-3 cursor-pointer hover:text-destructive focus:text-destructive focus:outline-none"
                  onClick={() => handleRoleToggle(role, false)}
                  aria-label={`Remove role filter: ${role}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}

            {filters.projects?.map((projectId) => {
              const project = projects?.find(p => p.id === projectId)
              return project ? (
                <Badge key={projectId} variant="secondary" className="gap-1" role="listitem">
                  <span>Project: {project.name}</span>
                  <button
                    type="button"
                    className="w-3 h-3 cursor-pointer hover:text-destructive focus:text-destructive focus:outline-none"
                    onClick={() => handleProjectToggle(projectId, false)}
                    aria-label={`Remove project filter: ${project.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ) : null
            })}

            {filters.totalHours && (
              <Badge variant="secondary" className="gap-1" role="listitem">
                <span>Total Hours: {filters.totalHours.min}-{filters.totalHours.max}</span>
                <button
                  type="button"
                  className="w-3 h-3 cursor-pointer hover:text-destructive focus:text-destructive focus:outline-none"
                  onClick={() => handleHoursRangeChange('totalHours', undefined)}
                  aria-label={`Remove total hours filter: ${filters.totalHours.min} to ${filters.totalHours.max} hours`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {filters.availabilityHours && (
              <Badge variant="secondary" className="gap-1" role="listitem">
                <span>Available: {filters.availabilityHours.min}-{filters.availabilityHours.max}</span>
                <button
                  type="button"
                  className="w-3 h-3 cursor-pointer hover:text-destructive focus:text-destructive focus:outline-none"
                  onClick={() => handleHoursRangeChange('availabilityHours', undefined)}
                  aria-label={`Remove availability hours filter: ${filters.availabilityHours.min} to ${filters.availabilityHours.max} hours`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}