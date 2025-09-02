'use client'

import { useCallback, useEffect, useState } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Plus, Play, Save, Settings } from 'lucide-react'
import { CustomNode } from './nodes/CustomNode'
import { NodePanel } from './NodePanel'
import { trpc } from '../app/providers'

const nodeTypes = {
  custom: CustomNode,
}

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'custom',
    position: { x: 250, y: 25 },
    data: { 
      type: 'url',
      label: 'Open URL',
      config: { url: 'https://example.com' },
      status: 'pending'
    },
  },
]

const initialEdges: Edge[] = []

export function WorkflowBuilder({ workflowId }: { workflowId?: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showNodePanel, setShowNodePanel] = useState(false)
  const [workflowName, setWorkflowName] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const { data: nodeTemplates } = trpc.node.getTemplates.useQuery()
  const { data: workflow } = trpc.workflow.getById.useQuery(
    { id: workflowId! }, 
    { enabled: !!workflowId }
  )
  
  const updateWorkflowMutation = trpc.workflow.update.useMutation()
  const createWorkflowMutation = trpc.workflow.create.useMutation()
  
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds))
      setHasUnsavedChanges(true)
    },
    [setEdges],
  )

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const addNode = (template: any) => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type: 'custom',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        type: template.type,
        label: template.name,
        config: {},
        status: 'pending',
      },
    }
    setNodes((nds) => [...nds, newNode])
    setShowNodePanel(false)
    setHasUnsavedChanges(true)
  }

  const updateNodeConfig = (nodeId: string, config: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, config } }
          : node
      )
    )
    setHasUnsavedChanges(true)
  }

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId))
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
    setSelectedNode(null)
    setHasUnsavedChanges(true)
  }

  // Load existing workflow
  useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name)
      setNodes((workflow.nodes as unknown) as Node[])
      setEdges((workflow.edges as unknown) as Edge[])
      setHasUnsavedChanges(false)
    }
  }, [workflow, setNodes, setEdges])

  const handleSave = async () => {
    try {
      const workflowData = {
        name: workflowName || 'Untitled Workflow',
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type || 'custom',
          position: node.position,
          data: node.data
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle || undefined,
          targetHandle: edge.targetHandle || undefined
        })),
      }

      if (workflowId) {
        // Update existing workflow
        await updateWorkflowMutation.mutateAsync({
          id: workflowId,
          data: workflowData,
        })
      } else {
        // Create new workflow
        const newWorkflow = await createWorkflowMutation.mutateAsync({
          ...workflowData,
          description: '',
        })
        // Redirect to edit page for the new workflow
        window.location.href = `/workflows/${newWorkflow.id}/edit`
        return
      }
      
      setHasUnsavedChanges(false)
      console.log('✅ Workflow saved successfully!')
    } catch (error) {
      console.error('❌ Failed to save workflow:', error)
    }
  }

  const handleRun = () => {
    if (workflowId) {
      // Navigate to execution page
      window.location.href = `/workflows/${workflowId}/execute`
    } else {
      alert('Please save the workflow first before running it.')
    }
  }

  return (
    <div className="h-screen bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        
        {/* Top Panel - Actions */}
        <Panel position="top-right" className="space-x-2">
          {/* Workflow Name Input */}
          {!workflowId && (
            <input
              type="text"
              value={workflowName}
              onChange={(e) => {
                setWorkflowName(e.target.value)
                setHasUnsavedChanges(true)
              }}
              placeholder="Workflow name..."
              className="px-3 py-2 border border-input rounded-lg text-sm bg-background"
            />
          )}
          <button
            onClick={() => setShowNodePanel(!showNodePanel)}
            className="flex items-center px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Node
          </button>
          
          <button 
            onClick={handleSave}
            disabled={updateWorkflowMutation.isLoading || createWorkflowMutation.isLoading}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              hasUnsavedChanges 
                ? 'bg-orange-600 text-white hover:bg-orange-700' 
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
            }`}
          >
            <Save className="mr-1 h-4 w-4" />
            {updateWorkflowMutation.isLoading || createWorkflowMutation.isLoading 
              ? 'Saving...' 
              : hasUnsavedChanges 
                ? 'Save*' 
                : 'Saved'
            }
          </button>
          
          <button 
            onClick={handleRun}
            disabled={!workflowId}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="mr-1 h-4 w-4" />
            Run
          </button>
        </Panel>

        {/* Node Panel */}
        {showNodePanel && (
          <Panel position="top-left" className="w-80">
            <div className="bg-card border border-border rounded-lg shadow-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Add Node</h3>
                <button
                  onClick={() => setShowNodePanel(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {nodeTemplates?.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => addNode(template)}
                    className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {template.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Panel>
        )}

        {/* Node Configuration Panel */}
        {selectedNode && (
          <Panel position="bottom-right" className="w-80">
            <NodePanel
              node={selectedNode}
              onUpdateConfig={(config) => updateNodeConfig(selectedNode.id, config)}
              onDelete={() => deleteNode(selectedNode.id)}
              onClose={() => setSelectedNode(null)}
            />
          </Panel>
        )}
      </ReactFlow>
    </div>
  )
}
