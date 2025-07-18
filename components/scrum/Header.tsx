'use client';

import { Search, Bell, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  organizationName?: string;
  projectName?: string;
  projectCode?: string;
}

export function Header({ 
  organizationName = "My Organization", 
  projectName = "SCRUM PTA",
  projectCode = "SPDR"
}: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Logo and Navigation */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
              <span className="text-emerald-600 font-bold text-lg">✓</span>
            </div>
            <span className="text-sm font-medium opacity-90">Organization</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm opacity-75">{organizationName}</span>
            <ChevronDown className="w-4 h-4 opacity-75" />
          </div>
          
          <div className="h-6 w-px bg-white/30" />
          
          <div className="flex items-center space-x-2">
            <div className="bg-pink-600 text-white px-2 py-1 rounded text-xs font-bold">
              {projectCode}
            </div>
            <span className="text-lg font-bold">{projectName}</span>
          </div>
        </div>

        {/* Right side - Search and User Menu */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 w-64 bg-white/90 border-0 text-gray-800 placeholder-gray-500"
            />
          </div>
          
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
            <Bell className="w-5 h-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <User className="w-5 h-5" />
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}