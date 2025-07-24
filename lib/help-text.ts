/**
 * @fileoverview Help text and tooltip configurations for team management features
 * 
 * This module provides comprehensive help text, tooltips, and inline guidance
 * for complex team management features. It includes contextual help for
 * permissions, availability calculations, and advanced features.
 * 
 * @author Team Management System
 * @version 1.0.0
 */

/**
 * Help text configuration for different UI components and features
 */
export const helpText = {
  /**
   * Permission system help text
   */
  permissions: {
    overview: {
      title: "Permission System Overview",
      content: `The permission system uses role-based access control with custom permission sets. 
                Members can have default roles (Owner, Admin, Member, Guest) or be assigned custom 
                permission sets for granular control.`
    },
    
    roles: {
      owner: {
        title: "Organization Owner",
        content: `Has complete control over the organization including member management, 
                  billing, and organization settings. Cannot be changed by other members.`
      },
      admin: {
        title: "Administrator",
        content: `Can manage team members, projects, and organization settings. 
                  Has broad permissions but cannot modify owner permissions.`
      },
      member: {
        title: "Member",
        content: `Standard team member with access to assigned projects and basic features. 
                  Can view own profile and assigned work.`
      },
      guest: {
        title: "Guest",
        content: `Limited access user, typically external collaborators. 
                  Can only view assigned projects with restricted permissions.`
      }
    },

    customSets: {
      overview: {
        title: "Custom Permission Sets",
        content: `Create tailored permission configurations for specific roles in your organization. 
                  Custom sets override default role permissions and allow fine-grained access control.`
      },
      
      dependencies: {
        title: "Permission Dependencies",
        content: `Some permissions require others to function properly. For example, 
                  "Manage all projects" requires "View all projects" to be enabled first.`
      },
      
      categories: {
        teamMembers: {
          title: "Team Members Permissions",
          viewAll: "View all organization members and their basic information",
          manageAll: "Add, remove, and modify team member roles and permissions"
        },
        
        projects: {
          title: "Project Permissions",
          viewAll: "View all projects in the organization",
          manageAll: "Create, modify, and delete any project",
          viewAssigned: "View projects where the member is assigned",
          manageAssigned: "Modify projects where the member has management rights"
        },
        
        invoicing: {
          title: "Invoicing Permissions",
          viewAll: "View all invoicing data and financial information",
          manageAll: "Create, modify, and delete invoicing data",
          viewAssigned: "View invoicing data for assigned projects/clients",
          manageAssigned: "Manage invoicing for assigned projects/clients"
        },
        
        clients: {
          title: "Client Management Permissions",
          viewAll: "View all client information and relationships",
          manageAll: "Create, modify, and delete client records",
          viewAssigned: "View clients assigned to the member",
          manageAssigned: "Manage assigned client relationships"
        },
        
        worklogs: {
          title: "Worklog Permissions",
          manageAll: "View and modify all team member worklogs and time tracking"
        }
      }
    }
  },

  /**
   * Availability and engagement help text
   */
  availability: {
    overview: {
      title: "Availability Calculation",
      content: `Member availability is calculated by subtracting engaged hours from total working hours. 
                Time-off periods are also considered for accurate availability tracking.`
    },
    
    workingHours: {
      title: "Working Hours per Week",
      content: `The total number of hours a member is expected to work per week. 
                This forms the baseline for availability calculations. Default is 40 hours.`
    },
    
    engagements: {
      title: "Project Engagements",
      content: `Active project assignments that consume member capacity. 
                Each engagement specifies hours per week and duration.`
    },
    
    utilization: {
      title: "Utilization Percentage",
      content: `The percentage of working hours currently allocated to active engagements. 
                100% means fully allocated, over 100% indicates overallocation.`,
      colors: {
        low: "Gray (0-40%): Low utilization, member has significant availability",
        moderate: "Blue (40-70%): Moderate utilization, good work-life balance",
        good: "Green (70-90%): Good utilization, efficiently allocated",
        high: "Amber (90-100%): High utilization, limited availability",
        over: "Red (100%+): Overallocated, may lead to burnout"
      }
    },
    
    timeOff: {
      title: "Time-off Integration",
      content: `Time-off entries affect availability calculations during the specified periods. 
                Approved time-off reduces effective available hours for planning purposes.`
    },
    
    conflicts: {
      title: "Engagement Conflicts",
      content: `The system detects conflicts when:
                • Multiple engagements on the same project overlap
                • Total engaged hours exceed working capacity
                • Engagement dates are invalid or unrealistic`
    }
  },

  /**
   * Member profile help text
   */
  profiles: {
    overview: {
      title: "Member Profiles",
      content: `Extended member information including contact details, social media, 
                and personal information with configurable visibility settings.`
    },
    
    visibility: {
      title: "Visibility Settings",
      content: `Control who can see specific profile information:
                • Admin: Only organization owners and admins can view
                • Member: All organization members can view`,
      admin: "Visible to organization owners and administrators only",
      member: "Visible to all organization members"
    },
    
    fields: {
      secondaryEmail: "Alternative email address for communication",
      address: "Physical address for office visits or mail",
      phone: "Contact phone number for urgent communications",
      linkedin: "LinkedIn profile URL for professional networking",
      skype: "Skype username for video calls and meetings",
      twitter: "Twitter handle for social media presence",
      birthday: "Birthday for team celebrations and personal touch",
      maritalStatus: "Marital status for understanding personal context",
      family: "Family information for emergency contacts and context",
      other: "Additional information or notes about the member"
    }
  },

  /**
   * Time-off management help text
   */
  timeOff: {
    overview: {
      title: "Time-off Management",
      content: `Track and manage member absences including vacation, sick leave, 
                and other time-off types. Integrates with availability calculations.`
    },
    
    types: {
      vacation: "Planned vacation time, typically requires advance approval",
      parental_leave: "Maternity/paternity leave for new parents",
      sick_leave: "Medical leave for illness or medical appointments",
      paid_time_off: "General paid time off that can be used flexibly",
      unpaid_time_off: "Unpaid leave for personal reasons",
      other: "Other types of leave not covered by standard categories"
    },
    
    status: {
      pending: "Request submitted but not yet reviewed by management",
      approved: "Request approved and will affect availability calculations",
      rejected: "Request denied, does not affect availability"
    },
    
    validation: {
      title: "Time-off Validation",
      content: `The system validates time-off requests for:
                • Date conflicts with existing approved time-off
                • Reasonable date ranges (end after start)
                • Excessive vacation usage warnings`
    }
  },

  /**
   * Filtering and search help text
   */
  filtering: {
    overview: {
      title: "Advanced Filtering",
      content: `Use multiple filter criteria to find specific team members. 
                Filters can be combined and saved for future use.`
    },
    
    roles: {
      title: "Role Filter",
      content: "Filter members by their organization role or custom permission set"
    },
    
    projects: {
      title: "Project Filter",
      content: "Show only members assigned to specific projects"
    },
    
    hours: {
      title: "Hours Filter",
      content: "Filter by working hours range to find part-time or full-time members"
    },
    
    availability: {
      title: "Availability Filter",
      content: "Find members with specific availability ranges for project planning"
    },
    
    search: {
      title: "Search",
      content: "Search across member names, email addresses, and job titles"
    },
    
    savedFilters: {
      title: "Saved Filters",
      content: "Save frequently used filter combinations for quick access"
    }
  },

  /**
   * Timeline and events help text
   */
  timeline: {
    overview: {
      title: "Member Timeline",
      content: `Track important events and milestones in a member's journey 
                with the organization. Useful for performance reviews and history.`
    },
    
    events: {
      title: "Timeline Events",
      content: `Record significant events such as:
                • Promotions and role changes
                • Completed certifications or training
                • Project milestones and achievements
                • Performance review outcomes
                • Other important career moments`
    }
  },

  /**
   * Security and audit help text
   */
  security: {
    overview: {
      title: "Security and Auditing",
      content: `The system maintains detailed audit logs of all sensitive operations 
                and provides security features to protect member data.`
    },
    
    auditLogs: {
      title: "Audit Logs",
      content: `Comprehensive logging of all member management activities including:
                • Member additions and removals
                • Role and permission changes
                • Profile updates and access
                • Engagement modifications
                • Time-off approvals and changes`
    },
    
    dataPrivacy: {
      title: "Data Privacy",
      content: `Member data is protected through:
                • Role-based access controls
                • Field-level visibility settings
                • Audit logging of data access
                • Secure data transmission and storage`
    }
  },

  /**
   * Integration and API help text
   */
  integration: {
    overview: {
      title: "Integration and API",
      content: `The team management system provides comprehensive APIs 
                for integration with other tools and custom applications.`
    },
    
    webhooks: {
      title: "Webhooks",
      content: `Real-time notifications for important events:
                • Member additions and changes
                • Engagement updates
                • Time-off approvals
                • Permission modifications`
    },
    
    rateLimit: {
      title: "Rate Limiting",
      content: `API requests are rate-limited to ensure system stability:
                • 100 requests per minute for general operations
                • 50 requests per minute for search operations
                • 10 requests per minute for bulk operations`
    }
  }
} as const

