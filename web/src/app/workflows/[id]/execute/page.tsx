'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Node, Edge } from 'reactflow'
import { Play, Square, RotateCcw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { trpc } from '../../../providers'
// Removed direct import of WorkflowExecutor to avoid bundling server-side code

interface ExecutionLog {
  nodeId: string
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  message: string
  timestamp: Date
  data?: any
}

export default function ExecuteWorkflowPage() {
  const params = useParams()
  const workflowId = params.id as string
  
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([])
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, { status: string; error?: string; data?: any }>>({})

  const { data: workflow } = trpc.workflow.getById.useQuery({ id: workflowId })
  const createExecutionMutation = trpc.execution.create.useMutation()
  const updateExecutionMutation = trpc.execution.updateStatus.useMutation()
  const addLogMutation = trpc.execution.addLog.useMutation()

  // Removed useEffect that created WorkflowExecutor since execution is now server-side

  const [currentExecution, setCurrentExecution] = useState<any>(null)

  const startExecution = async () => {
    if (!workflow) return

    setIsExecuting(true)
    setExecutionLogs([])
    setNodeStatuses({})

    try {
      // Execute workflow via API
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workflowId: workflow.id }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Execution failed')
      }

      setCurrentExecution({ id: result.executionId })

      // Add a log entry for completion
      const completionLog: ExecutionLog = {
        nodeId: 'workflow',
        level: result.success ? 'INFO' : 'ERROR',
        message: result.success 
          ? `🎉 Workflow completed successfully in ${result.duration}ms`
          : `❌ Workflow failed: ${result.error}`,
        timestamp: new Date(),
        data: result.data,
      }
      setExecutionLogs(prev => [...prev, completionLog])

      // Simulate node status updates for demo
      if (result.success) {
        const simulateNodeUpdates = () => {
          const nodeIds = nodes.map(n => n.id)
          nodeIds.forEach((nodeId, index) => {
            setTimeout(() => {
              setNodeStatuses(prev => ({
                ...prev,
                [nodeId]: { status: 'running' }
              }))
              
              setTimeout(() => {
                setNodeStatuses(prev => ({
                  ...prev,
                  [nodeId]: { status: 'success', data: { completed: true } }
                }))
                
                const log: ExecutionLog = {
                  nodeId,
                  level: 'INFO',
                  message: `✅ Node "${nodes.find(n => n.id === nodeId)?.data.label}" completed`,
                  timestamp: new Date(),
                }
                setExecutionLogs(prev => [...prev, log])
              }, 1000)
            }, index * 2000)
          })
        }
        simulateNodeUpdates()
      }

    } catch (error) {
      console.error('Execution failed:', error)
      
      const errorLog: ExecutionLog = {
        nodeId: 'workflow',
        level: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      }
      setExecutionLogs(prev => [...prev, errorLog])
    } finally {
      setIsExecuting(false)
    }
  }

  const stopExecution = async () => {
    if (currentExecution) {
      await updateExecutionMutation.mutateAsync({
        id: currentExecution.id,
        status: 'CANCELLED',
      })
    }
    
    setIsExecuting(false)
  }

  if (!workflow) {
    return <div className="p-8">Loading workflow...</div>
  }

  const nodes = (workflow.nodes as unknown) as Node[]
  const totalNodes = nodes.length
  const completedNodes = Object.values(nodeStatuses).filter(
    status => status.status === 'success'
  ).length
  const failedNodes = Object.values(nodeStatuses).filter(
    status => status.status === 'error'
  ).length

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link
            href={`/workflows/${workflowId}/edit`}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Editor
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{workflow.name}</h1>
            <p className="text-muted-foreground">Workflow Execution</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={startExecution}
            disabled={isExecuting || totalNodes === 0}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExecuting ? (
              <>
                <Square className="mr-2 h-4 w-4" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Execution
              </>
            )}
          </button>

          {isExecuting && (
            <button
              onClick={stopExecution}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
            >
              <Square className="mr-2 h-4 w-4" />
              Stop
            </button>
          )}

          <button
            onClick={() => {
              setExecutionLogs([])
              setNodeStatuses({})
            }}
            disabled={isExecuting}
            className="flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 disabled:opacity-50"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Progress */}
      {totalNodes > 0 && (
        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Execution Progress</h2>
            <div className="text-sm text-muted-foreground">
              {completedNodes + failedNodes} / {totalNodes} nodes processed
            </div>
          </div>

          <div className="w-full bg-muted rounded-full h-2 mb-4">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((completedNodes + failedNodes) / totalNodes) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{completedNodes}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{failedNodes}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {totalNodes - completedNodes - failedNodes}
              </div>
              <div className="text-sm text-muted-foreground">Remaining</div>
            </div>
          </div>
        </div>
      )}

      {/* Nodes Status */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Node Status</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {nodes.map((node) => {
              const status = nodeStatuses[node.id]
              const statusColor = 
                status?.status === 'success' ? 'text-green-600' :
                status?.status === 'error' ? 'text-red-600' :
                status?.status === 'running' ? 'text-blue-600' :
                'text-muted-foreground'

              return (
                <div key={node.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div>
                    <div className="font-medium text-sm">{node.data.label}</div>
                    <div className="text-xs text-muted-foreground">{node.id}</div>
                  </div>
                  <div className={`text-sm font-medium ${statusColor}`}>
                    {status?.status || 'pending'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Execution Logs */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Execution Logs</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-xs">
            {executionLogs?.map((log, index) => (
              <div
                key={index}
                className={`p-2 rounded text-xs ${
                  log.level === 'ERROR' ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200' :
                  log.level === 'WARN' ? 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200' :
                  log.level === 'INFO' ? 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200' :
                  'bg-muted text-muted-foreground'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">
                      [{log.level}] {log.nodeId}
                    </div>
                    <div className="mt-1">{log.message}</div>
                  </div>
                  <div className="text-xs opacity-60 ml-2">
                    {log.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )) || (
              <div className="text-center text-muted-foreground py-8">
                No execution logs yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
