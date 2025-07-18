# ScrumSan - VivifyScrum Clone

A complete VivifyScrum.com clone built with Next.js, Supabase, and TypeScript. This project replicates all core VivifyScrum features including project management, Scrum boards, time tracking, analytics, and team collaboration.
---

## ✨ Core Features

### 🔹 Organizations  
Create and manage multiple organizations to separate different teams or companies.

### 🔹 Projects  
Each organization can have multiple projects to group related boards. Organizations can create board without project

### 🔹 Boards
- **Scrum Boards**: Product backlog, sprints, burndown charts.  
- **Kanban Boards**: A customizable list-based board (e.g., To Do, In Progress, Done).

### 🔹 Task Management  
- Create, update, delete tasks (items) within boards  
- Assign to team members  
- Add descriptions, checklists, attachments  
- Set story points and dependencies (e.g., blocking, sub-items)

### 🔹 Team Collaboration  
- Invite members, assign roles (Owner, Admin, Member), if user not exist will send email to join
- Real-time board and task updates  
- Commenting, activity feed

### 🔹 Analytics & Reporting (Planned)  
- Burndown and velocity charts  
- Cycle time, lead time metrics

---

## 🖥 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (Fullstack - frontend + backend API routes)
- **UI**: [Shadcn/UI](https://ui.shadcn.com/)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Supabase Auth (Email/Password, Google OAuth)
- **Package Manager**: Bun

---

## 📁 Project Structure

This project uses a unified Next.js structure. API routes serve as the backend, and React components interact with them directly via HTTP or server actions.

```
/
|-- app/                # App directory (Next.js routing)
|   |-- (marketing)/    # Landing page, pricing, etc.
|   |-- (dashboard)/    # Authenticated project management interface
|-- components/         # Shared UI components
|-- lib/                # Utility functions (API helpers, auth, etc.)
|-- prisma/             # Prisma schema and migrations
|-- public/             # Static assets
|-- styles/             # Global styles
|-- .env                # Environment variables
|-- prisma/schema.prisma
|-- bun.lockb
|-- package.json
|-- README.md
```

---

## 🎨 Layouts

- **Marketing Layout**:  
  Public-facing pages (landing, pricing, features), shown to unauthenticated users.

- **Dashboard Layout**:  
  The main project management interface, shown after login. Uses dynamic routing and server-side authentication.

---

## 🚀 Getting Started

### 🔧 Prerequisites

- [Bun](https://bun.sh/)
- Node.js
- PostgreSQL or [Supabase](https://supabase.io/)

---

### 📥 Installation

```bash
git clone <repository-url>
cd <repository-name>
bun install
```

---

### ⚙️ Environment Setup

Create a `.env` file in the root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
SUPABASE_URL="YOUR_SUPABASE_URL"
SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
```

---

### 🧱 Database Migration

```bash
bunx prisma migrate dev
```

---

### 🧑‍💻 Development Server

```bash
bun dev
```

---

## 🗃 Preliminary Database Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  name          String?
  avatarUrl     String?
  organizations Organization[] @relation("OrganizationMembers")
  assignedItems Item[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Organization {
  id        String   @id @default(uuid())
  name      String
  ownerId   String
  members   User[]   @relation("OrganizationMembers")
  projects  Project[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Project {
  id             String       @id @default(uuid())
  name           String
  organization   Organization @relation(fields: [organizationId], references: [id])
  organizationId String
  boards         Board[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

enum BoardType {
  KANBAN
  SCRUM
}

model Board {
  id        String    @id @default(uuid())
  name      String
  type      BoardType
  project   Project   @relation(fields: [projectId], references: [id])
  projectId String
  columns   Column[]
  items     Item[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Column {
  id        String   @id @default(uuid())
  name      String
  order     Int
  board     Board    @relation(fields: [boardId], references: [id])
  boardId   String
  items     Item[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Item {
  id           String    @id @default(uuid())
  title        String
  description  String?
  storyPoints  Int?
  order        Int
  board        Board     @relation(fields: [boardId], references: [id])
  boardId      String
  column       Column    @relation(fields: [columnId], references: [id])
  columnId     String
  assignee     User?     @relation(fields: [assigneeId], references: [id])
  assigneeId   String?
  parent       Item?     @relation("ItemRelations", fields: [parentId], references: [id])
  parentId     String?
  children     Item[]    @relation("ItemRelations")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

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
