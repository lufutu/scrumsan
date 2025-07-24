import { use } from 'react'
import { TeamManagementPage } from '@/components/team-management/TeamManagementPage'

export default function OrganizationMembersPage({ 
  params 
}: { 
  params: Promise<{ organizationId: string }> 
}) {
  const { organizationId } = use(params)
  
  return <TeamManagementPage organizationId={organizationId} />
}