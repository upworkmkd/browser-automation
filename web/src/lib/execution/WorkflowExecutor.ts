import { Node, Edge } from 'reactflow'

// Server-side execution interfaces
export interface BrowserHelperInterface {
  init(): Promise<void>
  goto(url: string): Promise<void>
  page: any
  close(): Promise<void>
}

export interface ExecutionContext {
  browser: BrowserHelperInterface
  captchaHandler: any
  aiMatcher: any
  variables: Record<string, any>
}

export interface ExecutionResult {
  success: boolean
  error?: string
  data?: any
  duration: number
}

export class WorkflowExecutor {
  private context: ExecutionContext | null = null
  private onNodeUpdate?: (nodeId: string, status: string, error?: string, data?: any) => void
  private onLog?: (nodeId: string, level: string, message: string, data?: any) => void

  constructor(
    onNodeUpdate?: (nodeId: string, status: string, error?: string, data?: any) => void,
    onLog?: (nodeId: string, level: string, message: string, data?: any) => void
  ) {
    this.onNodeUpdate = onNodeUpdate
    this.onLog = onLog
  }

  async initialize(): Promise<void> {
    // This will be implemented server-side
    throw new Error('WorkflowExecutor.initialize() should only be called server-side')
  }

  async executeWorkflow(nodes: Node[], edges: Edge[]): Promise<ExecutionResult> {
    if (!this.context) {
      await this.initialize()
    }

    const startTime = Date.now()

    try {
      // Build execution graph
      const executionOrder = this.buildExecutionOrder(nodes, edges)
      
      this.log('workflow', 'INFO', `Starting workflow execution with ${nodes.length} nodes`)

      // Execute nodes in order
      for (const nodeId of executionOrder) {
        const node = nodes.find(n => n.id === nodeId)
        if (!node) continue

        await this.executeNode(node)
      }

      const duration = Date.now() - startTime
      this.log('workflow', 'INFO', `Workflow completed successfully in ${duration}ms`)

      return {
        success: true,
        duration,
        data: this.context!.variables,
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      this.log('workflow', 'ERROR', `Workflow failed: ${errorMessage}`)

      return {
        success: false,
        error: errorMessage,
        duration,
      }
    }
  }

  private async executeNode(node: Node): Promise<void> {
    this.updateNodeStatus(node.id, 'running')
    this.log(node.id, 'INFO', `Executing ${node.data.type} node`)

    const startTime = Date.now()

    try {
      let result: any = null

      switch (node.data.type) {
        case 'url':
          result = await this.executeUrlNode(node)
          break
        case 'click':
          result = await this.executeClickNode(node)
          break
        case 'type':
          result = await this.executeTypeNode(node)
          break
        case 'wait':
          result = await this.executeWaitNode(node)
          break
        case 'screenshot':
          result = await this.executeScreenshotNode(node)
          break
        default:
          throw new Error(`Unknown node type: ${node.data.type}`)
      }

      const duration = Date.now() - startTime
      this.updateNodeStatus(node.id, 'success', undefined, result)
      this.log(node.id, 'INFO', `Node completed successfully in ${duration}ms`, result)

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      this.updateNodeStatus(node.id, 'error', errorMessage)
      this.log(node.id, 'ERROR', `Node failed after ${duration}ms: ${errorMessage}`)
      throw error
    }
  }

  private async executeUrlNode(node: Node): Promise<any> {
    const { url, waitForLoad = true, timeout = 10000 } = node.data.config
    
    if (!url) {
      throw new Error('URL is required')
    }

    await this.context!.browser.goto(url)
    
    if (waitForLoad) {
      await this.context!.browser.page.waitForLoadState('networkidle', { timeout })
    }

    return { url, currentUrl: this.context!.browser.page.url() }
  }

  private async executeClickNode(node: Node): Promise<any> {
    const { selector, selectorType = 'css', waitTimeout = 5000 } = node.data.config
    
    if (!selector) {
      throw new Error('Selector is required')
    }

    let element
    
    try {
      await this.context!.browser.page.waitForSelector(selector, { timeout: waitTimeout })
      element = await this.context!.browser.page.$(selector)
      
      if (!element) {
        throw new Error(`Element not found: ${selector}`)
      }

      await element.click()
      
      return { selector, clicked: true }
    } catch (error) {
      throw new Error(`Failed to click element "${selector}": ${error}`)
    }
  }

  private async executeTypeNode(node: Node): Promise<any> {
    const { 
      selector, 
      text, 
      clearFirst = true, 
      typeDelay = 100 
    } = node.data.config
    
    if (!selector || !text) {
      throw new Error('Selector and text are required')
    }

    try {
      const element = await this.context!.browser.page.waitForSelector(selector)
      
      if (clearFirst) {
        await element.fill('')
      }

      await element.type(text, { delay: typeDelay })
      
      return { selector, text, typed: true }
    } catch (error) {
      throw new Error(`Failed to type in element "${selector}": ${error}`)
    }
  }

  private async executeWaitNode(node: Node): Promise<any> {
    const { 
      waitType = 'time', 
      duration = 2000, 
      selector 
    } = node.data.config

    switch (waitType) {
      case 'time':
        await this.context!.browser.page.waitForTimeout(duration)
        return { waitType, duration }
        
      case 'element':
        if (!selector) {
          throw new Error('Selector is required for element wait')
        }
        await this.context!.browser.page.waitForSelector(selector)
        return { waitType, selector }
        
      case 'network':
        await this.context!.browser.page.waitForLoadState('networkidle')
        return { waitType }
        
      default:
        throw new Error(`Unknown wait type: ${waitType}`)
    }
  }

  private async executeScreenshotNode(node: Node): Promise<any> {
    const { 
      type = 'viewport', 
      selector, 
      filename = 'screenshot.png' 
    } = node.data.config

    let screenshotBuffer: Buffer

    switch (type) {
      case 'fullPage':
        screenshotBuffer = await this.context!.browser.page.screenshot({ fullPage: true })
        break
        
      case 'element':
        if (!selector) {
          throw new Error('Selector is required for element screenshot')
        }
        const element = await this.context!.browser.page.$(selector)
        if (!element) {
          throw new Error(`Element not found: ${selector}`)
        }
        screenshotBuffer = await element.screenshot()
        break
        
      case 'viewport':
      default:
        screenshotBuffer = await this.context!.browser.page.screenshot()
        break
    }

    // In a real implementation, you'd save this to storage
    const screenshotPath = `screenshots/${filename}`
    
    return { 
      type, 
      selector, 
      filename, 
      path: screenshotPath,
      size: screenshotBuffer.length 
    }
  }

  private buildExecutionOrder(nodes: Node[], edges: Edge[]): string[] {
    // Simple topological sort for now
    // In a real implementation, you'd handle parallel execution and complex flows
    
    const inDegree = new Map<string, number>()
    const adjacency = new Map<string, string[]>()
    
    // Initialize
    nodes.forEach(node => {
      inDegree.set(node.id, 0)
      adjacency.set(node.id, [])
    })
    
    // Build graph
    edges.forEach(edge => {
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
      adjacency.get(edge.source)?.push(edge.target)
    })
    
    // Find starting nodes (no incoming edges)
    const queue = nodes
      .filter(node => inDegree.get(node.id) === 0)
      .map(node => node.id)
    
    const result: string[] = []
    
    while (queue.length > 0) {
      const current = queue.shift()!
      result.push(current)
      
      // Process neighbors
      adjacency.get(current)?.forEach(neighbor => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1
        inDegree.set(neighbor, newDegree)
        
        if (newDegree === 0) {
          queue.push(neighbor)
        }
      })
    }
    
    return result
  }

  private updateNodeStatus(nodeId: string, status: string, error?: string, data?: any) {
    this.onNodeUpdate?.(nodeId, status, error, data)
  }

  private log(nodeId: string, level: string, message: string, data?: any) {
    this.onLog?.(nodeId, level, message, data)
  }

  async cleanup(): Promise<void> {
    if (this.context?.browser) {
      await this.context.browser.close()
    }
  }
}
