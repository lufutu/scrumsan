export default function FAQSection() {
  return (
    <section id="faq" className="w-full max-w-3xl mx-auto px-4 py-16">
      <h2 className="text-3xl font-bold mb-6 text-center text-primary-900">Got Questions?</h2>
      <div className="space-y-4">
        <details className="bg-primary-50 rounded p-4 border border-primary-200">
          <summary className="font-semibold cursor-pointer text-primary-900">How do I invite my team?</summary>
          <p className="mt-2 text-primary-600">Go to your project settings and use the "Invite" button to add team members by email.</p>
        </details>
        <details className="bg-primary-50 rounded p-4 border border-primary-200">
          <summary className="font-semibold cursor-pointer text-primary-900">Can I export my data?</summary>
          <p className="mt-2 text-primary-600">Yes, you can export your project data anytime from the dashboard.</p>
        </details>
        <details className="bg-primary-50 rounded p-4 border border-primary-200">
          <summary className="font-semibold cursor-pointer text-primary-900">Is there a free trial for Pro?</summary>
          <p className="mt-2 text-primary-600">Yes, enjoy a 14-day free trial of the Pro plan when you sign up.</p>
        </details>
      </div>
    </section>
  );
} 