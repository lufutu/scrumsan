"use client"

import { useState } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Plus, 
  X, 
  Edit2, 
  Download,
  AlertCircle,
  Link as LinkIcon,
  Target,
  Flag,
  Paperclip,
  Share,
  MoreHorizontal,
  ChevronDown,
  Upload,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tables } from '@/types/database'

interface VivifyTaskDetailModalProps {
  task: Tables<'tasks'>
  onUpdate?: () => void
  children?: React.ReactNode
}

const TASK_TYPES = [
  { value: 'story', label: 'Story', icon: '📋', color: 'bg-green-500' },
  { value: 'improvement', label: 'Improvement', icon: '⚡', color: 'bg-blue-500' },
  { value: 'bug', label: 'Bug', icon: '🐛', color: 'bg-red-500' },
  { value: 'task', label: 'Task', icon: '✅', color: 'bg-orange-500' },
  { value: 'note', label: 'Note', icon: '📝', color: 'bg-yellow-500' },
  { value: 'idea', label: 'Idea', icon: '💡', color: 'bg-purple-500' }
]

const TASK_STATUSES = [
  { value: 'to_do', label: 'To do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' }
]

export default function VivifyTaskDetailModal({
  task,
  onUpdate,
  children
}: VivifyTaskDetailModalProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [taskData, setTaskData] = useState(task)

  const currentTaskType = TASK_TYPES.find(type => type.value === taskData.task_type) || TASK_TYPES[0]

  const getTaskId = () => {
    return `SPDR-${task.id.slice(-1)}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Edit2 className="h-4 w-4 mr-2" />
            View Details
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex h-full">
          {/* Left Panel */}
          <div className="flex-1 flex flex-col min-h-0">
            <DialogHeader className="p-6 border-b bg-teal-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded flex items-center justify-center text-white", currentTaskType.color)}>
                    <span className="text-sm">{currentTaskType.icon}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium opacity-90">#{getTaskId()}</span>
                      <Badge variant="secondary" className="bg-white/20 text-white">
                        {currentTaskType.label.toUpperCase()}
                      </Badge>
                    </div>
                    <DialogTitle className="text-xl font-bold">{taskData.title}</DialogTitle>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                    <Flag className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                    <Share className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="grid grid-cols-4 w-full rounded-none bg-gray-50">
                  <TabsTrigger value="details">DETAILS</TabsTrigger>
                  <TabsTrigger value="worklog">WORKLOG</TabsTrigger>
                  <TabsTrigger value="relations">RELATIONS</TabsTrigger>
                  <TabsTrigger value="events">EVENTS</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-auto">
                  <TabsContent value="details" className="p-6 space-y-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600">DESCRIPTION</Label>
                      <Textarea 
                        value={taskData.description || ''}
                        placeholder="Add a description..."
                        className="min-h-24"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="worklog" className="p-6">
                    <div className="text-center">
                      <Button className="bg-teal-600 hover:bg-teal-700">
                        <Download className="h-4 w-4 mr-2" />
                        DOWNLOAD TIME TRACKER
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="relations" className="p-6">
                    <div className="grid grid-cols-3 gap-4">
                      <Button className="bg-red-600 hover:bg-red-700">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Add blocking Item
                      </Button>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Add SubItem
                      </Button>
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        <Target className="h-4 w-4 mr-2" />
                        Add Parent
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="events" className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Button className="bg-teal-600 hover:bg-teal-700">
                        <Calendar className="h-4 w-4 mr-2" />
                        Set Due Date
                      </Button>
                      <Button className="bg-teal-600 hover:bg-teal-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Event
                      </Button>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-80 border-l bg-gray-50 p-6">
            <div className="space-y-6">
              <div>
                <Label className="text-xs font-medium text-gray-600">ESTIMATIONS</Label>
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {taskData.story_points || 0}
                  </div>
                  <span className="text-sm">Points</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
