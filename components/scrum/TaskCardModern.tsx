'use client';

import { 
  Paperclip, 
  MessageCircle, 
  GitBranch,
  ListTodo,
  Calendar,
  Flag
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getItemTypeColor, getPriorityColor, getItemTypeById } from '@/lib/constants';

interface TaskCardModernProps {
  id: string;
  itemCode?: string;
  title: string;
  description?: string;
  taskType: 'story' | 'bug' | 'task' | 'epic' | 'improvement' | 'idea' | 'note';
  storyPoints?: number;
  assignee?: {
    name: string;
    avatar?: string;
    initials: string;
  };
  labels?: Array<{
    name: string;
    color: string;
  }>;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  commentsCount?: number;
  filesCount?: number;
  checklistsCount?: number;
  completedChecklists?: number;
  subitemsCount?: number;
  dueDate?: string;
  url?: string;
  status?: 'todo' | 'in_progress' | 'done';
  onClick?: () => void;
}

export function TaskCardModern({
  id,
  itemCode,
  title,
  taskType,
  storyPoints,
  assignee,
  labels = [],
  priority,
  commentsCount = 0,
  filesCount = 0,
  checklistsCount = 0,
  completedChecklists = 0,
  subitemsCount = 0,
  dueDate,
  status = 'todo',
  onClick
}: TaskCardModernProps) {

  const checklistProgress = checklistsCount ? 
    Math.round((completedChecklists || 0) / checklistsCount * 100) : 0

  return (
    <div 
      className={cn(
        "group bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-pointer",
        "shadow-sm",
        status === 'done' && "opacity-75"
      )}
      onClick={onClick}
    >
      {/* Task Header with Icon and ID */}
      <div className="flex items-center gap-2 p-3 pb-2">
        <div className={cn(
          "w-6 h-6 rounded flex items-center justify-center text-white text-sm flex-shrink-0",
          getItemTypeColor(taskType).bgColor
        )}>
          {getItemTypeById(taskType)?.icon || '●'}
        </div>
        <span className="text-xs text-gray-500 font-medium">
          {itemCode || `#${id.slice(0, 8).toUpperCase()}`}
        </span>
      </div>

      {/* Task Title */}
      <div className="px-3 pb-2">
        <h3 className={cn(
          "text-sm font-medium text-gray-900 line-clamp-2",
          status === 'done' && "line-through"
        )}>
          {title}
        </h3>
      </div>

      {/* Labels */}
      {labels.length > 0 && (
        <div className="px-3 pb-2">
          <div className="flex flex-wrap gap-1">
            {labels.map((label, index) => (
              <div
                key={index}
                className="h-2 rounded-full"
                style={{ backgroundColor: label.color, minWidth: '60px' }}
                title={label.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Assignee Row */}
      {assignee && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5 flex-shrink-0">
              <AvatarImage src={assignee.avatar || ''} />
              <AvatarFallback className="text-xs bg-blue-500 text-white">
                {assignee.initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-600 font-medium">
              {assignee.name}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Info Row */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {/* Story Points */}
            {storyPoints && storyPoints > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-medium text-blue-700">
                    {storyPoints}
                  </span>
                </div>
              </div>
            )}

            {/* Due Date */}
            {dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            )}

            {/* Comments */}
            {commentsCount > 0 && (
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                <span>{commentsCount}</span>
              </div>
            )}

            {/* Attachments */}
            {filesCount > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                <span>{filesCount}</span>
              </div>
            )}

            {/* Checklist Progress */}
            {checklistsCount > 0 && (
              <div className="flex items-center gap-1">
                <ListTodo className="h-3 w-3" />
                <span>{completedChecklists || 0}/{checklistsCount}</span>
              </div>
            )}
          </div>

          {/* Priority Badge */}
          {priority && priority !== 'medium' && (
            <Badge className={cn("text-xs px-2 py-0", getPriorityColor(priority).color, getPriorityColor(priority).bgColor)}>
              {priority}
            </Badge>
          )}
        </div>
      </div>

      {/* Checklist Progress Bar */}
      {checklistsCount > 0 && (
        <div className="px-3 pb-3">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-green-500 h-1 rounded-full transition-all"
              style={{ width: `${checklistProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}