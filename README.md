# ScrumSan - VivifyScrum Clone

A complete VivifyScrum.com clone built with Next.js, Supabase, and TypeScript. This project replicates all core VivifyScrum features including project management, Scrum boards, time tracking, analytics, and team collaboration.

## 🎯 Project Overview

ScrumSan is a comprehensive project management platform that mirrors VivifyScrum's functionality, offering:
- **Multi-tenant Organizations** with role-based access control
- **Project Management** with full lifecycle support
- **Scrum & Kanban Boards** with drag-and-drop functionality
- **Sprint Management** with burndown charts and analytics
- **Time Tracking & Worklog** with detailed reporting
- **Team Collaboration** with comments, mentions, and real-time updates

## 🚀 Features Implemented

### ✅ Core Infrastructure
- **Enhanced Database Schema** - Complete VivifyScrum data model
- **Authentication & Authorization** - Supabase Auth with RLS
- **Multi-tenant Architecture** - Organizations with member management
- **Real-time Updates** - Live collaboration features
- **File Storage** - Supabase Storage for attachments and logos

### ✅ VivifyScrum UI Components
- **VivifyScrum Board Creation Wizard** - Multi-step board creation with logo upload
- **Organization Dashboard** - Cards layout matching VivifyScrum design
- **Task Detail Modal** - Tabbed interface (Details, Worklog, Relations, Events)
- **Enhanced Task Cards** - Type icons, priority, story points, labels
- **Sprint Management** - Sprint planning and execution tools

### ✅ Board Management
- **Board Types** - Scrum and Kanban boards with templates
- **Column Management** - Customizable workflow columns
- **Task Types** - Story, Bug, Task, Epic, Improvement, Note, Idea
- **Task Priority** - Critical, High, Medium, Low with color coding
- **Story Points** - Estimation and velocity tracking

### ✅ Advanced Features
- **Task Relations** - Dependencies, blocking, subtasks, parent-child
- **Worklog Entries** - Time tracking with descriptions and dates
- **Task Events** - Activity history and event logging
- **Team Invitations** - Email-based team member invitations
- **Document Management** - File uploads and document organization
- **Sprint Analytics** - Burndown charts and sprint metrics

## 🏗️ Architecture

### Database Schema
```sql
-- Core Tables
organizations (id, name, description, logo, settings, billing_email, plan)
projects (id, name, description, logo, start_date, end_date, status, settings)
boards (id, name, board_type, logo, description, color)
tasks (id, title, description, task_type, priority, story_points, labels, position)

-- Advanced Tables
worklog_entries (id, task_id, user_id, hours_logged, date_logged, description)
task_relations (id, source_task_id, target_task_id, relation_type)
task_events (id, task_id, user_id, event_type, event_data)
team_invitations (id, organization_id, email, role, token, expires_at)
sprint_analytics (id, sprint_id, date, remaining_points, completed_points)
board_templates (id, name, board_type, columns, is_default)
```

### Tech Stack
- **Frontend**: Next.js 14 with App Router, React 18
- **Styling**: Tailwind CSS with shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Real-time)
- **TypeScript**: Full type safety with generated database types
- **State Management**: React hooks with SWR for data fetching
- **Authentication**: Supabase Auth with Row Level Security

