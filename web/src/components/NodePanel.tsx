'use client'

import { useState, useEffect } from 'react'
import { Node } from 'reactflow'
import { X, Trash2, Settings } from 'lucide-react'
import { trpc } from '../app/providers'

interface NodePanelProps {
  node: Node
  onUpdateConfig: (config: any) => void
  onDelete: () => void
  onClose: () => void
}

export function NodePanel({ node, onUpdateConfig, onDelete, onClose }: NodePanelProps) {
  const [config, setConfig] = useState(node.data.config || {})
  
  const { data: nodeTemplates } = trpc.node.getTemplates.useQuery()
  const template = nodeTemplates?.find(t => t.type === node.data.type)

  useEffect(() => {
    setConfig(node.data.config || {})
  }, [node.data.config])

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    onUpdateConfig(newConfig)
  }

  const renderConfigField = (fieldKey: string, fieldConfig: any) => {
    const value = config[fieldKey] || fieldConfig.default || ''

    switch (fieldConfig.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleConfigChange(fieldKey, e.target.value)}
            placeholder={fieldConfig.placeholder}
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            required={fieldConfig.required}
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleConfigChange(fieldKey, parseInt(e.target.value) || 0)}
            placeholder={fieldConfig.placeholder}
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            required={fieldConfig.required}
          />
        )

      case 'boolean':
        return (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleConfigChange(fieldKey, e.target.checked)}
              className="rounded border-input focus:ring-2 focus:ring-ring"
            />
            <span className="text-sm">{fieldConfig.label}</span>
          </label>
        )

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleConfigChange(fieldKey, e.target.value)}
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            {fieldConfig.options?.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleConfigChange(fieldKey, e.target.value)}
            placeholder={fieldConfig.placeholder}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
            required={fieldConfig.required}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Settings className="w-4 h-4" />
          <h3 className="font-semibold">{node.data.label}</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onDelete}
            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        <div>
          <label className="block text-sm font-medium mb-2">Node ID</label>
          <input
            type="text"
            value={node.id}
            disabled
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-muted text-muted-foreground"
          />
        </div>

        {template?.config && Object.entries(template.config).map(([fieldKey, fieldConfig]: [string, any]) => (
          <div key={fieldKey}>
            <label className="block text-sm font-medium mb-2">
              {fieldConfig.label}
              {fieldConfig.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderConfigField(fieldKey, fieldConfig)}
            {fieldConfig.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {fieldConfig.description}
              </p>
            )}
          </div>
        ))}

        {/* Status Display */}
        <div>
          <label className="block text-sm font-medium mb-2">Status</label>
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
            node.data.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            node.data.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
            node.data.status === 'running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
          }`}>
            {node.data.status || 'pending'}
          </div>
        </div>

        {/* Show error if present */}
        {node.data.error && (
          <div>
            <label className="block text-sm font-medium mb-2 text-red-600">Error</label>
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
              {node.data.error}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
