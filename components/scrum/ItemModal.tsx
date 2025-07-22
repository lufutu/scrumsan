'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  MoreHorizontal,
  MessageSquare,
  Paperclip,
  Clock,
  Calendar,
  Flag,
  Tag,
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
import { Dialog, DialogContent, DialogTitle, VisuallyHidden } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getItemTypeColor, ITEM_TYPES, PRIORITIES, STORY_POINTS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSupabase } from '@/providers/supabase-provider';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/types/database';
import { FileUploadQueue } from '@/components/ui/file-upload-queue';
import { RelationsTab } from '@/components/scrum/RelationsTab';
import { toast } from 'sonner';

type Task = Tables<'tasks'> & {
  assignee?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
  created_by_user?: {
    id: string
    full_name: string | null
  } | null
  board?: {
    id: string
    name: string
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

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId?: string;
  onUpdate?: () => void;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  position: number;
}

interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
  created_at: string;
}

interface Comment {
  id: string;
  content: string;
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  created_at: string;
  updated_at: string;
}

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string | null;
  uploadedAt: string;
  uploadedByUser: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  error?: string;
}

interface WorklogEntry {
  id: string;
  description: string;
  hoursLogged: number;
  dateLogged: string;
  user: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}

export function ItemModal({
  isOpen,
  onClose,
  taskId,
  onUpdate
}: ItemModalProps) {
  const { supabase, user } = useSupabase();
  const { toast: showToast } = useToast();
  const [activeTab, setActiveTab] = useState('details');
  const [task, setTask] = useState<Task | null>(null);
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

  useEffect(() => {
    if (taskId && isOpen) {
      fetchTask();
      fetchChecklists();
      fetchComments();
      fetchAttachments();
      fetchWorklog();
    }
  }, [taskId, isOpen]);

  const fetchTask = async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch task: ${response.status}`);
      }

      const data = await response.json();
      setTask(data);
      setTitle(data.title);
      setDescription(data.description || '');
      
    } catch (error) {
      console.error('Error fetching task:', error);
      showToast({
        title: "Error",
        description: "Failed to load task details",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      const updatedTask = await response.json();
      setTask(updatedTask);
      
      toast.success('Task updated successfully');
      onUpdate?.();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
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
        body: JSON.stringify({ title: newChecklistTitle.trim() })
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
        body: JSON.stringify({ text })
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

  const handleDelete = async () => {
    if (!taskId) return;
    
    if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete task');
        }
        
        toast.success('Task deleted');
        onUpdate?.();
        onClose();
      } catch (error) {
        console.error('Error deleting task:', error);
        toast.error('Failed to delete task');
      }
    }
  };

  if (!task && !isLoading) return null;

  // Handle dialog close only when user explicitly wants to close
  const handleDialogOpenChange = (open: boolean) => {
    // Only close when dialog is being closed (open = false) AND not during other state changes
    if (!open) {
      onClose();
    }
  };

  return (
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
            <Label className="text-sm font-medium text-slate-600">Sprint:</Label>
            <Select 
              value={task?.sprint_id || 'backlog'}
              onValueChange={(value) => updateTask({ sprint_id: value === 'backlog' ? null : value })}
            >
              <SelectTrigger className="w-36 h-8 bg-emerald-500 text-white border-0 hover:bg-emerald-600">
                <SelectValue placeholder="Backlog" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Product Backlog</SelectItem>
                <SelectItem value="sprint1">Sprint 1</SelectItem>
                <SelectItem value="sprint2">Sprint 2</SelectItem>
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
                    <Button size="sm" onClick={handleSaveTitle} disabled={isSaving}>
                      {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
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

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="px-8">
              <TabsList className="w-full justify-start h-12 p-1 bg-slate-100 rounded-lg mb-6">
                <TabsTrigger 
                  value="details"
                  className="px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md font-medium"
                >
                  Details
                </TabsTrigger>
                <TabsTrigger 
                  value="checklists"
                  className="px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md font-medium"
                >
                  Checklists ({checklists.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="worklog"
                  className="px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md font-medium"
                >
                  Worklog ({worklogEntries.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="relations"
                  className="px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md font-medium"
                >
                  Relations
                </TabsTrigger>
                <TabsTrigger 
                  value="files"
                  className="px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md font-medium"
                >
                  Files ({attachments.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-8">
                {/* Description */}
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-3 block">DESCRIPTION</Label>
                  {editingDescription ? (
                    <div className="space-y-3">
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-[120px] resize-none border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                        placeholder="Add a detailed description..."
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveDescription} disabled={isSaving}>
                          {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
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
                        <p className="text-slate-700 whitespace-pre-wrap">{description}</p>
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
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user?.user_metadata?.avatar_url} />
                            <AvatarFallback className="text-xs bg-emerald-500 text-white">
                              {user?.email?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
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
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={comment.user.avatarUrl || ''} />
                              <AvatarFallback className="text-xs bg-slate-500 text-white">
                                {comment.user.fullName?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
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
              </TabsContent>

              <TabsContent value="checklists" className="space-y-6">
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
              </TabsContent>

              <TabsContent value="worklog" className="space-y-6">
                {/* Add Worklog Entry */}
                <Card className="border-slate-200">
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
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={entry.user.avatarUrl || ''} />
                            <AvatarFallback className="text-xs bg-blue-500 text-white">
                              {entry.user.fullName?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
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
              </TabsContent>

              <TabsContent value="relations" className="space-y-6">
                <RelationsTab 
                  taskId={taskId!} 
                  task={task}
                  onUpdate={onUpdate}
                />
              </TabsContent>

              <TabsContent value="files" className="space-y-6">
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
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 border-l bg-slate-50 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Assignee */}
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-3 block">ASSIGNEE</Label>
                {task?.assignee ? (
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={task.assignee.avatar_url || ''} />
                      <AvatarFallback className="bg-emerald-500 text-white text-sm">
                        {task.assignee.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-slate-900">
                        {task.assignee.full_name || 'Unassigned'}
                      </div>
                      <div className="text-xs text-slate-500">Assignee</div>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-slate-600 border-slate-200 hover:bg-white"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign someone
                  </Button>
                )}
              </div>

              {/* Priority */}
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-3 block">PRIORITY</Label>
                <Select 
                  value={task?.priority || 'medium'}
                  onValueChange={(value) => updateTask({ priority: value })}
                >
                  <SelectTrigger className="w-full bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((priority) => (
                      <SelectItem key={priority.id} value={priority.id}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", priority.color)} />
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
                <Select 
                  value={task?.story_points?.toString() || '0'}
                  onValueChange={(value) => updateTask({ story_points: parseInt(value) })}
                >
                  <SelectTrigger className="w-full bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STORY_POINTS.map((point) => (
                      <SelectItem key={point} value={point.toString()}>
                        {point}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-3 block">DUE DATE</Label>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-slate-600 bg-white border-slate-200 hover:bg-slate-50"
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  {task?.due_date ? new Date(task.due_date).toLocaleDateString() : 'Set due date'}
                </Button>
              </div>

              {/* Labels */}
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-3 block">LABELS</Label>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-slate-600 bg-white border-slate-200 hover:bg-slate-50"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Add labels
                </Button>
              </div>

              {/* Progress */}
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-3 block">PROGRESS</Label>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Completion</span>
                    <span className="font-medium">65%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <div className="text-xs text-slate-500">
                    Based on completed checklist items and subtasks
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
                  {item.text}
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