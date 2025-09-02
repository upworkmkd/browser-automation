'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { 
  Globe, 
  MousePointer, 
  Type, 
  Clock, 
  Camera,
  AlertCircle,
  CheckCircle,
  Loader,
  Circle
} from 'lucide-react'

const iconMap = {
  url: Globe,
  click: MousePointer,
  type: Type,
  wait: Clock,
  screenshot: Camera,
  'fill-form': Type,
  'login-form': MousePointer,
  'submit-form': MousePointer,
}

const statusConfig = {
  pending: { icon: Circle, className: 'text-muted-foreground' },
  running: { icon: Loader, className: 'text-blue-500 animate-spin' },
  success: { icon: CheckCircle, className: 'text-green-500' },
  error: { icon: AlertCircle, className: 'text-red-500' },
}

export const CustomNode = memo<NodeProps>(({ data, selected }) => {
  const IconComponent = iconMap[data.type as keyof typeof iconMap] || Circle
  const statusInfo = statusConfig[data.status as keyof typeof statusConfig] || statusConfig.pending
  const StatusIcon = statusInfo.icon

  return (
    <div 
      className={`px-4 py-3 shadow-md rounded-lg bg-card border-2 min-w-[180px] ${
        selected ? 'border-primary' : 'border-border'
      } ${data.status === 'running' ? 'border-blue-500' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-muted-foreground"
      />
      
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
          <IconComponent className="w-4 h-4 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm text-card-foreground truncate">
              {data.label}
            </div>
            <StatusIcon className={`w-4 h-4 ${statusInfo.className}`} />
          </div>
          
          {/* Show config preview */}
          {data.config && (
            <div className="text-xs text-muted-foreground mt-1 truncate">
              {data.type === 'url' && data.config.url && (
                <span>🔗 {data.config.url}</span>
              )}
              {data.type === 'click' && data.config.selector && (
                <span>👆 {data.config.selector}</span>
              )}
              {data.type === 'type' && data.config.text && (
                <span>⌨️ {data.config.text}</span>
              )}
              {data.type === 'wait' && data.config.duration && (
                <span>⏱️ {data.config.duration}ms</span>
              )}
              {data.type === 'screenshot' && (
                <span>📸 {data.config.type || 'viewport'}</span>
              )}
              {data.type === 'fill-form' && data.config.fieldLabel && (
                <span>📝 {data.config.fieldLabel}</span>
              )}
              {data.type === 'login-form' && data.config.username && (
                <span>🔐 {data.config.username}</span>
              )}
              {data.type === 'submit-form' && data.config.buttonText && (
                <span>📤 {data.config.buttonText}</span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Error message if failed */}
      {data.status === 'error' && data.error && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
          {data.error}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-muted-foreground"
      />
    </div>
  )
})
