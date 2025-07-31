"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface MiniCalendarProps {
  date: Date
  className?: string
}

export function MiniCalendar({ date, className }: MiniCalendarProps) {
  // Get the week containing the target date
  const startOfWeek = new Date(date)
  const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.
  startOfWeek.setDate(date.getDate() - dayOfWeek)
  
  // Generate the 7 days of the week
  const weekDays = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    weekDays.push(day)
  }
  
  const today = new Date()
  const isToday = (checkDate: Date) => {
    return checkDate.toDateString() === today.toDateString()
  }
  
  const isTargetDate = (checkDate: Date) => {
    return checkDate.toDateString() === date.toDateString()
  }
  
  const monthYear = date.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  })
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  return (
    <div className={cn("bg-white rounded-lg shadow-lg border p-3 min-w-[200px]", className)}>
      {/* Month/Year Header */}
      <div className="text-center text-sm font-semibold text-gray-800 mb-2">
        {monthYear}
      </div>
      
      {/* Day Names */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((dayName) => (
          <div key={dayName} className="text-xs text-gray-500 text-center py-1 font-medium">
            {dayName}
          </div>
        ))}
      </div>
      
      {/* Week Days */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, index) => {
          const dayNumber = day.getDate()
          const isCurrentMonth = day.getMonth() === date.getMonth()
          
          return (
            <div
              key={index}
              className={cn(
                "w-7 h-7 flex items-center justify-center text-xs rounded-full transition-colors",
                {
                  // Target date (due date) styling
                  "bg-blue-500 text-white font-semibold": isTargetDate(day),
                  // Today styling (if not the target date)
                  "bg-gray-200 text-gray-800 font-medium": isToday(day) && !isTargetDate(day),
                  // Current month days
                  "text-gray-700 hover:bg-gray-100": isCurrentMonth && !isToday(day) && !isTargetDate(day),
                  // Other month days (dimmed)
                  "text-gray-400": !isCurrentMonth
                }
              )}
            >
              {dayNumber}
            </div>
          )
        })}
      </div>
      
      {/* Due Date Info */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="text-xs text-center">
          <span className="text-gray-500">Due: </span>
          <span className="font-medium text-gray-800">
            {date.toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })}
          </span>
        </div>
      </div>
    </div>
  )
}