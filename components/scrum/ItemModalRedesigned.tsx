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
  Send
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, VisuallyHidden } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getItemTypeColor } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
}

export function ItemModalRedesigned({
  isOpen,
  onClose,
  taskId,
  onUpdate
}: ItemModalProps) {
  const { supabase, user } = useSupabase();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('details');
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (taskId && isOpen) {
      fetchTask();
      fetchComments();
    }
  }, [taskId, isOpen]);

  const fetchTask = async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!assignee_id (
            id,
            full_name,
            avatar_url
          ),
          created_by_user:users!created_by (
            id,
            full_name
          ),
          board:boards!board_id (
            id,
            name
          ),
          project:projects!project_id (
            id,
            name
          ),
          column:board_columns!column_id (
            id,
            name
          )
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;

      setTask(data);
      setTitle(data.title);
      setDescription(data.description || '');
      
      // Load checklists if any (you might want to create a separate table for this)
      // For now, we'll use a placeholder
      setChecklistItems([]);
      
    } catch (error) {
      console.error('Error fetching task:', error);
      toast({
        title: "Error",
        description: "Failed to load task details"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!taskId) return;
    
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:users!user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') throw error;

      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const updateTask = async (updates: Partial<Task>) => {
    if (!taskId) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task updated successfully"
      });
      
      onUpdate?.();
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !taskId || !user) return;
    
    try {
      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      fetchComments();
      
      toast({
        title: "Success",
        description: "Comment added"
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment"
      });
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'story': return '✨';
      case 'bug': return '🐛';
      case 'task': return '✔️';
      case 'epic': return '⚡';
      case 'improvement': return '📈';
      case 'idea': return '💡';
      case 'note': return '📝';
      default: return '📋';
    }
  };


  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklistItems([
        ...checklistItems,
        {
          id: Date.now().toString(),
          text: newChecklistItem,
          completed: false
        }
      ]);
      setNewChecklistItem('');
    }
  };

  const toggleChecklistItem = (id: string) => {
    setChecklistItems(checklistItems.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const deleteChecklistItem = (id: string) => {
    setChecklistItems(checklistItems.filter(item => item.id !== id));
  };

  const handleSaveTitle = () => {
    if (title !== task?.title) {
      updateTask({ title });
    }
  };

  const handleSaveDescription = () => {
    if (description !== task?.description) {
      updateTask({ description });
    }
  };

  if (!task && !isLoading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1200px] h-[90vh] p-0 gap-0">
        <VisuallyHidden>
          <DialogTitle>Item Details</DialogTitle>
        </VisuallyHidden>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded flex items-center justify-center text-sm",
              getItemTypeColor(task?.task_type || 'task').color,
              getItemTypeColor(task?.task_type || 'task').bgColor
            )}>
              {getTaskTypeIcon(task?.task_type || 'task')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 uppercase">{task?.task_type || 'TASK'}</span>
              {task?.board && (
                <>
                  <span className="text-gray-300">▸</span>
                  <span className="text-gray-700 font-medium">{task.board.name}</span>
                </>
              )}
              <span className="text-gray-500">#{task?.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Flag className="h-4 w-4 text-gray-500" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Share</DropdownMenuItem>
                <DropdownMenuItem>Copy link</DropdownMenuItem>
                <DropdownMenuItem>Move to top</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Task Status Bar */}
        <div className="flex items-center gap-4 px-6 py-2 border-b">
          <Select 
            value={task?.sprint_id || 'backlog'}
            onValueChange={(value) => updateTask({ sprint_id: value === 'backlog' ? null : value })}
          >
            <SelectTrigger className="w-32 h-8 bg-teal-500 text-white border-0 hover:bg-teal-600">
              <SelectValue placeholder="Backlog" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="sprint1">Sprint 1</SelectItem>
              <SelectItem value="sprint2">Sprint 2</SelectItem>
            </SelectContent>
          </Select>
          
          <span className="text-gray-400">→</span>
          
          <Select 
            value={task?.status || 'todo'}
            onValueChange={(value) => updateTask({ status: value })}
          >
            <SelectTrigger className="w-32 h-8 bg-gray-100 border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="ml-auto text-sm text-gray-500">
            {task?.column?.name || 'Active'}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel */}
          <div className="flex-1 overflow-y-auto">
            {/* Title */}
            <div className="px-6 py-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSaveTitle}
                className="text-2xl font-semibold w-full border-0 outline-none focus:ring-0"
                placeholder="Task title..."
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6">
              <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b rounded-none">
                <TabsTrigger 
                  value="details"
                  className="px-4 pb-3 data-[state=active]:border-b-2 data-[state=active]:border-teal-500 rounded-none"
                >
                  DETAILS
                </TabsTrigger>
                <TabsTrigger 
                  value="worklog"
                  className="px-4 pb-3 data-[state=active]:border-b-2 data-[state=active]:border-teal-500 rounded-none"
                >
                  WORKLOG
                </TabsTrigger>
                <TabsTrigger 
                  value="relations"
                  className="px-4 pb-3 data-[state=active]:border-b-2 data-[state=active]:border-teal-500 rounded-none"
                >
                  RELATIONS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-6 space-y-6">
                {/* Description */}
                <div>
                  <Label className="text-sm font-medium text-gray-500 mb-2">DESCRIPTION</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleSaveDescription}
                    className="min-h-[100px] resize-none"
                    placeholder="Add a description..."
                  />
                </div>

                {/* Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-gray-500">CHECKLISTS</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-teal-600 hover:text-teal-700"
                      onClick={() => setNewChecklistItem('Add Checklist Item')}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {checklistItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 group">
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => toggleChecklistItem(item.id)}
                          className="data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                        />
                        <span className={cn(
                          "flex-1 text-sm",
                          item.completed && "line-through text-gray-400"
                        )}>
                          {item.text}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => deleteChecklistItem(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    
                    {newChecklistItem && (
                      <div className="flex items-center gap-2">
                        <Checkbox disabled />
                        <Input
                          value={newChecklistItem}
                          onChange={(e) => setNewChecklistItem(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addChecklistItem();
                            }
                          }}
                          onBlur={addChecklistItem}
                          placeholder="Add checklist item..."
                          className="h-8"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="link"
                    className="text-teal-600 p-0 h-auto mt-2"
                    onClick={() => setNewChecklistItem('Add Checklist Item')}
                  >
                    Add Checklist Item
                  </Button>
                </div>

                {/* Files */}
                <div>
                  <Label className="text-sm font-medium text-gray-500 mb-3 block">FILES</Label>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:bg-gray-50 flex flex-col items-center justify-center">
                      <Upload className="h-6 w-6 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">Upload file</span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    Pasted images will appear here
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <Label className="text-sm font-medium text-gray-500 mb-3 block">COMMENTS</Label>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {user?.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a comment..."
                          className="min-h-[80px]"
                        />
                        <Button 
                          size="sm" 
                          className="mt-2"
                          onClick={addComment}
                          disabled={!newComment.trim()}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Comment
                        </Button>
                      </div>
                    </div>
                    
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.user.avatar_url || ''} />
                          <AvatarFallback className="text-xs">
                            {comment.user.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {comment.user.full_name || 'Unknown User'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="worklog" className="mt-6">
                <div className="text-center py-12 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No work logged yet</p>
                  <Button variant="outline" className="mt-3">
                    Log Work
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="relations" className="mt-6">
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-500 mb-2">PARENT ITEM</Label>
                    <div className="text-sm text-gray-600">No parent item</div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-500 mb-2">SUBTASKS</Label>
                    <div className="text-sm text-gray-600">No subtasks</div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-500 mb-2">BLOCKING</Label>
                    <div className="text-sm text-gray-600">Not blocking any items</div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-500 mb-2">BLOCKED BY</Label>
                    <div className="text-sm text-gray-600">Not blocked by any items</div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 border-l bg-gray-50 p-6 space-y-6 overflow-y-auto">
            {/* Performers */}
            <div>
              <Label className="text-sm font-medium text-gray-500 mb-3 block">PERFORMERS</Label>
              <div className="space-y-3">
                {task?.assignee && (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={task.assignee.avatar_url || ''} />
                      <AvatarFallback className="bg-pink-500 text-white text-xs">
                        {task.assignee.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{task.assignee.full_name || 'Unassigned'}</div>
                      <div className="text-xs text-gray-500">Assignee</div>
                    </div>
                  </div>
                )}
                
                {!task?.assignee && (
                  <div className="text-sm text-gray-500">No assignee</div>
                )}
              </div>
              
              <Button variant="link" className="text-teal-600 p-0 h-auto mt-2 text-sm">
                <Users className="h-3 w-3 mr-1" />
                Add performer
              </Button>
            </div>

            {/* Labels */}
            <div>
              <Label className="text-sm font-medium text-gray-500 mb-3 block">LABELS</Label>
              <div className="flex flex-wrap gap-2">
                {('labels' in task && task.labels) ? (
                  (task.labels as any[]).map((label, index) => (
                    <Badge key={index} className="bg-blue-900 text-white hover:bg-blue-800">
                      {label.name}
                      <X className="h-3 w-3 ml-1 cursor-pointer" />
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No labels</span>
                )}
              </div>
              <Button variant="link" className="text-teal-600 p-0 h-auto mt-2 text-sm">
                <Tag className="h-3 w-3 mr-1" />
                Add label
              </Button>
            </div>

            {/* Estimations */}
            <div>
              <Label className="text-sm font-medium text-gray-500 mb-3 block">ESTIMATIONS</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Story Points</span>
                  <Select 
                    value={('story_points' in task && task.story_points?.toString()) || '0'}
                    onValueChange={(value) => updateTask({ story_points: parseInt(value) } as any)}
                  >
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                      <SelectItem value="13">13</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <Label className="text-sm font-medium text-gray-500 mb-2 block">DUE DATE</Label>
              {task?.due_date ? (
                <Button variant="outline" className="w-full justify-start text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  {new Date(task.due_date).toLocaleDateString()}
                </Button>
              ) : (
                <Button variant="outline" className="w-full justify-start text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  Set due date
                </Button>
              )}
            </div>

            {/* Followers */}
            <div>
              <Label className="text-sm font-medium text-gray-500 mb-3 block">FOLLOWERS</Label>
              <div className="flex -space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full border-2 bg-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}