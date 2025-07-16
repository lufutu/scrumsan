"use client"

import { use } from 'react'
import TaskList from '@/components/tasks/task-list'
import { Activity } from 'lucide-react'

export default function ProjectTasksPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  
  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Project Tasks</h1>
      </div>
      
      <div className="flex-1">
        <TaskList projectId={projectId} />
      </div>
    </div>
  )
} 