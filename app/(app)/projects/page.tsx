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
      <div className="space-y-6">
        <ProjectOverviewTable />
      </div>
    </>
  )
} 