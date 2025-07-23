/**
 * Standardized Prisma include patterns for consistent data fetching
 */

// Common user selection for performance
export const userSelect = {
  id: true,
  fullName: true,
  avatarUrl: true,
  email: true
} as const

// Minimal user selection for lists
export const userSelectMinimal = {
  id: true,
  fullName: true,
  avatarUrl: true
} as const

// Organization member with user details
export const organizationMemberInclude = {
  user: {
    select: userSelect
  }
} as const

// Task assignees include
export const taskAssigneesInclude = {
  taskAssignees: {
    select: {
      user: {
        select: userSelectMinimal
      }
    }
  }
} as const

// Task reviewers include
export const taskReviewersInclude = {
  taskReviewers: {
    select: {
      user: {
        select: userSelectMinimal
      }
    }
  }
} as const

// Task labels include
export const taskLabelsInclude = {
  taskLabels: {
    include: {
      label: {
        select: {
          id: true,
          name: true,
          color: true,
          description: true
        }
      }
    }
  }
} as const

// Task relations include for detailed view
export const taskRelationsInclude = {
  parent: {
    select: {
      id: true,
      title: true,
      taskType: true,
      itemCode: true
    }
  },
  relationsAsTarget: {
    where: {
      relationType: 'blocks'
    },
    select: {
      sourceTask: {
        select: {
          id: true,
          title: true,
          taskType: true,
          itemCode: true
        }
      }
    }
  },
  relationsAsSource: {
    where: {
      relationType: 'blocks'
    },
    select: {
      targetTask: {
        select: {
          id: true,
          title: true,
          taskType: true,
          itemCode: true
        }
      }
    }
  }
} as const

// Full task include for detailed views
export const taskFullInclude = {
  ...taskAssigneesInclude,
  ...taskReviewersInclude,
  ...taskLabelsInclude,
  creator: {
    select: userSelectMinimal
  },
  board: {
    select: {
      id: true,
      name: true,
      organizationId: true
    }
  },
  column: {
    select: {
      id: true,
      name: true
    }
  },
  sprintColumn: {
    select: {
      id: true,
      name: true,
      position: true
    }
  },
  sprint: {
    select: {
      id: true,
      name: true,
      status: true
    }
  },
  epic: {
    select: {
      id: true,
      title: true
    }
  },
  subtasks: {
    select: {
      id: true,
      title: true,
      taskType: true,
      itemCode: true
    }
  },
  _count: {
    select: {
      comments: true,
      attachments: true,
      subtasks: true,
      relationsAsSource: true,
      relationsAsTarget: true
    }
  }
} as const

// Task include for list views (lighter)
export const taskListInclude = {
  ...taskAssigneesInclude,
  ...taskLabelsInclude,
  creator: {
    select: userSelectMinimal
  },
  board: {
    select: {
      id: true,
      name: true
    }
  },
  column: {
    select: {
      id: true,
      name: true
    }
  },
  epic: {
    select: {
      id: true,
      title: true
    }
  },
  _count: {
    select: {
      comments: true,
      attachments: true,
      subtasks: true
    }
  }
} as const

// Board include with all related data
export const boardFullInclude = {
  organization: {
    select: {
      id: true,
      name: true,
      members: {
        include: organizationMemberInclude
      }
    }
  },
  columns: {
    orderBy: { position: 'asc' as const },
    select: {
      id: true,
      name: true,
      position: true,
      wipLimit: true
    }
  },
  labels: {
    select: {
      id: true,
      name: true,
      color: true,
      description: true
    }
  },
  sprints: {
    orderBy: { position: 'asc' as const },
    where: { isDeleted: false },
    select: {
      id: true,
      name: true,
      goal: true,
      status: true,
      startDate: true,
      endDate: true,
      isBacklog: true,
      isFinished: true
    }
  }
} as const

// Project include with related data
export const projectFullInclude = {
  organization: {
    select: {
      id: true,
      name: true
    }
  },
  boards: {
    where: { isDeleted: false },
    select: {
      id: true,
      name: true,
      description: true
    }
  },
  sprints: {
    where: { isDeleted: false },
    orderBy: { position: 'asc' as const },
    select: {
      id: true,
      name: true,
      goal: true,
      status: true,
      startDate: true,
      endDate: true,
      isFinished: true
    }
  }
} as const

// Sprint include with columns and tasks
export const sprintFullInclude = {
  board: {
    select: {
      id: true,
      name: true,
      organizationId: true
    }
  },
  sprintColumns: {
    orderBy: { position: 'asc' as const },
    select: {
      id: true,
      name: true,
      position: true,
      isDone: true,
      wipLimit: true
    }
  },
  tasks: {
    include: taskListInclude
  }
} as const

// Comment include with author
export const commentInclude = {
  author: {
    select: userSelectMinimal
  }
} as const

// Attachment include with uploader
export const attachmentInclude = {
  uploader: {
    select: userSelectMinimal
  }
} as const

/**
 * Helper function to merge includes for custom combinations
 */
export function mergeIncludes<T extends Record<string, any>>(...includes: T[]): T {
  return Object.assign({}, ...includes) as T
}

/**
 * Helper function to create select-only includes
 */
export function createSelectInclude<T extends Record<string, any>>(fields: T) {
  return { select: fields } as const
}