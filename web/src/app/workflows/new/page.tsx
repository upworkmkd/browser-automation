'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '../../providers'
import { WorkflowBuilder } from '../../../components/WorkflowBuilder'

export default function NewWorkflowPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [showBuilder, setShowBuilder] = useState(false)
  const router = useRouter()

  const createMutation = trpc.workflow.create.useMutation({
    onSuccess: (workflow) => {
      router.push(`/workflows/${workflow.id}/edit`)
    },
  })

  const handleCreateWorkflow = async () => {
    if (!name.trim()) return

    const newWorkflow = await createMutation.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      nodes: [
        {
          id: '1',
          type: 'custom',
          position: { x: 250, y: 100 },
          data: { 
            type: 'url',
            label: 'Open URL',
            config: { url: '' },
            status: 'pending'
          },
        }
      ],
      edges: [],
    })
    
    // Redirect to the workflow editor
    router.push(`/workflows/${newWorkflow.id}/edit`)
  }

  if (showBuilder) {
    return <WorkflowBuilder />
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="bg-card rounded-lg border border-border p-8">
        <h1 className="text-2xl font-bold mb-6">Create New Workflow</h1>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Workflow Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Automation Workflow"
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this workflow does..."
              rows={3}
              className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleCreateWorkflow}
              disabled={!name.trim() || createMutation.isLoading}
              className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isLoading ? 'Creating...' : 'Create Workflow'}
            </button>
            
            <button
              onClick={() => router.push('/workflows')}
              className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/90 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
