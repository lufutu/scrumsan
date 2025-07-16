"use client"

import { useParams } from 'next/navigation'
import ProjectBoard from '@/components/projects/project-board'
import { Kanban } from 'lucide-react'

export default function ProjectBoardPage() {
  const params = useParams()
  const projectId = params?.projectId as string
  
  if (!projectId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Error: Project ID not found</h1>
        <p>Params: {JSON.stringify(params)}</p>
      </div>
    )
  }
  
  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center gap-2 mb-6">
        <Kanban className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Kanban Board</h1>
        <span className="text-sm text-muted-foreground">Project: {projectId}</span>
      </div>
      
      <div className="flex-1">
        <ProjectBoard projectId={projectId} />
      </div>
    </div>
  )
} 