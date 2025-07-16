export default function OrganizationList() {
  // TODO: Fetch organizations from Supabase and display them
  return (
    <div className="space-y-4">
      <div className="rounded border bg-card p-4 text-card-foreground shadow">
        <div className="font-semibold">Acme Corp</div>
        <div className="text-muted-foreground text-sm">Your organization description here.</div>
      </div>
      <div className="rounded border bg-card p-4 text-card-foreground shadow">
        <div className="font-semibold">BetaSoft</div>
        <div className="text-muted-foreground text-sm">Another organization description.</div>
      </div>
    </div>
  );
} 