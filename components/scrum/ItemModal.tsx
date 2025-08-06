'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  MoreHorizontal,
  MessageSquare,
  Paperclip,
  Clock,
  Calendar as CalendarIcon,
  Flag,
  Users,
  Link2,
  Plus,
  Trash2,
  Upload,
  FileText,
  Image as ImageIcon,
  Send,
  Edit3,
  CheckSquare,
  Square,
  UserPlus,
  CalendarDays,
  Timer,
  LinkIcon,
  Archive,
  Copy,
  ExternalLink,
  ChevronDown,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, VisuallyHidden } from '@/components/animate-ui/radix/dialog';
import { cn } from '@/lib/utils';
import { getItemTypeColor, ITEM_TYPES, PRIORITIES, STORY_POINTS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/animate-ui/radix/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/animate-ui/radix/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSupabase } from '@/providers/supabase-provider';
import { Tables } from '@/types/database';
import { FileUploadQueue } from '@/components/ui/file-upload-queue';
import { RelationsTab } from '@/components/scrum/RelationsTab';
import LabelSelector from '@/components/scrum/LabelSelector';
import { toast } from 'sonner';
import { useUsers } from '@/hooks/useUsers';
import { useLabels } from '@/hooks/useLabels';
import { ItemModalProps } from '@/types/shared';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/animate-ui/radix/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { TaskActivities } from '@/components/tasks/task-activities';
import { DescriptionField, DescriptionDisplay } from '@/components/ui/description-field';
import {Comment, Attachment, WorklogEntry, Checklist} from '@/types/shared'

type Task = Tables<'tasks'> & {
  taskAssignees?: {
    user: {
      id: string
      fullName: string | null
      avatarUrl: string | null
    }
  }[]
  taskLabels?: {
    label: {
      id: string
      name: string
      color: string | null
    }
  }[]
  created_by_user?: {
    id: string
    full_name: string | null
  } | null
  board?: {
    id: string
    name: string
    organizationId: string
  } | null
  project?: {
    id: string
    name: string
  } | null
  sprint?: {
    id: string
    name: string
  } | null
  column?: {
    id: string
    name: string
  } | null
  attachments?: Attachment[]
  checklists?: Checklist[]
  comments?: Comment[]
  worklog_entries?: WorklogEntry[]
}


