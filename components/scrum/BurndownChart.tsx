"use client"

import { Sprint } from '@/hooks/useSprints'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface BurndownChartProps {
  sprint: Sprint
  totalStoryPoints: number
  completedStoryPoints: number
}

export default function BurndownChart({ 
  sprint, 
  totalStoryPoints, 
  completedStoryPoints 
}: BurndownChartProps) {
  // Generate ideal burndown line data
  const generateIdealBurndown = () => {
    if (!sprint.startDate || !sprint.endDate) return []

    const start = new Date(sprint.startDate)
    const end = new Date(sprint.endDate)
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    
    const data = []
    for (let i = 0; i <= totalDays; i++) {
      const currentDate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
      const remainingPoints = totalStoryPoints - (totalStoryPoints * i / totalDays)
      
      data.push({
        day: i,
        date: currentDate.toLocaleDateString(),
        idealRemaining: Math.max(0, remainingPoints),
        actualRemaining: i === 0 ? totalStoryPoints : null // We'll fill this with real data
      })
    }

    return data
  }

  // Generate actual burndown data (simplified - in real app this would come from sprint analytics)
  const generateActualBurndown = (idealData: any[]) => {
    const today = new Date()
    const start = sprint.startDate ? new Date(sprint.startDate) : new Date()
    const daysElapsed = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    
    return idealData.map((point, index) => {
      if (index === 0) {
        return { ...point, actualRemaining: totalStoryPoints }
      }
      
      if (index <= daysElapsed) {
        // Simulate some actual progress (in real app, this would come from actual data)
        const progressRate = completedStoryPoints / Math.max(daysElapsed, 1)
        const actualRemaining = Math.max(0, totalStoryPoints - (progressRate * index))
        return { ...point, actualRemaining }
      }
      
      return point
    })
  }

  const idealData = generateIdealBurndown()
  const chartData = generateActualBurndown(idealData)

  // Calculate current progress
  const currentDay = sprint.startDate 
    ? Math.ceil((new Date().getTime() - new Date(sprint.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const remainingPoints = totalStoryPoints - completedStoryPoints

  return (
    <div className="h-96 w-full">
      <div className="mb-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-sm text-muted-foreground">Total Story Points</p>
          <p className="text-2xl font-bold">{totalStoryPoints}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-green-600">{completedStoryPoints}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Remaining</p>
          <p className="text-2xl font-bold text-orange-600">{remainingPoints}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="day" 
            label={{ value: 'Sprint Days', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            labelFormatter={(value) => `Day ${value}`}
            formatter={(value: any, name: string) => [
              value?.toFixed(1) || 'N/A', 
              name === 'idealRemaining' ? 'Ideal Remaining' : 'Actual Remaining'
            ]}
          />
          
          {/* Ideal burndown line */}
          <Line 
            type="monotone" 
            dataKey="idealRemaining" 
            stroke="#8884d8" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Ideal"
          />
          
          {/* Actual burndown line */}
          <Line 
            type="monotone" 
            dataKey="actualRemaining" 
            stroke="#82ca9d" 
            strokeWidth={3}
            dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
            connectNulls={false}
            name="Actual"
          />
          
          {/* Current day reference line */}
          {currentDay > 0 && (
            <ReferenceLine 
              x={currentDay} 
              stroke="#ff6b6b" 
              strokeDasharray="2 2"
              label={{ value: "Today", position: "top" }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend and insights */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500 border-dashed border border-blue-500"></div>
            <span>Ideal Burndown</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-green-500"></div>
            <span>Actual Burndown</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-400 border-dashed border border-red-400"></div>
            <span>Today</span>
          </div>
        </div>
        
        <div className="text-center text-sm text-muted-foreground">
          {remainingPoints > 0 && currentDay > 0 && (
            <p>
              At current pace, you'll complete the sprint with{' '}
              <span className={remainingPoints > totalStoryPoints * 0.1 ? 'text-orange-600' : 'text-green-600'}>
                {remainingPoints} points remaining
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}