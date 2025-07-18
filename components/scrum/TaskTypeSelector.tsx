'use client';

import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ITEM_TYPES, type ItemType } from '@/lib/constants';

interface TaskTypeSelectorProps {
  selectedType?: ItemType;
  onTypeSelect: (type: ItemType) => void;
  className?: string;
}

export function TaskTypeSelector({ 
  selectedType = ITEM_TYPES[0], 
  onTypeSelect,
  className 
}: TaskTypeSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "justify-between h-10 px-3 py-2 border-gray-300 hover:bg-gray-50",
            className
          )}
        >
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center text-white text-xs",
              selectedType.bgColor
            )}>
              {selectedType.icon}
            </div>
            <span className="text-sm font-medium text-gray-700">
              {selectedType.name.toUpperCase()}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-48">
        {ITEM_TYPES.map((type) => (
          <DropdownMenuItem
            key={type.id}
            onClick={() => onTypeSelect(type)}
            className={cn(
              "flex items-center space-x-3 py-2 px-3 cursor-pointer",
              selectedType.id === type.id && "bg-gray-100"
            )}
          >
            <div className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center text-white text-xs",
              type.bgColor
            )}>
              {type.icon}
            </div>
            <span className="text-sm font-medium text-gray-700">
              {type.name}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}