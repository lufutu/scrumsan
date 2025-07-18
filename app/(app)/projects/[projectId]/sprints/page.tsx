"use client"

import { use } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Target, BarChart3, Settings } from 'lucide-react'
import SprintDashboard from '@/components/sprints/sprint-dashboard'
import SprintPlanning from '@/components/sprints/sprint-planning'
import SprintAnalytics from '@/components/sprints/sprint-analytics'

export default function ProjectSprintsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="dashboard" className="h-full flex flex-col">
        <div className="border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-teal-600" />
              <h1 className="text-2xl font-bold">Sprint Management</h1>
            </div>
          </div>
          
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="planning" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Planning
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="flex-1 overflow-auto">
          <TabsContent value="dashboard" className="h-full m-0">
            <SprintDashboard projectId={projectId} />
          </TabsContent>
          
          <TabsContent value="planning" className="h-full m-0">
            <SprintPlanning projectId={projectId} />
          </TabsContent>
          
          <TabsContent value="analytics" className="h-full m-0">
            <SprintAnalytics projectId={projectId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
} 