/**
 * Tooltip configurations for UI elements
 */
export const tooltips = {
  /**
   * Button and action tooltips
   */
  actions: {
    addMember: "Add a new team member to the organization",
    removeMember: "Remove this member from the organization",
    editMember: "Edit member information and permissions",
    viewProfile: "View detailed member profile information",
    addEngagement: "Create a new project engagement for this member",
    editEngagement: "Modify this project engagement",
    removeEngagement: "Remove this project engagement",
    addTimeOff: "Request or add time-off for this member",
    approveTimeOff: "Approve this time-off request",
    rejectTimeOff: "Reject this time-off request",
    addTimelineEvent: "Add a new timeline event for this member",
    createPermissionSet: "Create a new custom permission set",
    editPermissionSet: "Modify this permission set",
    deletePermissionSet: "Delete this permission set (members will be reassigned)",
    saveFilter: "Save this filter combination for future use",
    clearFilters: "Clear all active filters",
    exportData: "Export member data to CSV or Excel format",
    importData: "Import member data from CSV or Excel file"
  },

  /**
   * Status and indicator tooltips
   */
  status: {
    available: "Member has available capacity for new work",
    busy: "Member is highly utilized but not overallocated",
    overallocated: "Member is allocated beyond their working capacity",
    onTimeOff: "Member is currently on approved time-off",
    inactive: "Member account is inactive or suspended",
    pending: "Invitation sent but not yet accepted",
    guest: "External collaborator with limited access"
  },

  /**
   * Form field tooltips
   */
  fields: {
    workingHours: "Total hours per week this member is expected to work (default: 40)",
    joinDate: "Date when the member joined the organization",
    jobTitle: "Member's job title or position in the organization",
    permissionSet: "Custom permission set that overrides default role permissions",
    engagementHours: "Hours per week allocated to this project engagement",
    engagementRole: "Member's role or responsibility in this project",
    timeOffType: "Category of time-off being requested",
    timeOffDescription: "Optional description or reason for the time-off",
    visibilityLevel: "Who can view this profile information"
  },

  /**
   * Validation and error tooltips
   */
  validation: {
    required: "This field is required",
    email: "Please enter a valid email address",
    phone: "Please enter a valid phone number",
    url: "Please enter a valid URL",
    date: "Please select a valid date",
    dateRange: "End date must be after start date",
    hours: "Hours must be between 0 and 168 (hours in a week)",
    capacity: "This would exceed the member's available capacity",
    conflict: "This conflicts with an existing engagement or time-off",
    permission: "You don't have permission to perform this action"
  }
} as const