export function ItemModal({
  isOpen,
  onClose,
  taskId,
  onUpdate
}: ItemModalProps) {
  const { supabase, user } = useSupabase();
  // Tab state for right sidebar
  const [activeTab, setActiveTab] = useState('properties');
  // Collapsible sections state for content tab - expanded by default
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [checklistsOpen, setChecklistsOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);
  // Assignee selector state
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  // Due date picker state
  const [dueDatePopoverOpen, setDueDatePopoverOpen] = useState(false);
  // Label selector state
  const [task, setTask] = useState<Task | null>(null);
  
  // Fetch organization members for assignee selector
  const { users: organizationMembers, isLoading: loadingMembers } = useUsers({
    organizationId: task?.board?.organizationId
  });
  
  // Fetch board labels
  const { labels: boardLabels, loading: loadingLabels, createLabel } = useLabels(task?.board?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  
  // Feature states
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [worklogEntries, setWorklogEntries] = useState<WorklogEntry[]>([]);
  const [newWorklogDescription, setNewWorklogDescription] = useState('');
  const [newWorklogHours, setNewWorklogHours] = useState('');
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  
  // Column data for dropdown
  const [boardColumns, setBoardColumns] = useState<{ id: string; name: string }[]>([]);
  const [sprintColumns, setSprintColumns] = useState<{ id: string; name: string; isDone: boolean }[]>([]);

  useEffect(() => {
    if (taskId && isOpen) {
      fetchTask();
      fetchChecklists();
      fetchComments();
      fetchAttachments();
      fetchWorklog();
    }
  }, [taskId, isOpen]);

  // Fetch columns when task board is loaded
  useEffect(() => {
    if (task?.board?.id) {
      fetchBoardColumns();
      fetchSprintColumns();
    }
  }, [task?.board?.id]);

  const fetchTask = async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch task: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched task data:', data);
      setTask(data);
      setTitle(data.title);
      setDescription(data.description || '');
      
    } catch (error) {
      console.error('Error fetching task:', error);
      toast.error("Failed to load task details");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBoardColumns = async () => {
    if (!task?.board?.id) {
      console.log('🔍 ItemModal: No board ID available for task:', task);
      return;
    }
    
    console.log('🔍 ItemModal: Fetching board columns for board:', task.board.id);
    try {
      const response = await fetch(`/api/boards/${task.board.id}/columns`);
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 ItemModal: Board columns response:', data);
        // Extract just the column info we need
        const columns = data.map((col: any) => ({
          id: col.id,
          name: col.name
        }));
        console.log('🔍 ItemModal: Setting board columns:', columns);
        setBoardColumns(columns || []);
      } else {
        console.error('🔍 ItemModal: Board columns API failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching board columns:', error);
    }
  };

  const fetchSprintColumns = async () => {
    if (!task?.board?.id) {
      console.log('🔍 ItemModal: No board ID for sprint columns');
      return;
    }
    
    console.log('🔍 ItemModal: Fetching sprint columns for board:', task.board.id);
    try {
      const response = await fetch(`/api/boards/${task.board.id}/sprint-columns`);
      if (response.ok) {
        const sprintGroupsData = await response.json();
        console.log('🔍 ItemModal: Sprint columns response:', sprintGroupsData);
        // Flatten all columns from all sprints
        const allSprintColumns = sprintGroupsData.flatMap((group: any) => 
          group.columns.map((col: any) => ({
            id: col.id,
            name: `${group.sprintName}: ${col.name}`,
            isDone: col.isDone,
            sprintId: group.sprintId,
            sprintName: group.sprintName
          }))
        );
        console.log('🔍 ItemModal: Setting sprint columns:', allSprintColumns);
        setSprintColumns(allSprintColumns || []);
      } else {
        console.error('🔍 ItemModal: Sprint columns API failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching sprint columns:', error);
    }
  };

  const fetchChecklists = async () => {
    if (!taskId) return;
    
    try {
      const response = await fetch(`/api/tasks/${taskId}/checklists`);
      if (response.ok) {
        const data = await response.json();
        setChecklists(data || []);
      }
    } catch (error) {
      console.error('Error fetching checklists:', error);
    }
  };

  const fetchComments = async () => {
    if (!taskId) return;
    
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchAttachments = async () => {
    if (!taskId) return;
    
    try {
      const response = await fetch(`/api/tasks/${taskId}/attachments`);
      if (response.ok) {
        const data = await response.json();
        setAttachments(data || []);
      }
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  };

  const fetchWorklog = async () => {
    if (!taskId) return;
    
    try {
      const response = await fetch(`/api/tasks/${taskId}/worklog`);
      if (response.ok) {
        const data = await response.json();
        setWorklogEntries(data || []);
      }
    } catch (error) {
      console.error('Error fetching worklog:', error);
    }
  };

  const updateTask = async (updates: Partial<Task>) => {
    if (!taskId) return;
    
    console.log('🚀 Optimistic task update:', updates);
    
    // Store original task for potential rollback
    const originalTask = task;
    
    // Apply optimistic update immediately
    if (task) {
      const optimisticTask = { ...task, ...updates };
      console.log('✨ Applying optimistic update to UI');
      setTask(optimisticTask);
    }
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update failed:', response.status, errorText);
        
        // Rollback optimistic update on failure
        console.log('❌ Rolling back optimistic update');
        if (originalTask) {
          setTask(originalTask);
        }
        
        throw new Error('Failed to update task');
      }

      const updatedTask = await response.json();
      console.log('✅ Task updated successfully via API:', updatedTask.id);
      
      // Replace optimistic update with real data from server
      setTask(updatedTask);
      
      toast.success('Task updated successfully');
      onUpdate?.();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      
      // Ensure rollback happened
      if (originalTask && task !== originalTask) {
        console.log('🔄 Ensuring rollback is applied');
        setTask(originalTask);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTitle = () => {
    if (title !== task?.title) {
      updateTask({ title });
    }
    setEditingTitle(false);
  };

  const handleSaveDescription = () => {
    if (description !== task?.description) {
      updateTask({ description });
    }
    setEditingDescription(false);
  };

  const addComment = async () => {
    if (!newComment.trim() || !taskId) return;
    
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      setNewComment('');
      fetchComments();
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const addChecklist = async () => {
    if (!newChecklistTitle.trim() || !taskId) return;
    
    try {
      const response = await fetch(`/api/tasks/${taskId}/checklists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChecklistTitle.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to create checklist');
      }

      setNewChecklistTitle('');
      fetchChecklists();
      toast.success('Checklist created');
    } catch (error) {
      console.error('Error creating checklist:', error);
      toast.error('Failed to create checklist');
    }
  };

  const addChecklistItem = async (checklistId: string, text: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/checklists/${checklistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      });

      if (!response.ok) {
        throw new Error('Failed to add checklist item');
      }

      fetchChecklists();
      toast.success('Item added');
    } catch (error) {
      console.error('Error adding checklist item:', error);
      toast.error('Failed to add item');
    }
  };

  const toggleChecklistItem = async (checklistId: string, itemId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/checklists/${checklistId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });

      if (!response.ok) {
        throw new Error('Failed to update checklist item');
      }

      fetchChecklists();
    } catch (error) {
      console.error('Error updating checklist item:', error);
      toast.error('Failed to update item');
    }
  };

  const addWorklogEntry = async () => {
    if (!newWorklogDescription.trim() || !newWorklogHours || !taskId) return;
    
    try {
      const response = await fetch(`/api/tasks/${taskId}/worklog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newWorklogDescription.trim(),
          hoursLogged: parseFloat(newWorklogHours),
          dateLogged: new Date().toISOString().split('T')[0]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to log work');
      }

      setNewWorklogDescription('');
      setNewWorklogHours('');
      fetchWorklog();
      toast.success('Work logged successfully');
    } catch (error) {
      console.error('Error logging work:', error);
      toast.error('Failed to log work');
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!taskId) {
      throw new Error('No task ID available');
    }
    
    const formData = new FormData();
    formData.append('files', file);
    const response = await fetch(`/api/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    return await response.json();
  };

  const handleUploadComplete = (result: any) => {
    fetchAttachments();
    toast.success('File uploaded successfully');
  };

  const handleUploadError = (error: string) => {
    toast.error(`Upload failed: ${error}`);
  };

  const deleteAttachment = async (attachmentId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchAttachments();
        toast.success('Attachment deleted');
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
    }
  };

  const getTaskTypeIcon = (type: string) => {
    const itemType = ITEM_TYPES.find(t => t.id === type);
    return itemType?.icon || '📋';
  };

  // Dropdown menu handlers
  const handleOpenInNewTab = () => {
    if (taskId && task?.board?.id) {
      // Open the board with task selected via URL parameter
      const url = `${window.location.origin}/boards/${task.board.id}?task=${taskId}`;
      window.open(url, '_blank');
    }
  };

  const handleCopyLink = async () => {
    if (taskId && task?.board?.id) {
      // Copy link to board with task parameter
      const url = `${window.location.origin}/boards/${task.board.id}?task=${taskId}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      } catch (error) {
        console.error('Failed to copy link:', error);
        toast.error('Failed to copy link');
      }
    }
  };

  const handleArchive = async () => {
    if (!taskId) return;
    
    try {
      await updateTask({ archived: true });
      toast.success('Task archived');
      onClose(); // Close modal after archiving
    } catch (error) {
      console.error('Error archiving task:', error);
      toast.error('Failed to archive task');
    }
  };

  const handleToggleFavorite = async () => {
    if (!taskId) return;
    
    try {
      await updateTask({ is_favorite: !task?.is_favorite });
      toast.success(task?.is_favorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite status');
    }
  };

  const handleAssignUser = async (userId: string | null) => {
    if (!taskId || !task) return;
    
    try {
      setIsSaving(true);
      
      // Get current assignee IDs
      const currentAssignees = task.taskAssignees?.map(ta => ta.user.id) || [];
      let newAssigneeIds: string[] = [];
      
      if (userId === null) {
        // Clear all assignees
        newAssigneeIds = [];
      } else if (currentAssignees.includes(userId)) {
        // Remove user from assignees
        newAssigneeIds = currentAssignees.filter(id => id !== userId);
      } else {
        // Add user to assignees
        newAssigneeIds = [...currentAssignees, userId];
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assigneeIds: newAssigneeIds
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update assignees');
      }

      const updatedTask = await response.json();
      setTask(updatedTask);
      setAssigneePopoverOpen(false);
      
      const message = userId === null 
        ? 'All assignees removed' 
        : currentAssignees.includes(userId)
        ? 'Assignee removed'
        : 'Assignee added';
      toast.success(message);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating assignees:', error);
      toast.error('Failed to update assignees');
    } finally {
      setIsSaving(false);
    }
  };



  const handleDelete = async () => {
    if (!taskId || !task) return;
    
    if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      console.log('🗑️ Starting optimistic task deletion...');
      
      // Close modal immediately for better UX
      onClose();
      
      try {
        // Store original task for potential rollback
        const originalTask = { ...task };
        console.log('🗑️ Stored original task for rollback:', originalTask.title);
        
        // Show optimistic success message immediately
        toast.success('Task deleted');
        
        // Trigger UI update immediately (removes task from UI)
        onUpdate?.();
        console.log('🗑️ UI updated optimistically');
        
        // Make API call in background
        console.log('📡 Making delete API call...');
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete task');
        }
        
        console.log('✅ Task deletion confirmed by API');
        
        // Final UI refresh to ensure consistency
        setTimeout(() => {
          onUpdate?.();
        }, 100);
        
      } catch (error) {
        console.error('❌ Task deletion failed:', error);
        
        // Show error and refresh to restore state
        toast.error('Failed to delete task - please try again');
        
        // Refresh the UI to restore the task
        onUpdate?.();
        
        // Optionally reopen modal to show the restored task
        // (this would require a callback to the parent component)
      }
    }
  };;

  if (!task && !isLoading) return null;

  // Handle dialog close only when user explicitly wants to close
  const handleDialogOpenChange = (open: boolean) => {
    // Only close when dialog is being closed (open = false) AND not during other state changes
    if (!open && !isSaving) {
      onClose();
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent 
        className="[&>button:last-child]:hidden h-[95vh] p-0 gap-0 w-[95vw] max-w-[95vw] sm:max-w-[65vw]"
        onInteractOutside={(e) => e.preventDefault()} // Prevent closing when clicking outside
        onEscapeKeyDown={(e) => e.preventDefault()} // Prevent closing on ESC key
      >
        <VisuallyHidden>
          <DialogTitle>Task Details</DialogTitle>
        </VisuallyHidden>
        
        {/* Modern Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b bg-gradient-to-r from-slate-50 to-gray-50">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-medium shadow-sm",
              getItemTypeColor(task?.task_type || 'task').color,
              getItemTypeColor(task?.task_type || 'task').bgColor
            )}>
              {getTaskTypeIcon(task?.task_type || 'task')}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                  {task?.task_type || 'TASK'}
                </span>
                {task?.board && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-sm text-slate-700 font-medium">{task.board.name}</span>
                  </>
                )}
              </div>
              <span className="text-xs text-slate-500 font-mono">
                #{task?.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 hover:bg-white/80"
              onClick={handleToggleFavorite}
              title={task?.is_favorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Flag className={cn(
                "h-4 w-4",
                task?.is_favorite ? "text-yellow-500 fill-yellow-500" : "text-slate-500"
              )} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/80">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="gap-2" onClick={handleOpenInNewTab}>
                  <ExternalLink className="h-4 w-4" />
                  Open in new tab
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                  Copy link
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={handleArchive}>
                  <Archive className="h-4 w-4" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 gap-2" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="h-9 w-9 hover:bg-white/80"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-4 px-8 py-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-slate-600">Column:</Label>
            <Select 
              value={task?.sprintColumnId || task?.columnId || 'no-column'}
              onValueChange={(value) => {
                if (value === 'no-column') {
                  updateTask({ columnId: null, sprintColumnId: null });
                } else {
                  // Determine if this is a sprint column or board column
                  const isSprintColumn = sprintColumns.some(col => col.id === value);
                  if (isSprintColumn) {
                    updateTask({ sprintColumnId: value, columnId: null });
                  } else {
                    updateTask({ columnId: value, sprintColumnId: null });
                  }
                }
              }}
            >
              <SelectTrigger className="w-36 h-8 bg-emerald-500 text-white border-0 hover:bg-emerald-600">
                <SelectValue placeholder="No Column" />
              </SelectTrigger>
              <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
                <SelectItem value="no-column">No Column</SelectItem>
                {console.log('🔍 ItemModal: Rendering columns - Board:', boardColumns.length, 'Sprint:', sprintColumns.length)}
                {boardColumns.length > 0 && (
                  <>
                    {boardColumns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.name}
                      </SelectItem>
                    ))}
                  </>
                )}
                {sprintColumns.length > 0 && (
                  <>
                    {sprintColumns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.name} {column.isDone ? '(Done)' : ''}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <ChevronDown className="h-4 w-4 text-slate-400" />
          
          <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4" />
            <span>Last updated {task?.updated_at ? new Date(task.updated_at).toLocaleDateString() : 'Never'}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel */}
          <div className="flex-1 overflow-y-auto">
            {/* Title Section */}
            <div className="px-8 py-6 border-b">
              {editingTitle ? (
                <div className="space-y-3">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-2xl font-semibold border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder="Enter task title..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={handleSaveTitle} disabled={isSaving}>
                      {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Save
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => {
                      setTitle(task?.title || '');
                      setEditingTitle(false);
                    }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="group cursor-pointer"
                  onClick={() => setEditingTitle(true)}
                >
                  <h1 className="text-2xl font-semibold text-slate-900 group-hover:text-slate-700 transition-colors">
                    {title || 'Untitled Task'}
                  </h1>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                    <span className="text-sm text-slate-500 flex items-center gap-1">
                      <Edit3 className="h-3 w-3" />
                      Click to edit title
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Sections */}
            <div className="px-8 space-y-6 pb-8">

              {/* Details Section */}
              <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-slate-600" />
                    <span className="font-semibold text-slate-900">Details</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-600 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-8 pt-4">
                {/* Description */}
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-3 block">DESCRIPTION</Label>
                  {editingDescription ? (
                    <div className="space-y-3">
                      <DescriptionField
                        value={description}
                        onChange={setDescription}
                        placeholder="Add a detailed description..."
                        taskId={task?.id}
                        enhanced={true}
                      />
                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={handleSaveDescription} disabled={isSaving}>
                          {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          Save
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => {
                          setDescription(task?.description || '');
                          setEditingDescription(false);
                        }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="group cursor-pointer min-h-[80px] p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                      onClick={() => setEditingDescription(true)}
                    >
                      {description ? (
                        <DescriptionDisplay content={description} className="text-slate-700" />
                      ) : (
                        <p className="text-slate-400 italic">Click to add a description...</p>
                      )}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                          <Edit3 className="h-3 w-3" />
                          Click to edit description
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Comments */}
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-4 block">
                    COMMENTS ({comments.length})
                  </Label>
                  <div className="space-y-4">
                    {/* Add Comment */}
                    <Card className="border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          <EnhancedAvatar
                            src={user?.user_metadata?.avatar_url}
                            fallbackSeed={user?.email || user?.user_metadata?.full_name || 'user'}
                            fallbackSeeds={[user?.user_metadata?.full_name || '']}
                            size="md"
                            className="h-8 w-8"
                            alt={user?.user_metadata?.full_name || user?.email || 'User'}
                          />
                          <div className="flex-1 space-y-3">
                            <Textarea
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Write a comment..."
                              className="min-h-[100px] border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                            <Button 
                              onClick={addComment}
                              disabled={!newComment.trim()}
                              className="bg-emerald-500 hover:bg-emerald-600"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Post Comment
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Comments List */}
                    {comments.map((comment) => (
                      <Card key={comment.id} className="border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <EnhancedAvatar
                              src={comment.user.avatarUrl}
                              fallbackSeed={comment.user.fullName || 'user'}
                              size="md"
                              className="h-8 w-8"
                              alt={comment.user.fullName || 'User'}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-slate-900">
                                  {comment.user.fullName || 'Unknown User'}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {new Date(comment.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Checklists Section */}
              <Collapsible open={checklistsOpen} onOpenChange={setChecklistsOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <Square className="h-5 w-5 text-slate-600" />
                    <span className="font-semibold text-slate-900">Checklists ({checklists.length})</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-600 transition-transform ${checklistsOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-6 pt-4">
                {/* Add Checklist */}
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Input
                        value={newChecklistTitle}
                        onChange={(e) => setNewChecklistTitle(e.target.value)}
                        placeholder="New checklist title..."
                        className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addChecklist();
                          }
                        }}
                      />
                      <Button 
                        onClick={addChecklist}
                        disabled={!newChecklistTitle.trim()}
                        className="bg-emerald-500 hover:bg-emerald-600"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Checklist
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Checklists */}
                <div className="space-y-4">
                  {checklists.map((checklist) => (
                    <ChecklistComponent
                      key={checklist.id}
                      checklist={checklist}
                      onToggleItem={toggleChecklistItem}
                      onAddItem={addChecklistItem}
                    />
                  ))}
                </div>
                </CollapsibleContent>
              </Collapsible>


              {/* Files Section */}
              <Collapsible open={filesOpen} onOpenChange={setFilesOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5 text-slate-600" />
                    <span className="font-semibold text-slate-900">Files ({attachments.length})</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-600 transition-transform ${filesOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-6 pt-4">
                {/* File Upload */}
                <FileUploadQueue
                  onFileUpload={handleFileUpload}
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                  multiple={true}
                  accept="*/*"
                  maxSize={50}
                  maxFiles={20}
                  autoUpload={true}
                  autoClearCompleted={true}
                  autoClearDelay={3000}
                  className="min-h-[120px] border-slate-200 rounded-lg"
                />

                {/* Attachments List */}
                {attachments.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700">
                      Uploaded Files ({attachments.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {attachments.map((file) => (
                        <Card key={file.id} className="group relative overflow-hidden border-slate-200 hover:shadow-lg transition-shadow">
                          {!file.url ? (
                            <div className="aspect-square relative bg-slate-50 flex flex-col items-center justify-center p-4">
                              <AlertCircle className="w-12 h-12 text-slate-400 mb-2" />
                              <p className="text-xs text-slate-500 text-center">File not found</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteAttachment(file.id)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white hover:text-white p-1.5"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : file.type && file.type.startsWith('image/') && !imageLoadErrors.has(file.id) ? (
                            <div className="aspect-square relative bg-slate-50">
                              <img 
                                src={file.url}
                                alt={file.name}
                                className="w-full h-full object-cover"
                                onError={() => {
                                  console.error('Failed to load image:', file.name, 'URL:', file.url);
                                  setImageLoadErrors(prev => new Set(prev).add(file.id));
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteAttachment(file.id)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white hover:text-white p-1.5"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="aspect-square relative bg-slate-50 flex flex-col items-center justify-center p-4">
                              <FileText className="w-12 h-12 text-slate-400 mb-2" />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteAttachment(file.id)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white hover:text-white p-1.5"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          <CardContent className="p-3">
                            <p className="text-xs font-medium text-slate-900 truncate mb-1">
                              {file.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {file.uploadedByUser.fullName}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-120 border-l bg-slate-50 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="w-full justify-start h-10 p-1 bg-slate-100 rounded-none border-b">
                <TabsTrigger value="properties" className="flex-1 text-sm">Properties</TabsTrigger>
                <TabsTrigger value="activities" className="flex-1 text-sm">Activities</TabsTrigger>
                <TabsTrigger value="activity" className="flex-1 text-sm">Worklog</TabsTrigger>
                <TabsTrigger value="relations" className="flex-1 text-sm">Relations</TabsTrigger>
              </TabsList>

              {/* Properties Tab */}
              <TabsContent value="properties" className="p-6 space-y-6">
                {/* Assignee */}
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-3 block">ASSIGNEE</Label>
                  <Popover modal={true} open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                    <PopoverTrigger asChild>
                      {task?.taskAssignees && task.taskAssignees.length > 0 ? (
                        <Button 
                          variant="outline" 
                          className="w-full justify-start p-3 h-auto bg-white border border-slate-200 hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-2 mr-3">
                            {task.taskAssignees.slice(0, 3).map((assignee, index) => (
                              <EnhancedAvatar
                                key={assignee.user.id}
                                src={assignee.user.avatarUrl}
                                fallbackSeed={assignee.user.fullName || 'user'}
                                size="sm"
                                className={cn("h-6 w-6", index > 0 && "-ml-2")}
                                alt={assignee.user.fullName || 'User'}
                              />
                            ))}
                            {task.taskAssignees.length > 3 && (
                              <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 -ml-2">
                                +{task.taskAssignees.length - 3}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-sm text-slate-900">
                              {task.taskAssignees.length === 1 
                                ? task.taskAssignees[0].user.fullName || 'Assignee'
                                : `${task.taskAssignees.length} Assignees`
                              }
                            </div>
                            <div className="text-xs text-slate-500">Click to manage assignees</div>
                          </div>
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-slate-600 border-slate-200 hover:bg-white h-auto p-3"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          <div className="text-left">
                            <div className="font-medium">Assign someone</div>
                            <div className="text-xs text-slate-500">Click to select assignees</div>
                          </div>
                        </Button>
                      )}
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 z-50" align="start">
                      <Command>
                        <div className="flex items-center border-b px-3">
                          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                          <CommandInput placeholder="Search members..." className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50" />
                        </div>
                        <CommandList>
                          {loadingMembers ? (
                            <div className="p-4 text-center text-sm text-slate-500">
                              Loading members...
                            </div>
                          ) : (
                            <>
                              <CommandEmpty>No members found.</CommandEmpty>
                              <CommandGroup>
                                {task?.taskAssignees && task.taskAssignees.length > 0 && (
                                  <CommandItem
                                    onSelect={() => handleAssignUser(null)}
                                    className="flex items-center gap-3 p-3 cursor-pointer"
                                  >
                                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                                      <X className="h-4 w-4 text-slate-600" />
                                    </div>
                                    <div>
                                      <div className="font-medium text-sm">Unassign all</div>
                                      <div className="text-xs text-slate-500">Remove all assignees</div>
                                    </div>
                                  </CommandItem>
                                )}
                                {user && (
                                  <CommandItem
                                    onSelect={() => handleAssignUser(user.id)}
                                    className="flex items-center gap-3 p-3 cursor-pointer"
                                  >
                                    <div className="relative">
                                      <EnhancedAvatar
                                        src={user.user_metadata?.avatar_url}
                                        fallbackSeed={user.email || user.user_metadata?.full_name || 'user'}
                                        fallbackSeeds={[user.user_metadata?.full_name || '']}
                                        size="md"
                                        className="h-8 w-8"
                                        alt={user.user_metadata?.full_name || user.email || 'User'}
                                      />
                                      {task?.taskAssignees?.some(ta => ta.user.id === user.id) && (
                                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                          <CheckSquare className="h-2.5 w-2.5 text-white" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">
                                        {user.user_metadata?.full_name || user.email} 
                                        <span className="text-xs text-slate-500 ml-1">(me)</span>
                                        {task?.taskAssignees?.some(ta => ta.user.id === user.id) && (
                                          <span className="text-xs text-emerald-600 ml-1">✓ Assigned</span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-500">{user.email}</div>
                                    </div>
                                  </CommandItem>
                                )}
                                {organizationMembers?.filter(member => member.id !== user?.id).map((member) => (
                                  <CommandItem
                                    key={member.id}
                                    onSelect={() => handleAssignUser(member.id)}
                                    className="flex items-center gap-3 p-3 cursor-pointer"
                                  >
                                    <div className="relative">
                                      <EnhancedAvatar
                                        src={member.avatarUrl}
                                        fallbackSeed={member.fullName || 'user'}
                                        size="md"
                                        className="h-8 w-8"
                                        alt={member.fullName || 'User'}
                                      />
                                      {task?.taskAssignees?.some(ta => ta.user.id === member.id) && (
                                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                          <CheckSquare className="h-2.5 w-2.5 text-white" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">
                                        {member.fullName}
                                        {task?.taskAssignees?.some(ta => ta.user.id === member.id) && (
                                          <span className="text-xs text-emerald-600 ml-1">✓ Assigned</span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-500">{member.email}</div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

              {/* Priority */}
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-3 block">PRIORITY</Label>
                <Select 
                  value={task?.priority || 'medium'}
                  onValueChange={(value) => updateTask({ priority: value })}
                >
                  <SelectTrigger className="w-full bg-white border-slate-200">
                    <SelectValue>
                      {task?.priority && (
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", 
                            task.priority === 'critical' ? 'bg-red-500' :
                            task.priority === 'high' ? 'bg-orange-500' :
                            task.priority === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          )} />
                          {PRIORITIES.find(p => p.id === task.priority)?.name || 'Medium'}
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
                    {PRIORITIES.map((priority) => (
                      <SelectItem key={priority.id} value={priority.id}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", 
                            priority.id === 'critical' ? 'bg-red-500' :
                            priority.id === 'high' ? 'bg-orange-500' :
                            priority.id === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          )} />
                          {priority.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Story Points */}
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-3 block">STORY POINTS</Label>
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-white border-slate-200"
                    >
                      <span>{task?.storyPoints || 0}</span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-2" align="start">
                    <div className="grid grid-cols-4 gap-1">
                      {STORY_POINTS.map((point) => (
                        <Button
                          key={point}
                          variant={task?.storyPoints === point ? "default" : "outline"}
                          size="sm"
                          className="w-full"
                          onClick={async () => {
                            await updateTask({ storyPoints: point });
                          }}
                        >
                          {point}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Due Date */}
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-3 block">DUE DATE</Label>
                <Popover modal={true} open={dueDatePopoverOpen} onOpenChange={setDueDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-slate-600 bg-white border-slate-200 hover:bg-slate-50"
                    >
                      <CalendarDays className="h-4 w-4 mr-2" />
                      {task?.dueDate ? format(new Date(task.dueDate), 'PPP') : 'Set due date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={task?.dueDate ? new Date(task.dueDate) : undefined}
                      onSelect={async (date) => {
                        if (date) {
                          await updateTask({ dueDate: date.toISOString() });
                          setDueDatePopoverOpen(false);
                        }
                      }}
                      initialFocus
                    />
                    <div className="p-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={async () => {
                          await updateTask({ dueDate: null });
                          setDueDatePopoverOpen(false);
                        }}
                      >
                        Clear due date
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Labels */}
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-3 block">LABELS</Label>
                <LabelSelector
                  boardId={task?.board?.id || ''}
                  taskId={taskId}
                  selectedLabels={task?.taskLabels?.map(tl => ({
                    id: tl.label.id,
                    name: tl.label.name,
                    color: tl.label.color || '#3B82F6'
                  })) || []}
                  onTaskUpdate={fetchTask}
                />
              </div>
              </TabsContent>

              {/* Activities Tab */}
              <TabsContent value="activities" className="p-6">
                <TaskActivities 
                  taskId={task?.id || ''} 
                  className=""
                />
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="p-6 space-y-6">
                {/* Worklog Section */}
                <div>                  
                  {/* Add Worklog Entry */}
                  <Card className="border-slate-200 mb-4">
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <Input
                            value={newWorklogHours}
                            onChange={(e) => setNewWorklogHours(e.target.value)}
                            placeholder="Hours (e.g., 2.5)"
                            type="number"
                            step="0.5"
                            min="0"
                            className="w-32 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                          />
                          <Input
                            value={newWorklogDescription}
                            onChange={(e) => setNewWorklogDescription(e.target.value)}
                            placeholder="Work description..."
                            className="flex-1 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                          />
                          <Button 
                            onClick={addWorklogEntry}
                            disabled={!newWorklogDescription.trim() || !newWorklogHours}
                            className="bg-emerald-500 hover:bg-emerald-600"
                          >
                            <Timer className="h-4 w-4 mr-2" />
                            Log Work
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Worklog Entries */}
                  <div className="space-y-3">
                    {worklogEntries.map((entry) => (
                      <Card key={entry.id} className="border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <EnhancedAvatar
                              src={entry.user.avatarUrl}
                              fallbackSeed={entry.user.fullName || 'user'}
                              size="md"
                              className="h-8 w-8"
                              alt={entry.user.fullName || 'User'}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-slate-900">
                                  {entry.user.fullName || 'Unknown User'}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {entry.hoursLogged}h
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  {new Date(entry.dateLogged).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-slate-700">{entry.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Relations Tab */}
              <TabsContent value="relations" className="p-6">
                <RelationsTab 
                  taskId={taskId!} 
                  task={task}
                  onUpdate={onUpdate}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

interface ChecklistComponentProps {
  checklist: Checklist;
  onToggleItem: (checklistId: string, itemId: string, completed: boolean) => void;
  onAddItem: (checklistId: string, text: string) => void;
}

function ChecklistComponent({ checklist, onToggleItem, onAddItem }: ChecklistComponentProps) {
  const [newItemText, setNewItemText] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  
  const completedCount = checklist.items.filter(item => item.completed).length;
  const totalCount = checklist.items.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleAddItem = () => {
    if (newItemText.trim()) {
      onAddItem(checklist.id, newItemText.trim());
      setNewItemText('');
      setShowAddItem(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Checklist Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-slate-900">{checklist.title}</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">
                {completedCount}/{totalCount}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddItem(true)}
                className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          {totalCount > 0 && (
            <div className="space-y-2">
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="text-xs text-slate-500">
                {Math.round(progressPercentage)}% complete
              </div>
            </div>
          )}

          {/* Checklist Items */}
          <div className="space-y-2">
            {checklist.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 group">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={(checked) => onToggleItem(checklist.id, item.id, !!checked)}
                  className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                <span className={cn(
                  "flex-1 text-sm transition-colors",
                  item.completed 
                    ? "line-through text-slate-400" 
                    : "text-slate-700"
                )}>
                  {item.content}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            
            {/* Add Item Input */}
            {showAddItem && (
              <div className="flex items-center gap-2 mt-3">
                <Checkbox disabled className="opacity-50" />
                <Input
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="Add checklist item..."
                  className="h-8 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddItem();
                    } else if (e.key === 'Escape') {
                      setShowAddItem(false);
                      setNewItemText('');
                    }
                  }}
                  onBlur={() => {
                    if (!newItemText.trim()) {
                      setShowAddItem(false);
                    }
                  }}
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleAddItem}
                  disabled={!newItemText.trim()}
                  className="h-8 bg-emerald-500 hover:bg-emerald-600"
                >
                  Add
                </Button>
              </div>
            )}
          </div>

          {/* Add Item Button */}
          {!showAddItem && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddItem(true)}
              className="w-full justify-start text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add item
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}