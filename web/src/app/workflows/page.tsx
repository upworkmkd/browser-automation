'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Play, Settings, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { trpc } from '../providers'

export default function WorkflowsPage() {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  
  const { data: workflows, isLoading, refetch } = trpc.workflow.getAll.useQuery()
  const deleteMutation = trpc.workflow.delete.useMutation({
    onSuccess: () => {
      refetch()
      setDeleteId(null)
    },
  })
  const toggleActiveMutation = trpc.workflow.toggleActive.useMutation({
    onSuccess: () => refetch(),
  })

  const handleDelete = async (id: string) => {
    if (deleteId === id) {
      await deleteMutation.mutateAsync({ id })
    } else {
      setDeleteId(id)
    }
  }

  const handleToggleActive = async (id: string) => {
    await toggleActiveMutation.mutateAsync({ id })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card h-24 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Manage your browser automation workflows
          </p>
        </div>
        <Link
          href="/workflows/new"
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Workflow
        </Link>
      </div>

      {workflows?.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <Play className="mx-auto h-12 w-12 mb-4" />
            <p className="text-lg">No workflows created yet</p>
            <p className="text-sm">Create your first automation workflow to get started</p>
          </div>
          <Link
            href="/workflows/new"
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create First Workflow
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {workflows?.map((workflow) => (
            <div
              key={workflow.id}
              className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{workflow.name}</h3>
                    <button
                      onClick={() => handleToggleActive(workflow.id)}
                      className={`flex items-center text-sm px-2 py-1 rounded-full ${
                        workflow.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {workflow.isActive ? (
                        <ToggleRight className="h-4 w-4 mr-1" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 mr-1" />
                      )}
                      {workflow.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  
                  {workflow.description && (
                    <p className="text-muted-foreground mb-3">{workflow.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Executions: {workflow._count.executions}</span>
                    <span>
                      Updated: {new Date(workflow.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/workflows/${workflow.id}/execute`}
                    className="inline-flex items-center px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Play className="mr-1 h-4 w-4" />
                    Run
                  </Link>
                  
                  <Link
                    href={`/workflows/${workflow.id}/edit`}
                    className="inline-flex items-center px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/90 transition-colors"
                  >
                    <Settings className="mr-1 h-4 w-4" />
                    Edit
                  </Link>
                  
                  <button
                    onClick={() => handleDelete(workflow.id)}
                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      deleteId === workflow.id
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
                    }`}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    {deleteId === workflow.id ? 'Confirm' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
