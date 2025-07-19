"use client"

import * as React from "react"
import { ChevronsUpDown, GalleryVerticalEnd, Plus, Settings } from "lucide-react"
import Image from "next/image"
import { CreateOrganizationDialog } from "@/components/organizations/create-organization-dialog"
import { EditOrganizationDialog } from "@/components/organizations/edit-organization-dialog"
import { useOrganization } from "@/providers/organization-provider"
import { useOrganizationLogos } from "@/hooks/useOrganizationLogo"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"

export function OrgSwitcher() {
    const { isMobile } = useSidebar()
    const { organizations, activeOrg, setActiveOrg } = useOrganization()
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
    const [imageErrors, setImageErrors] = React.useState<Set<string>>(new Set())
    
    // Generate logo URLs for all organizations
    const { logoUrls } = useOrganizationLogos(organizations)

    const handleImageError = (orgId: string) => {
        setImageErrors(prev => new Set([...prev, orgId]))
    }

    if (!activeOrg) {
        return null
    }

    // Get the logo URL for the active organization
    const activeOrgLogoUrl = logoUrls[activeOrg.id]
    
    return (
        <>
            <SidebarMenu>
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                                size="lg"
                                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            >
                                <div className={`${activeOrgLogoUrl ? '' : 'bg-sidebar-primary text-sidebar-primary-foreground'} flex aspect-square size-8 items-center justify-center rounded-lg`}>
                                    {activeOrgLogoUrl && !imageErrors.has(activeOrg.id) ? (
                                        <Image 
                                            src={activeOrgLogoUrl} 
                                            alt={activeOrg.name} 
                                            width={32} 
                                            height={32} 
                                            className="size-8" 
                                            onError={() => handleImageError(activeOrg.id)}
                                        />
                                    ) : (
                                        <GalleryVerticalEnd className="size-4" />
                                    )}
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{activeOrg.name}</span>
                                    <span className="truncate text-xs">{activeOrg?.description || ''}</span>
                                </div>
                                <ChevronsUpDown className="ml-auto" />
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                            align="start"
                            side={isMobile ? "bottom" : "right"}
                            sideOffset={4}
                        >
                            <DropdownMenuLabel className="text-muted-foreground text-xs">
                                Organizations
                            </DropdownMenuLabel>
                            {organizations.map((org, index) => (
                                <DropdownMenuItem
                                    key={org.id}
                                    onClick={() => setActiveOrg(org)}
                                    className="gap-2 p-2"
                                >
                                    <div className="flex size-6 items-center justify-center rounded-md border">
                                        {logoUrls[org.id] && !imageErrors.has(org.id) ? (
                                            <Image 
                                                src={logoUrls[org.id]!} 
                                                alt={org.name} 
                                                width={14} 
                                                height={14} 
                                                className="size-3.5 shrink-0" 
                                                onError={() => handleImageError(org.id)}
                                            />
                                        ) : (
                                            <GalleryVerticalEnd className="size-3.5 shrink-0" />
                                        )}
                                    </div>
                                    {org.name}
                                    <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                className="gap-2 p-2"
                                onClick={() => setIsEditDialogOpen(true)}
                            >
                                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                                    <Settings className="size-4" />
                                </div>
                                <div className="text-muted-foreground font-medium">Edit organization</div>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                className="gap-2 p-2"
                                onClick={() => setIsCreateDialogOpen(true)}
                            >
                                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                                    <Plus className="size-4" />
                                </div>
                                <div className="text-muted-foreground font-medium">Add organization</div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>

            <CreateOrganizationDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
            />

            {activeOrg && (
                <EditOrganizationDialog
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    organization={activeOrg}
                />
            )}
        </>
    )
}