## 📁 Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── (app)/             # Authenticated app routes
│   │   ├── organizations/ # Organization management
│   │   ├── projects/      # Project management
│   │   └── boards/        # Board management
│   ├── auth/              # Authentication routes
│   └── api/               # API routes
├── components/
│   ├── vivify/            # VivifyScrum clone components
│   │   ├── vivify-board-wizard.tsx
│   │   ├── vivify-organization-dashboard.tsx
│   │   └── vivify-task-detail-modal.tsx
│   ├── boards/            # Board components
│   ├── tasks/             # Task management
│   ├── projects/          # Project components
│   └── ui/                # shadcn/ui components
├── hooks/                 # Custom React hooks
├── providers/             # Context providers
├── lib/                   # Utilities and configurations
├── types/                 # TypeScript type definitions
└── supabase/              # Database migrations and config
```

## 🎨 VivifyScrum Features Comparison

| Feature | VivifyScrum | ScrumSan | Status |
|---------|-------------|----------|--------|
| Multi-step Board Wizard | ✅ | ✅ | Complete |
| Organization Cards Layout | ✅ | ✅ | Complete |
| Task Detail Tabs | ✅ | ✅ | Complete |
| Scrum Board Interface | ✅ | ✅ | Complete |
| Time Tracking | ✅ | ✅ | Complete |
| Sprint Management | ✅ | 🔄 | In Progress |
| Analytics Dashboard | ✅ | 🔄 | In Progress |
| Team Management | ✅ | 🔄 | In Progress |
| Document Management | ✅ | 🔄 | In Progress |
| Advanced Reporting | ✅ | 📋 | Planned |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn/bun
- Supabase account and project
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd scrumsan
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   bun install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   ```bash
   # Run database migrations
   npx supabase db push
   
   # Generate TypeScript types
   npx supabase gen types typescript --local > types/database.ts
   ```

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   bun dev
   ```

6. **Open your browser**
   Visit [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Supabase Setup
1. Create a new Supabase project
2. Run the provided migrations in `supabase/migrations/`
3. Enable Row Level Security (RLS) on all tables
4. Configure authentication providers (email, Google, etc.)
5. Set up storage buckets for file uploads

### Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Additional providers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## 📝 Usage

### Creating Your First Organization
1. Sign up or log in
2. Create a new organization from the dashboard
3. Invite team members via email
4. Set up your first project

### Setting Up a Scrum Board
1. Use the VivifyScrum Board Creation Wizard
2. Choose between Scrum or Kanban templates
3. Customize columns and workflow
4. Start adding tasks and planning sprints

### Managing Tasks
1. Create tasks with different types (Story, Bug, Task, etc.)
2. Set priority levels and story points
3. Assign to team members
4. Track time and log work
5. Use relations to link dependent tasks

## 🛠️ Development

### Database Migrations
```bash
# Create a new migration
npx supabase migration new migration_name

# Apply migrations
npx supabase db push

# Reset database (development only)
npx supabase db reset
```

### Type Generation
```bash
# Generate TypeScript types from database
npx supabase gen types typescript --local > types/database.ts
```

### Testing
```bash
# Run tests
npm test

# Run E2E tests
npm run test:e2e
```

## 📊 Database Schema

### Key Tables
- **organizations**: Multi-tenant organization management
- **projects**: Project lifecycle management
- **boards**: Scrum/Kanban board configuration
- **tasks**: Core task management with full metadata
- **sprints**: Sprint planning and execution
- **worklog_entries**: Time tracking and work logging
- **task_relations**: Task dependencies and relationships

### Relationships
- Organizations → Projects → Boards → Tasks
- Tasks → Worklog Entries, Comments, Attachments
- Tasks ← → Task Relations (many-to-many)
- Sprints ← → Tasks (many-to-many via sprint_tasks)

## 🎯 Roadmap

### Phase 1: MVP Features ✅
- [x] User authentication and authorization
- [x] Organization and project management
- [x] Basic board and task functionality
- [x] VivifyScrum UI components
- [x] Time tracking foundation

### Phase 2: Advanced Features 🔄
- [ ] Complete sprint management
- [ ] Advanced analytics and reporting
- [ ] Real-time collaboration
- [ ] Mobile responsiveness
- [ ] Advanced search and filtering

### Phase 3: Enterprise Features 📋
- [ ] Advanced user roles and permissions
- [ ] Audit logs and compliance
- [ ] API development
- [ ] Third-party integrations
- [ ] White-label solutions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write unit tests for new features
- Update documentation for API changes
- Follow the established component patterns

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [VivifyScrum](https://www.vivifyscrum.com/) for the original design inspiration
- [Supabase](https://supabase.com/) for the backend infrastructure
- [shadcn/ui](https://ui.shadcn.com/) for the component library
- [Tailwind CSS](https://tailwindcss.com/) for the styling framework

## 📞 Support

For support, email support@scrumsan.com or join our [Discord community](https://discord.gg/scrumsan).

---

**Made with ❤️ by the ScrumSan Team**
