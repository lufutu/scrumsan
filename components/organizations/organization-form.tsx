"use client"

import { useState } from 'react';

export default function OrganizationForm() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="bg-primary text-primary-foreground px-4 py-2 rounded shadow hover:bg-primary/90"
        onClick={() => setOpen(true)}
      >
        New Organization
      </button>
      {open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-card text-card-foreground rounded p-6 shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Create Organization</h2>
            {/* TODO: Add form fields and logic */}
            <button
              className="mt-4 px-4 py-2 rounded bg-muted text-muted-foreground hover:bg-muted/80"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
} 