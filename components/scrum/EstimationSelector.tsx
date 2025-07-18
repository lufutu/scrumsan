"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Target, TrendingUp, Calculator } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { FIBONACCI_POINTS, SIZE_OPTIONS } from '@/lib/constants'

interface EstimationSelectorProps {
  storyPoints?: number
  effortUnits?: number
  estimationType?: 'story_points' | 'effort_units'
  itemValue?: string
  effortUnitType?: 'points' | 'hours' | 'custom'
  effortUnitName?: string
  itemValueOptions?: string[]
  onStoryPointsChange?: (points: number) => void
  onEffortUnitsChange?: (units: number) => void
  onEstimationTypeChange?: (type: 'story_points' | 'effort_units') => void
  onItemValueChange?: (value: string) => void
}


export default function EstimationSelector({
  storyPoints = 0,
  effortUnits = 0,
  estimationType = 'story_points',
  itemValue,
  effortUnitType = 'points',
  effortUnitName,
  itemValueOptions = SIZE_OPTIONS,
  onStoryPointsChange,
  onEffortUnitsChange,
  onEstimationTypeChange,
  onItemValueChange
}: EstimationSelectorProps) {

  const getValueWeight = (value: string): number => {
    const index = itemValueOptions.indexOf(value)
    return index >= 0 ? index + 1 : 0
  }

  const getEffortValue = (): number => {
    return estimationType === 'story_points' ? storyPoints : effortUnits
  }

  const calculateROI = (): number => {
    const valueWeight = itemValue ? getValueWeight(itemValue) : 0
    const effort = getEffortValue()
    
    if (effort === 0) return 0
    return Math.round((valueWeight / effort) * 100) / 100
  }

  const getROIColor = (roi: number): string => {
    if (roi >= 2) return 'text-green-600'
    if (roi >= 1) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getEffortUnitLabel = (): string => {
    switch (effortUnitType) {
      case 'hours':
        return 'Hours'
      case 'custom':
        return effortUnitName || 'Custom'
      default:
        return 'Points'
    }
  }

  return (
    <div className="space-y-4">
      {/* Item Value Section */}
      <div>
        <Label className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Item Value
        </Label>
        <div className="mt-2">
          <Select value={itemValue || ''} onValueChange={onItemValueChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {itemValueOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-8 text-center">
                      {option}
                    </Badge>
                    <span>Value {option}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            Business value separate from effort required
          </p>
        </div>
      </div>

      {/* Effort Units Section */}
      <div>
        <Label className="text-sm font-medium flex items-center gap-2">
          <Target className="w-4 h-4" />
          Effort Estimation
        </Label>
        <div className="mt-2 space-y-3">
          {/* Estimation Type Toggle */}
          <div className="flex gap-2">
            <Button
              variant={estimationType === 'story_points' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onEstimationTypeChange?.('story_points')}
            >
              Story Points
            </Button>
            <Button
              variant={estimationType === 'effort_units' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onEstimationTypeChange?.('effort_units')}
            >
              {getEffortUnitLabel()}
            </Button>
          </div>

          {/* Story Points Selection */}
          {estimationType === 'story_points' && (
            <div>
              <div className="flex flex-wrap gap-2">
                {FIBONACCI_POINTS.map((point) => (
                  <Button
                    key={point}
                    variant={storyPoints === point ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onStoryPointsChange?.(point)}
                    className="w-12 h-8"
                  >
                    {point}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Fibonacci sequence for story point estimation
              </p>
            </div>
          )}

          {/* Effort Units Input */}
          {estimationType === 'effort_units' && (
            <div>
              <Input
                type="number"
                value={effortUnits || ''}
                onChange={(e) => onEffortUnitsChange?.(parseInt(e.target.value) || 0)}
                placeholder={`Enter ${getEffortUnitLabel().toLowerCase()}`}
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Effort required in {getEffortUnitLabel().toLowerCase()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ROI Calculation */}
      {itemValue && getEffortValue() > 0 && (
        <Card className="bg-gray-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">ROI (Return on Investment)</span>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${getROIColor(calculateROI())}`}>
                  {calculateROI()}
                </div>
                <div className="text-xs text-gray-500">
                  Value ({getValueWeight(itemValue)}) / Effort ({getEffortValue()})
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {calculateROI() >= 2 && 'Excellent ROI - High value, low effort'}
              {calculateROI() >= 1 && calculateROI() < 2 && 'Good ROI - Balanced value and effort'}
              {calculateROI() < 1 && 'Low ROI - Consider if this effort is justified'}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}