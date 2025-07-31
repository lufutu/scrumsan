"use client"

import * as React from "react"
import {
    Home,
    Kanban,
    Plus,
    Settings,
    Search,
    HelpCircle,
    Building2,
    User,
} from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

import { NavMain } from "@/components/dashboard/nav-main"
import { NavSecondary } from "@/components/dashboard/nav-secondary"
import { NavUser } from "@/components/dashboard/nav-user"
import { ExpandableNav } from "@/components/dashboard/expandable-nav"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/animate-ui/radix/sidebar"
import { OrgSwitcher } from "@/components/dashboard/org-switcher"
import { CreateOrganizationDialog } from "@/components/organizations/create-organization-dialog"
import { ProfileEditorDialog } from "@/components/profile/profile-editor-dialog"
import { useOrganization } from "@/providers/organization-provider"
import { useSupabase } from "@/providers/supabase-provider"
import { usePermissions } from "@/hooks/usePermissions"
import NotificationBell from "@/components/notifications/notification-bell"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { organizations, activeOrg, isLoading } = useOrganization()
    const { user } = useSupabase()
    const { canPerformAction } = usePermissions()
    const pathname = usePathname()
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
    const [isProfileDialogOpen, setIsProfileDialogOpen] = React.useState(false)

    // Handle profile dialog opening with permission check
    const handleProfileClick = React.useCallback(() => {
        // Users can always edit their own profile
        // Admins can edit other users' profiles (future functionality)
        setIsProfileDialogOpen(true)
    }, [])

    const navMain = [
        {
            title: "Dashboard",
            url: "/",
            icon: Home,
            isActive: pathname === "/"
        },
        {
            title: "Boards",
            url: "/boards",
            icon: Kanban,
            isActive: pathname.startsWith("/boards")
        },
        {
            title: "Organizations",
            url: "/organizations",
            icon: Building2,
            isActive: pathname.startsWith("/organizations")
        }
    ]

    const navSecondary = [
        {
            title: "Search",
            url: "/search",
            icon: Search,
        },
        {
            title: "Profile",
            icon: User,
            onClick: handleProfileClick,
        },
        {
            title: "Settings",
            url: "/settings", 
            icon: Settings,
        },
        {
            title: "Help & Support",
            url: "/help",
            icon: HelpCircle,
        }
    ]

    const userData = {
        name: user?.user_metadata?.full_name || user?.email || "User",
        email: user?.email || "",
        avatar: user?.user_metadata?.avatar_url || "",
    }

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <div className="flex items-center justify-between w-full">
                            <SidebarMenuButton
                                asChild
                                className="data-[slot=sidebar-menu-button]:!p-1.5 flex-1"
                            >
                                <Link href="/">
                                    <Image className="size-6" src="/logo.png" alt="ScrumSan" width={64} height={64} />
                                    <span className="text-green-700 text-lg font-semibold">ScrumSan</span>
                                </Link>
                            </SidebarMenuButton>
                            {user && <NotificationBell />}
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            
            <SidebarHeader>
                {!isLoading && organizations && organizations.length > 0 && (
                    <OrgSwitcher />
                )}
                {!isLoading && organizations && organizations.length === 0 && (
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => setIsCreateDialogOpen(true)}
                                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                            >
                                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                    <Plus className="size-4" />
                                </div>
                                <span className="text-sm font-medium">Create Organization</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                )}
            </SidebarHeader>
            
            <SidebarContent>
                <NavMain items={navMain} />
                
                {/* Expandable workspace navigation */}
                {!isLoading && organizations && organizations.length > 0 && (
                    <ExpandableNav />
                )}
                
                <NavSecondary items={navSecondary} className="mt-auto" />
            </SidebarContent>
            
            <SidebarFooter>
                <NavUser user={userData} onProfileClick={handleProfileClick} />
            </SidebarFooter>
            <SidebarRail />

            <CreateOrganizationDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
            />

            <ProfileEditorDialog
                isOpen={isProfileDialogOpen}
                onClose={() => setIsProfileDialogOpen(false)}
                initialTab="profile"
            />
        </Sidebar>
    )
}
