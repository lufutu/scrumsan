"use client"

import {
    Bell,
    CreditCard,
    LogOut,
    ChevronsUpDown,
    BadgeCheck,
    Sparkles,
    User,
} from "lucide-react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/animate-ui/radix/sidebar"
import { EnhancedAvatar } from "@/components/ui/enhanced-avatar"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
export function NavUser({
    user,
    onProfileClick,
}: {
    user: {
        name: string
        email: string
        avatar: string
    }
    onProfileClick?: () => void
}) {
    const { isMobile } = useSidebar()
    const router = useRouter()

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            tooltip={user.name}
                        >
                            <EnhancedAvatar
                                src={user.avatar}
                                fallbackSeed={user.email || user.name}
                                size="md"
                                className="h-8 w-8 rounded-lg"
                                alt={user.name}
                            />
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{user.name}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {user.email}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div 
                                className="flex items-center gap-2 px-1 py-1.5 text-left text-sm cursor-pointer hover:bg-accent rounded-md transition-colors"
                                onClick={onProfileClick}
                            >
                                <EnhancedAvatar
                                    src={user.avatar}
                                    fallbackSeed={user.email || user.name}
                                    size="md"
                                    className="h-8 w-8 rounded-lg"
                                    alt={user.name}
                                />
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{user.name}</span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        {user.email}
                                    </span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem>
                                <Sparkles />
                                Upgrade to Pro
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={onProfileClick}>
                                <User />
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <BadgeCheck />
                                Account
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <CreditCard />
                                Billing
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Bell />
                                Notifications
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={async () => {
                            await supabase.auth.signOut()
                            router.refresh()
                        }}>
                            <LogOut />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
