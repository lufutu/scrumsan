import Link from "next/link";

export default function PricingSection() {
  return (
    <section id="pricing" className="w-full max-w-4xl mx-auto px-4 py-16 text-center">
      <h2 className="text-3xl font-bold mb-6 text-primary-900">Pricing</h2>
      <p className="text-primary-700 mb-8">Start with ScrumSan for free. Upgrade for unlimited projects, advanced integrations, and priority support.</p>
      <div className="flex flex-col md:flex-row gap-8 justify-center">
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-8 flex-1">
          <h3 className="text-xl font-bold mb-2 text-primary-900">Free</h3>
          <p className="text-2xl font-bold mb-4 text-primary-900">$0</p>
          <ul className="text-primary-600 mb-6 text-left list-disc list-inside">
            <li>Unlimited members</li>
            <li>2 projects</li>
            <li>200 issues</li>
            <li>Basic integrations</li>
          </ul>
          <Link href="/signup" className="block px-4 py-2 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary-700">Get started</Link>
        </div>
        <div className="bg-primary-50 border border-2 border-primary rounded-lg p-8 flex-1">
          <h3 className="text-xl font-bold mb-2 text-primary-900">Pro</h3>
          <p className="text-2xl font-bold mb-4 text-primary-900">$8 <span className="text-base font-normal">per user/month</span></p>
          <ul className="text-primary-600 mb-6 text-left list-disc list-inside">
            <li>Unlimited projects & issues</li>
            <li>Advanced integrations</li>
            <li>Priority support</li>
            <li>Custom workflows</li>
          </ul>
          <Link href="/signup" className="block px-4 py-2 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary-700">Get started</Link>
        </div>
      </div>
    </section>
  );
} 