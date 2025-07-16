"use client"

import { use } from 'react'
import ProjectAnalytics from '@/components/projects/project-analytics'
import { BarChart3 } from 'lucide-react'

export default function ProjectAnalyticsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  
  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Project Analytics</h1>
      </div>
      
      <div className="flex-1">
        <ProjectAnalytics projectId={projectId} />
      </div>
    </div>
  )
} 