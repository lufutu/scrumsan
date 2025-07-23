'use client';

/**
 * Example component demonstrating different ways to use LabelSelector
 * This file shows the versatility and reusability of the LabelSelector component
 */

import { useState } from 'react';
import LabelSelector from '@/components/scrum/LabelSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LabelSelectorUsageExample() {
  const [selectedLabels, setSelectedLabels] = useState<Array<{ id: string; name: string; color: string }>>([]);

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">LabelSelector Usage Examples</h2>
      
      {/* Example 1: Standalone mode for form creation */}
      <Card>
        <CardHeader>
          <CardTitle>Example 1: Standalone Mode (Task Creation Form)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Use this mode when creating new tasks or when you want to manage labels without updating a task immediately.
          </p>
          <LabelSelector
            boardId="your-board-id"
            selectedLabels={selectedLabels}
            onLabelsChange={setSelectedLabels}
          />
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Selected labels: {selectedLabels.length} ({selectedLabels.map(l => l.name).join(', ')})
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Example 2: Direct task update mode */}
      <Card>
        <CardHeader>
          <CardTitle>Example 2: Direct Task Update Mode (ItemModal / Task Cards)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Use this mode when you want to immediately update task labels. Perfect for ItemModal or inline task editing.
          </p>
          <LabelSelector
            boardId="your-board-id"
            taskId="your-task-id"
            selectedLabels={selectedLabels}
            onLabelsChange={setSelectedLabels}
            onTaskUpdate={() => {
              console.log('Task updated! Refresh your data here.');
              // This callback is called after successful API updates
              // Use it to refresh task data, show notifications, etc.
            }}
          />
        </CardContent>
      </Card>

      {/* Example 3: Key features */}
      <Card>
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✅ <strong>Reusable:</strong> Works in any component (ItemModal, TaskCard, Forms, etc.)</li>
            <li>✅ <strong>Two modes:</strong> Standalone (controlled) or direct task update</li>
            <li>✅ <strong>Create labels:</strong> Built-in label creation with color picker</li>
            <li>✅ <strong>Junction table:</strong> Uses modern TaskLabel relationships</li>
            <li>✅ <strong>Real-time updates:</strong> Automatically updates tasks via API</li>
            <li>✅ <strong>User feedback:</strong> Toast notifications for all actions</li>
            <li>✅ <strong>Consistent UX:</strong> Same experience across all components</li>
          </ul>
        </CardContent>
      </Card>

      {/* Example 4: Props documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Props Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <code className="bg-gray-100 px-2 py-1 rounded">boardId: string</code>
              <p className="text-gray-600">Required. The board ID to load labels from.</p>
            </div>
            <div>
              <code className="bg-gray-100 px-2 py-1 rounded">taskId?: string</code>
              <p className="text-gray-600">Optional. If provided, will directly update task labels via API.</p>
            </div>
            <div>
              <code className="bg-gray-100 px-2 py-1 rounded">selectedLabels?: Label[]</code>
              <p className="text-gray-600">Optional. Current selected labels to display.</p>
            </div>
            <div>
              <code className="bg-gray-100 px-2 py-1 rounded">onLabelsChange?: (labels: Label[]) => void</code>
              <p className="text-gray-600">Optional. Called when labels change (for controlled mode).</p>
            </div>
            <div>
              <code className="bg-gray-100 px-2 py-1 rounded">onTaskUpdate?: () => void</code>
              <p className="text-gray-600">Optional. Called after successful task label updates.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LabelSelectorUsageExample;