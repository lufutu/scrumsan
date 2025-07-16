import Link from "next/link";

export default function HeroSection() {
  return (
    <header className="w-full max-w-6xl mx-auto px-4 pt-12 pb-8 flex flex-col items-center text-center">
      <nav className="w-full flex justify-between items-center mb-8">
        <div className="flex items-center gap-8">
          <span className="font-bold text-2xl tracking-tight text-primary-900">ScrumSan</span>
          <ul className="hidden md:flex gap-6 text-sm text-primary-700">
            <li><Link href="#features">Features</Link></li>
            <li><Link href="#pricing">Pricing</Link></li>
            <li><Link href="#faq">FAQ</Link></li>
            <li><Link href="#contact">Contact</Link></li>
          </ul>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="px-4 py-2 rounded border border-primary-200 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground">Login</Link>
          <Link href="/signup" className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary-700">Get Started</Link>
        </div>
      </nav>
      <h1 className="text-4xl md:text-6xl font-extrabold mb-4 text-primary-900">Agile Project Management Made Simple</h1>
      <p className="text-lg md:text-2xl text-primary-700 mb-8 max-w-2xl">ScrumSan helps teams collaborate, track progress, and deliver projects efficiently using Scrum and Kanban methodologies.</p>
      <div className="flex gap-4 justify-center">
        <Link href="/signup" className="px-6 py-3 rounded bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary-700">Start Free Trial</Link>
        <Link href="#features" className="px-6 py-3 rounded border border-primary-200 bg-primary-50 text-lg font-semibold [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground">Learn More</Link>
      </div>
    </header>
  );
} 