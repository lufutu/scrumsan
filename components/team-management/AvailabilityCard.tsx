'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Calendar, Clock, Users, AlertTriangle } from 'lucide-react'
import { useAvailability } from '../../hooks/useAvailability'
import { formatHours, formatUtilization } from '../../lib/availability-utils'

interface AvailabilityCardProps {
  organizationId: string
  memberId: string
  memberName: string
  workingHoursPerWeek?: number
  showDetails?: boolean
}

/**
 * Component that displays member availability information using the availability utilities
 */
export function AvailabilityCard({
  organizationId,
  memberId,
  memberName,
  workingHoursPerWeek = 40,
  showDetails = true
}: AvailabilityCardProps) {
  const {
    availability,
    isLoading,
    error,
    availabilitySummary,
    availabilityStatus,
    upcomingEngagements,
    endingEngagements
  } = useAvailability({
    organizationId,
    memberId,
    workingHoursPerWeek
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {memberName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-2 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            {memberName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load availability data</p>
        </CardContent>
      </Card>
    )
  }

  if (!availability) {
    return null
  }

  const status = availabilityStatus!
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {memberName}
          </div>
          <Badge 
            variant={status.status === 'available' ? 'default' : 'secondary'}
            style={{ backgroundColor: status.color, color: 'white' }}
          >
            {status.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Availability Summary */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          <span>{availabilitySummary}</span>
        </div>

        {/* Utilization Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Utilization</span>
            <span>{formatUtilization(availability.utilizationPercentage)}</span>
          </div>
          <Progress 
            value={Math.min(availability.utilizationPercentage, 100)} 
            className="h-2"
          />
        </div>

        {/* Hours Breakdown */}
        {showDetails && (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium">{formatHours(availability.totalHours)}</div>
              <div className="text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{formatHours(availability.engagedHours)}</div>
              <div className="text-gray-500">Engaged</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{formatHours(availability.availableHours)}</div>
              <div className="text-gray-500">Available</div>
            </div>
          </div>
        )}

        {/* Time-off Information */}
        {availability.isCurrentlyOnTimeOff && (
          <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 p-2 rounded">
            <Calendar className="h-4 w-4" />
            <span>Currently on time-off</span>
          </div>
        )}

        {/* Upcoming Time-off */}
        {availability.upcomingTimeOff.length > 0 && (
          <div className="text-sm">
            <div className="font-medium mb-1">Upcoming Time-off:</div>
            {availability.upcomingTimeOff.slice(0, 2).map((timeOff, index) => (
              <div key={index} className="text-gray-600 text-xs">
                {timeOff.type.replace('_', ' ')} - {timeOff.startDate.toLocaleDateString()}
              </div>
            ))}
          </div>
        )}

        {/* Engagement Alerts */}
        {showDetails && (
          <>
            {upcomingEngagements.length > 0 && (
              <div className="text-sm">
                <div className="font-medium mb-1 text-blue-600">Starting Soon:</div>
                {upcomingEngagements.slice(0, 2).map((engagement, index) => (
                  <div key={index} className="text-xs text-blue-600">
                    {formatHours(engagement.hoursPerWeek)}/week - {engagement.startDate.toLocaleDateString()}
                  </div>
                ))}
              </div>
            )}

            {endingEngagements.length > 0 && (
              <div className="text-sm">
                <div className="font-medium mb-1 text-orange-600">Ending Soon:</div>
                {endingEngagements.slice(0, 2).map((engagement, index) => (
                  <div key={index} className="text-xs text-orange-600">
                    {formatHours(engagement.hoursPerWeek)}/week - {engagement.endDate?.toLocaleDateString()}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Overallocation Warning */}
        {availability.utilizationPercentage > 100 && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
            <AlertTriangle className="h-4 w-4" />
            <span>Overallocated by {formatHours(availability.engagedHours - availability.totalHours)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Compact version of the availability card for use in tables or lists
 */
export function AvailabilityBadge({
  organizationId,
  memberId,
  workingHoursPerWeek = 40
}: Omit<AvailabilityCardProps, 'memberName' | 'showDetails'>) {
  const { availability, isLoading, availabilityStatus } = useAvailability({
    organizationId,
    memberId,
    workingHoursPerWeek
  })

  if (isLoading) {
    return <Badge variant="secondary">Loading...</Badge>
  }

  if (!availability || !availabilityStatus) {
    return <Badge variant="secondary">Unknown</Badge>
  }

  return (
    <Badge 
      variant="secondary"
      style={{ backgroundColor: availabilityStatus.color, color: 'white' }}
      className="flex items-center gap-1"
    >
      <span>{availabilityStatus.label}</span>
      <span className="text-xs">
        ({formatHours(availability.availableHours)} free)
      </span>
    </Badge>
  )
}

export default AvailabilityCard