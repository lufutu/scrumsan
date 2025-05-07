# ScrumSan - Agile Project Management Tool

ScrumSan is a modern, full-featured agile project management application inspired by VivifyScrum. It provides teams with powerful tools to manage projects, sprints, and tasks using Scrum and Kanban methodologies.

![ScrumSan Dashboard](/placeholder.svg?height=400&width=800&query=scrum%20board%20dashboard%20with%20kanban%20view)

## 🚀 Features

- **Project Management**: Create and manage multiple projects
- **Sprint Planning**: Plan and track sprints with start and end dates
- **Task Management**: Create, assign, and track tasks with customizable statuses
- **Kanban Boards**: Visualize workflow with customizable boards
- **Team Collaboration**: Invite team members and assign roles
- **Real-time Updates**: Collaborative editing with real-time updates
- **File Attachments**: Upload and manage files for tasks
- **Analytics**: Track project progress with burndown charts, velocity metrics, and more
- **Time Tracking**: Log and monitor time spent on tasks
- **Notifications**: Stay updated with in-app notifications

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Authentication, Storage, Realtime)
- **State Management**: React Context API, React Query
- **Styling**: Tailwind CSS with custom theming
- **Charts**: Chart.js for analytics visualizations
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 19.x or higher
- npm or yarn
- Supabase account

## 🔧 Installation

1. **Clone the repository**

\`\`\`bash
git clone https://github.com/yourusername/scrumsan.git
cd scrumsan
\`\`\`

2. **Install dependencies**

\`\`\`bash
npm install
# or
yarn install
\`\`\`

3. **Set up environment variables**

Create a `.env.local` file in the root directory with the following variables:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

4. **Set up the database**

Run the SQL initialization script in your Supabase SQL editor (found in `lib/supabase/init.sql`).

5. **Run the development server**

\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

6. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

\`\`\`
scrumsan/
├── app/                    # Next.js App Router
│   ├── (app)/              # Authenticated app routes
│   │   ├── projects/       # Project-related pages
│   │   ├── users/          # User management
│   │   └── reports/        # Analytics and reports
│   ├── login/              # Authentication pages
│   ├── signup/
│   └── ...
├── components/             # React components
│   ├── dashboard/          # Dashboard-specific components
│   ├── providers/          # Context providers
│   └── ui/                 # UI components (shadcn/ui)
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions and services
│   ├── services/           # Business logic services
│   └── supabase/           # Supabase-related code
├── public/                 # Static assets
└── ...
\`\`\`

## 🗄️ Database Schema

The application uses a PostgreSQL database with the following main tables:

- **users**: User accounts and profiles
- **organizations**: Organizations that group projects and users
- **projects**: Project details and settings
- **project_members**: User-project relationships with roles
- **boards**: Kanban boards for projects
- **board_columns**: Columns within boards (e.g., To Do, In Progress, Done)
- **tasks**: Individual work items
- **sprints**: Time-boxed iterations
- **sprint_tasks**: Tasks assigned to sprints
- **comments**: Comments on tasks
- **attachments**: Files attached to tasks
- **time_logs**: Time tracking records

## 🔐 Authentication and Authorization

ScrumSan uses Supabase Authentication for user management and implements Row Level Security (RLS) policies to ensure data security. The application supports:

- Email/password authentication
- Role-based access control (Admin, Member, Viewer)
- Organization-level permissions
- Project-level permissions

## 🚢 Deployment

The application is optimized for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Set up the environment variables
3. Deploy with the default settings

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Chart.js](https://www.chartjs.org/)
- [Lucide Icons](https://lucide.dev/)
