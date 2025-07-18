# Real-time Setup Guide

This application uses **Supabase Real-time** for real-time functionality to provide instant updates across all connected clients without requiring page refreshes or additional server infrastructure.

## Features

- ✅ **Instant task updates** - See new tasks appear immediately
- ✅ **Live task modifications** - Watch as tasks are updated in real-time  
- ✅ **Real-time deletions** - Tasks are removed instantly across all tabs
- ✅ **Drag-and-drop sync** - Task movements appear instantly on all clients
- ✅ **Multi-tab synchronization** - Changes sync across browser tabs/windows
- ✅ **Database-driven** - Direct PostgreSQL LISTEN/NOTIFY integration
- ✅ **Zero-configuration** - Automatic with Supabase setup
- ✅ **Prisma compatible** - Works seamlessly with Prisma operations

## Supabase Real-time Setup

### 1. Enable Real-time in Supabase

Real-time is automatically enabled for all Supabase projects. No additional configuration needed!

### 2. Database Table Configuration

Ensure your database tables have Row Level Security (RLS) configured if needed:

```sql
-- Example: Enable RLS for tasks table (optional)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Example: Create policy to allow real-time subscriptions
CREATE POLICY "Allow real-time access" ON tasks
FOR ALL USING (true);
```

### 3. Start Development

Simply start your Next.js development server:

```bash
bun dev
```

### 4. Test the Setup

1. Start your development server: `bun dev`
2. Open the same board in two browser tabs
3. Create a new task in one tab
4. The task should appear instantly in the other tab ✨

## How It Works

### Database Change Detection

Supabase automatically detects database changes through PostgreSQL's LISTEN/NOTIFY:

```typescript
// When Prisma creates/updates/deletes a task:
await prisma.task.create({ data: taskData })

// Supabase automatically broadcasts the change to subscribed clients
// No manual broadcasting needed!
```

### Client-Side Listening

Components use the `useBoardRealtime` hook to listen for database changes:

```typescript
useBoardRealtime(boardId, {
  onTaskCreated: (task) => {
    // Refresh task list when new tasks are created
    mutateTasks()
  },
  onTaskUpdated: (task) => {
    // Update task in place when tasks are modified
    mutateTasks()
  },
  onTaskDeleted: (taskId) => {
    // Remove task from list when tasks are deleted
    mutateTasks()
  }
})
```

### Automatic Subscription Management

The system automatically handles:
- **Connection establishment** - Connects to Supabase real-time when component mounts
- **Table subscriptions** - Subscribes to specific tables with filters (e.g., tasks for a board)
- **Automatic reconnection** - Supabase handles connection failures and reconnection
- **Cleanup** - Proper unsubscription when component unmounts

### Database-Level Real-time

Real-time events are generated directly from database changes:
- **INSERT** operations trigger `onTaskCreated` callbacks
- **UPDATE** operations trigger `onTaskUpdated` callbacks  
- **DELETE** operations trigger `onTaskDeleted` callbacks

## Event Types

The system automatically detects these database changes:

- **INSERT** - New records added (tasks, boards, sprints)
- **UPDATE** - Existing records modified
- **DELETE** - Records removed from database

## Subscription Filtering

Events are filtered based on your subscriptions:

- **Board-specific**: `useBoardRealtime(boardId)` - Only tasks for that board
- **Project-specific**: `useProjectRealtime(projectId)` - Only tasks/sprints for that project
- **Table-level**: `useSupabaseRealtime({ table: 'tasks' })` - All changes to a table

## Available Hooks

### `useBoardRealtime(boardId, callbacks)`
Listens to all task and board changes for a specific board:
```typescript
useBoardRealtime('board-123', {
  onTaskCreated: (task) => console.log('New task:', task),
  onTaskUpdated: (task) => console.log('Updated task:', task),
  onTaskDeleted: (taskId) => console.log('Deleted task:', taskId),
  onBoardUpdated: (board) => console.log('Board updated:', board)
})
```

### `useProjectRealtime(projectId, callbacks)`
Listens to all task and sprint changes for a specific project:
```typescript
useProjectRealtime('project-456', {
  onTaskCreated: (task) => console.log('New task:', task),
  onSprintUpdated: (sprint) => console.log('Sprint updated:', sprint)
})
```

### `useSupabaseRealtime({ table, filter, callbacks })`
Low-level hook for custom subscriptions:
```typescript
useSupabaseRealtime({
  table: 'tasks',
  filter: 'status=eq.todo',
  callbacks: {
    onTaskCreated: (task) => console.log('New todo task:', task)
  }
})
```

## Debugging Real-time Issues

### Check Supabase Connection
```bash
# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Enable Debug Mode
Add console logs to see real-time events:
```typescript
// The hooks already include console.log statements
// Check browser console for "[Realtime]" messages
```

### Common Issues

1. **Events not received**: Check Supabase project settings and API keys
2. **Filter not working**: Verify column names and filter syntax
3. **Missing permissions**: Ensure RLS policies allow real-time access
4. **Connection issues**: Check network connectivity to Supabase

## Production Considerations

1. **Row Level Security**: Configure RLS policies for security
2. **Performance**: Use specific filters to reduce unnecessary events
3. **Error Handling**: Implement fallbacks for connection failures
4. **Rate Limiting**: Supabase automatically handles connection limits
5. **Monitoring**: Use Supabase dashboard to monitor real-time usage

## Architecture Benefits

- ✅ **Zero configuration** - Works out of the box with Supabase
- ✅ **No additional infrastructure** - Uses existing Supabase connection
- ✅ **Automatic scaling** - Supabase handles load balancing and scaling
- ✅ **Built-in security** - Row Level Security integration
- ✅ **Database agnostic** - Works with any PostgreSQL database on Supabase
- ✅ **Prisma compatible** - Seamlessly works with Prisma operations

## Migration Benefits

Compared to custom WebSocket servers:

- 🚀 **Simpler setup** - No additional server to maintain
- 💰 **Cost effective** - Included with Supabase plan
- 🔒 **More secure** - Built-in authentication and RLS
- 📈 **Better performance** - Optimized PostgreSQL LISTEN/NOTIFY
- 🛡️ **More reliable** - Enterprise-grade infrastructure