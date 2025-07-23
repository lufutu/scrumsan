"use client"

import { use } from 'react'
import ProjectMembers from '@/components/projects/project-members'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Settings, Archive, Trash2 } from 'lucide-react'

export default function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Project Settings</h1>
      </div>

      {/* Project Members */}
      <ProjectMembers projectId={projectId} />

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Update your project details and configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Project Information</h3>
              <p className="text-sm text-muted-foreground">
                Update project name, description, and other details
              </p>
            </div>
            {/* ProjectForm will be updated to accept projectId and fetch the project */}
            <Button variant="outline">
              Edit Project Details
            </Button>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Project Status</h3>
              <p className="text-sm text-muted-foreground">
                Set project as active, completed, or archived
              </p>
            </div>
            <Button variant="outline">
              <Archive className="h-4 w-4 mr-2" />
              Archive Project
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-destructive">Delete Project</h3>
              <p className="text-sm text-muted-foreground">
                Permanently delete this project and all associated data. This action cannot be undone.
              </p>
            </div>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Project
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 