/**
 * Contextual help for complex workflows
 */
export const workflows = {
  addingMembers: {
    title: "Adding Team Members",
    steps: [
      {
        title: "Enter Member Information",
        content: "Provide the new member's email address and basic information. If they don't have an account, an invitation will be sent."
      },
      {
        title: "Assign Role and Permissions",
        content: "Choose a default role or assign a custom permission set that matches their responsibilities."
      },
      {
        title: "Set Working Details",
        content: "Configure working hours, job title, and join date for accurate availability tracking."
      },
      {
        title: "Review and Confirm",
        content: "Review all information before adding the member. They will receive an invitation email if needed."
      }
    ]
  },

  managingEngagements: {
    title: "Managing Project Engagements",
    steps: [
      {
        title: "Check Availability",
        content: "Review the member's current availability and utilization before adding new engagements."
      },
      {
        title: "Select Project and Role",
        content: "Choose the project and define the member's role or responsibilities in the engagement."
      },
      {
        title: "Set Hours and Duration",
        content: "Specify hours per week and engagement duration. The system will validate capacity."
      },
      {
        title: "Monitor and Adjust",
        content: "Track engagement progress and adjust hours or duration as needed throughout the project."
      }
    ]
  },

  configuringPermissions: {
    title: "Configuring Custom Permissions",
    steps: [
      {
        title: "Identify Requirements",
        content: "Determine what specific permissions are needed for the role or team."
      },
      {
        title: "Create Permission Set",
        content: "Create a new permission set with a descriptive name and configure each permission category."
      },
      {
        title: "Validate Dependencies",
        content: "Ensure permission dependencies are met (e.g., manage permissions require view permissions)."
      },
      {
        title: "Assign to Members",
        content: "Assign the permission set to appropriate members and test access levels."
      }
    ]
  }
} as const

