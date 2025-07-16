import Link from "next/link";

export default function FooterSection() {
  return (
    <footer className="w-full border-t py-8 mt-auto bg-primary-50 text-center text-primary-600">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center px-4">
        <div className="mb-4 md:mb-0">
          <span className="font-bold text-lg text-primary-900">ScrumSan</span> &copy; {new Date().getFullYear()}
        </div>
        <ul className="flex gap-6 text-sm">
          <li><Link href="#" className="text-primary-foreground">Product</Link></li>
          <li><Link href="#" className="text-primary-foreground">Pricing</Link></li>
          <li><Link href="#" className="text-primary-foreground">FAQ</Link></li>
          <li><Link href="#" className="text-primary-foreground">Contact</Link></li>
        </ul>
      </div>
    </footer>
  );
} 