import ProjectList from '@/components/projects/project-list';
import ProjectForm from '@/components/projects/project-form';

export default function ProjectsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <ProjectForm />
      </div>
      <ProjectList />
    </div>
  );
} 