/**
 * Get help text for a specific key path
 * @param keyPath - Dot-notation path to the help text (e.g., 'permissions.roles.admin.title')
 * @returns Help text content or undefined if not found
 */
export function getHelpText(keyPath: string): string | undefined {
  const keys = keyPath.split('.')
  let current: any = helpText
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    } else {
      return undefined
    }
  }
  
  return typeof current === 'string' ? current : undefined
}

/**
 * Get tooltip text for a specific key
 * @param keyPath - Dot-notation path to the tooltip (e.g., 'actions.addMember')
 * @returns Tooltip text or undefined if not found
 */
export function getTooltip(keyPath: string): string | undefined {
  const keys = keyPath.split('.')
  let current: any = tooltips
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    } else {
      return undefined
    }
  }
  
  return typeof current === 'string' ? current : undefined
}

/**
 * Get workflow steps for a specific workflow
 * @param workflowKey - Key of the workflow to retrieve
 * @returns Workflow object with title and steps, or undefined if not found
 */
export function getWorkflow(workflowKey: string): typeof workflows[keyof typeof workflows] | undefined {
  return workflows[workflowKey as keyof typeof workflows]
}

/**
 * Format help text with dynamic values
 * @param template - Help text template with placeholders
 * @param values - Object with values to replace placeholders
 * @returns Formatted help text
 */
export function formatHelpText(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key]?.toString() || match
  })
}

/**
 * Get contextual help based on user role and current context
 * @param userRole - Current user's role
 * @param context - Current application context
 * @returns Relevant help text and tooltips
 */
export function getContextualHelp(
  userRole: 'owner' | 'admin' | 'member' | 'guest',
  context: string
): {
  helpText?: string
  tooltips: string[]
  workflows?: typeof workflows[keyof typeof workflows]
} {
  const result: {
    helpText?: string
    tooltips: string[]
    workflows?: typeof workflows[keyof typeof workflows]
  } = {
    tooltips: []
  }

  // Add role-specific help and tooltips based on context
  switch (context) {
    case 'member-management':
      if (userRole === 'owner' || userRole === 'admin') {
        result.helpText = helpText.permissions.overview.content
        result.tooltips.push(tooltips.actions.addMember, tooltips.actions.editMember)
        result.workflows = workflows.addingMembers
      } else {
        result.helpText = "You can view member information based on your permission level."
        result.tooltips.push(tooltips.actions.viewProfile)
      }
      break

    case 'engagement-management':
      if (userRole === 'owner' || userRole === 'admin') {
        result.helpText = helpText.availability.overview.content
        result.tooltips.push(tooltips.actions.addEngagement, tooltips.fields.engagementHours)
        result.workflows = workflows.managingEngagements
      }
      break

    case 'permission-configuration':
      if (userRole === 'owner' || userRole === 'admin') {
        result.helpText = helpText.permissions.customSets.overview.content
        result.tooltips.push(tooltips.actions.createPermissionSet)
        result.workflows = workflows.configuringPermissions
      }
      break

    default:
      result.helpText = "Use the help icons throughout the interface for contextual guidance."
  }

  return result
}