import { FolderOpen } from 'lucide-react'
import { AppHeader } from '@/components/dashboard/app-header'
import ProjectOverviewTable from '@/components/projects/project-overview-table'

export default function ProjectsPage() {
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { 
      label: 'Projects', 
      icon: <FolderOpen className="w-4 h-4" />,
      isCurrentPage: true 
    }
  ]

  return (
    <>
      <AppHeader 
        title="Projects"
        breadcrumbs={breadcrumbs}
      />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-6">
            <ProjectOverviewTable />
          </div>
        </div>
      </main>
    </>
  )
} 