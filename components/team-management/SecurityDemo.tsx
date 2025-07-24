'use client'

import React from 'react'
import { Shield, Users, Settings, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PermissionGuard, usePermissionGuard } from '@/components/common/PermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'

/**
 * Demo component showing permission-based rendering and security features
 */
export function SecurityDemo() {
  const { 
    hasPermission, 
    canPerformAction, 
    isOwner, 
    isAdmin, 
    isMember, 
    isGuest,
    currentMember 
  } = usePermissions()
  
  const { renderIf } = usePermissionGuard()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permission System Demo
          </CardTitle>
          <CardDescription>
            This component demonstrates the permission-based rendering system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current user info */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Current User</h4>
            <div className="flex items-center gap-2">
              <Badge variant={isOwner ? 'default' : isAdmin ? 'secondary' : 'outline'}>
                {currentMember?.role || 'Unknown'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {currentMember?.permissionSet?.name || 'Default permissions'}
              </span>
            </div>
          </div>

          {/* Permission-based buttons */}
          <div className="space-y-2">
            <h4 className="font-medium">Available Actions</h4>
            
            {/* Using PermissionGuard component */}
            <div className="flex flex-wrap gap-2">
              <PermissionGuard permission="teamMembers.viewAll">
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  View All Members
                </Button>
              </PermissionGuard>

              <PermissionGuard permission="teamMembers.manageAll">
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Members
                </Button>
              </PermissionGuard>

              <PermissionGuard 
                action="create" 
                resourceType="project"
                fallback={
                  <Button variant="outline" size="sm" disabled>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Create Project (No Permission)
                  </Button>
                }
              >
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </PermissionGuard>

              <PermissionGuard role={['owner', 'admin']}>
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Only
                </Button>
              </PermissionGuard>

              <PermissionGuard role="owner">
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Owner Only
                </Button>
              </PermissionGuard>
            </div>
          </div>

          {/* Using renderIf helper */}
          <div className="space-y-2">
            <h4 className="font-medium">Conditional Content</h4>
            
            {renderIf(
              { permission: 'teamMembers.viewAll' },
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-800">
                  ✅ You can view all team members
                </p>
              </div>,
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-800">
                  ❌ You cannot view all team members
                </p>
              </div>
            )}

            {renderIf(
              { role: ['owner', 'admin'] },
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  ℹ️ You have administrative privileges
                </p>
              </div>
            )}

            {renderIf(
              { action: 'delete', resourceType: 'member' },
              <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                <p className="text-sm text-orange-800">
                  ⚠️ You can delete members (use with caution)
                </p>
              </div>
            )}
          </div>

          {/* Permission matrix */}
          <div className="space-y-2">
            <h4 className="font-medium">Permission Matrix</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>View Team Members:</span>
                <Badge variant={hasPermission('teamMembers.viewAll') ? 'default' : 'secondary'}>
                  {hasPermission('teamMembers.viewAll') ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Manage Team Members:</span>
                <Badge variant={hasPermission('teamMembers.manageAll') ? 'default' : 'secondary'}>
                  {hasPermission('teamMembers.manageAll') ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>View All Projects:</span>
                <Badge variant={hasPermission('projects.viewAll') ? 'default' : 'secondary'}>
                  {hasPermission('projects.viewAll') ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Manage Projects:</span>
                <Badge variant={hasPermission('projects.manageAll') ? 'default' : 'secondary'}>
                  {hasPermission('projects.manageAll') ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Create Members:</span>
                <Badge variant={canPerformAction('create', 'member') ? 'default' : 'secondary'}>
                  {canPerformAction('create', 'member') ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Delete Projects:</span>
                <Badge variant={canPerformAction('delete', 'project') ? 'default' : 'secondary'}>
                  {canPerformAction('delete', 'project') ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}