import { PanelLeftOpen, CalendarCheck, Users } from 'lucide-react';


export default function FeaturesSection() {
  return (
    <section id="features" className="w-full max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-12">
      <div className="relative">
        <h2 className="text-xl font-bold mb-2 text-primary-900">
          <PanelLeftOpen className="inline-block mr-2" />
          Project Management
        </h2>
        <p className="text-primary-600">Create and manage multiple projects with ease.</p>
        <div className="text-muted-foreground h-full w-px absolute top-0 right-0 max-lg:hidden"><div className="h-full w-px bg-[repeating-linear-gradient(180deg,transparent,transparent_4px,currentColor_4px,currentColor_10px)] [mask-image:linear-gradient(180deg,transparent,black_25%,black_75%,transparent)]"></div></div>
      </div>      
      <div className="relative">
        <h2 className="text-xl font-bold mb-2 text-primary-900">
          <CalendarCheck className="inline-block mr-2" />
          Sprint Planning
        </h2>
        <p className="text-primary-600">Plan and track sprints with start and end dates.</p>
        <div className="text-muted-foreground h-full w-px absolute top-0 right-0 max-lg:hidden"><div className="h-full w-px bg-[repeating-linear-gradient(180deg,transparent,transparent_4px,currentColor_4px,currentColor_10px)] [mask-image:linear-gradient(180deg,transparent,black_25%,black_75%,transparent)]"></div></div>
      </div>
      <div className="relative">
        <h2 className="text-xl font-bold mb-2 text-primary-900">
          <Users className="inline-block mr-2" />
          Team Collaboration
        </h2>
        <p className="text-primary-600">Invite team members and assign roles efficiently.</p>
      </div>
    </section>
  );
} 