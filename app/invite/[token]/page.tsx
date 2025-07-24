import { use } from 'react'
import { InvitationAcceptPage } from '@/components/invitations/InvitationAcceptPage'

export default function InviteTokenPage({ 
  params 
}: { 
  params: Promise<{ token: string }> 
}) {
  const { token } = use(params)
  
  return <InvitationAcceptPage token={token} />
}

export const metadata = {
  title: 'Accept Invitation',
  description: 'Accept your team invitation',
}