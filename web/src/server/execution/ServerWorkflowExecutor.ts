// Server-side workflow executor
import { Node, Edge } from 'reactflow'

// Real browser interface for actual automation
class RealBrowser {
  private browser: any = null
  private _page: any = null
  private useMockMode = false

  async init() {
    try {
      // Try to import playwright dynamically
      const { chromium } = await import('playwright')
      
      console.log('🌐 Starting real browser with visible window...')
      this.browser = await chromium.launch({ 
        headless: false,  // Show browser window!
        slowMo: 500,      // Slow down actions for visibility
        args: ['--start-maximized']
      })
      
      this._page = await this.browser.newPage()
      await this._page.setViewportSize({ width: 1280, height: 720 })
      
      console.log('✅ Real browser initialized successfully!')
    } catch (error) {
      console.warn('⚠️ Could not start real browser, falling back to mock mode:', error instanceof Error ? error.message : String(error))
      // Fall back to mock mode
      this.useMockMode = true
    }
  }

  async goto(url: string) {
    if (this.useMockMode) {
      console.log(`🎭 Mock navigation to: ${url}`)
      await this.delay(1000)
      return
    }

    console.log(`🌐 Navigating to: ${url}`)
    try {
      await this._page.goto(url, { waitUntil: 'networkidle' })
      console.log(`✅ Successfully loaded: ${url}`)
    } catch (error) {
      console.error(`❌ Navigation failed: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  async close() {
    if (this.browser && !this.useMockMode) {
      await this.browser.close()
      console.log('🎭 Real browser closed')
    } else {
      console.log('🎭 Mock browser closed')
    }
  }

  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  get page() {
    if (this.useMockMode) {
      return {
        url: () => 'https://example.com',
        waitForLoadState: async () => { await this.delay(500) },
        waitForSelector: async (selector: string) => {
          console.log(`🔍 Mock waiting for selector: ${selector}`)
          await this.delay(300)
          return { 
            click: async () => { 
              console.log(`👆 Mock click on: ${selector}`)
              await this.delay(200)
            },
            fill: async (text: string) => {
              console.log(`⌨️ Mock fill "${text}" in: ${selector}`)
              await this.delay(300)
            },
            type: async (text: string) => {
              console.log(`⌨️ Mock type "${text}" in: ${selector}`)
              await this.delay(text.length * 50)
            },
            screenshot: async () => Buffer.from('mock-screenshot')
          }
        },
        $: async (selector: string) => {
          return {
            click: async () => console.log(`👆 Mock click: ${selector}`),
            fill: async (text: string) => console.log(`⌨️ Mock fill: ${text}`)
          }
        },
        waitForTimeout: async (ms: number) => { await this.delay(ms) },
        screenshot: async () => Buffer.from('mock-screenshot-data')
      }
    }
    
    return this._page  // Return real page object
  }
}

export interface ExecutionContext {
  browser: any
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

export class ServerWorkflowExecutor {
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
    // Use real browser with visible window
    const browser = new RealBrowser()
    await browser.init()
    
    this.context = {
      browser,
      captchaHandler: null,
      aiMatcher: null,
      variables: {},
    }
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
        case 'fill-form':
          result = await this.executeFillFormNode(node)
          break
        case 'login-form':
          result = await this.executeLoginFormNode(node)
          break
        case 'submit-form':
          result = await this.executeSubmitFormNode(node)
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

  // Smart form filling that finds inputs by label, placeholder, or name
  private async executeFillFormNode(node: Node): Promise<any> {
    const { 
      fieldLabel, 
      fieldPlaceholder, 
      fieldName, 
      fieldType = 'input',
      value,
      selector // fallback manual selector
    } = node.data.config
    
    if (!value) {
      throw new Error('Value is required for form filling')
    }

    try {
      let element = null
      const page = this.context!.browser.page

      // Strategy 1: Find by label text
      if (fieldLabel) {
        try {
          console.log(`🏷️ Looking for field with label: "${fieldLabel}"`)
          
          // Find label element and get its 'for' attribute or find input within label
          const labelElement = await page.$(`label:has-text("${fieldLabel}")`)
          if (labelElement) {
            const forAttribute = await labelElement.getAttribute('for')
            if (forAttribute) {
              element = await page.$(`#${forAttribute}`)
            } else {
              // Look for input inside the label
              element = await labelElement.$('input, textarea, select')
            }
          }
          
          if (!element) {
            // Try finding input near the label
            element = await page.$(`label:has-text("${fieldLabel}") + input, label:has-text("${fieldLabel}") ~ input`)
          }
        } catch (e) {
          console.log(`⚠️ Label search failed: ${e instanceof Error ? e.message : String(e)}`)
        }
      }

      // Strategy 2: Find by placeholder
      if (!element && fieldPlaceholder) {
        try {
          console.log(`💬 Looking for field with placeholder: "${fieldPlaceholder}"`)
          element = await page.$(`input[placeholder*="${fieldPlaceholder}" i], textarea[placeholder*="${fieldPlaceholder}" i]`)
        } catch (e) {
          console.log(`⚠️ Placeholder search failed: ${e instanceof Error ? e.message : String(e)}`)
        }
      }

      // Strategy 3: Find by name attribute
      if (!element && fieldName) {
        try {
          console.log(`📛 Looking for field with name: "${fieldName}"`)
          element = await page.$(`input[name="${fieldName}"], textarea[name="${fieldName}"], select[name="${fieldName}"]`)
        } catch (e) {
          console.log(`⚠️ Name search failed: ${e instanceof Error ? e.message : String(e)}`)
        }
      }

      // Strategy 4: Use manual selector as fallback
      if (!element && selector) {
        try {
          console.log(`🎯 Using manual selector: "${selector}"`)
          element = await page.$(selector)
        } catch (e) {
          console.log(`⚠️ Manual selector failed: ${e instanceof Error ? e.message : String(e)}`)
        }
      }

      if (!element) {
        throw new Error(`Could not find form field using any strategy. Tried: ${[fieldLabel, fieldPlaceholder, fieldName, selector].filter(Boolean).join(', ')}`)
      }

      // Fill the field
      console.log(`✍️ Filling field with value: "${value}"`)
      
      // Clear field first, then fill
      await element.click() // Focus the element
      await element.selectText() // Select all text
      await element.fill(value) // Fill with new value
      
      // Small delay to see the action
      await this.context!.browser.delay(500)
      
      return { 
        strategy: fieldLabel ? 'label' : fieldPlaceholder ? 'placeholder' : fieldName ? 'name' : 'selector',
        field: fieldLabel || fieldPlaceholder || fieldName || selector,
        value,
        filled: true 
      }
    } catch (error) {
      throw new Error(`Failed to fill form field: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Smart login form automation
  private async executeLoginFormNode(node: Node): Promise<any> {
    const { 
      username, 
      password, 
      usernameField = 'email',
      passwordField = 'password',
      submitButton = 'Login'
    } = node.data.config
    
    if (!username || !password) {
      throw new Error('Username and password are required')
    }

    try {
      const page = this.context!.browser.page
      console.log(`🔐 Starting login process...`)

      // Fill username field
      console.log(`👤 Filling username field...`)
      await this.fillFieldSmart(page, usernameField, username, ['email', 'username', 'login', 'user'])
      
      // Fill password field  
      console.log(`🔑 Filling password field...`)
      await this.fillFieldSmart(page, passwordField, password, ['password', 'pass', 'pwd'])
      
      // Click submit button
      console.log(`🚀 Clicking submit button...`)
      await this.clickButtonSmart(page, submitButton, ['submit', 'login', 'sign in', 'log in'])
      
      // Wait a bit to see the result
      await this.context!.browser.delay(2000)
      
      return { 
        username: username.replace(/./g, '*'), // Hide username in logs
        loginAttempted: true,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      throw new Error(`Login failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Smart form submission
  private async executeSubmitFormNode(node: Node): Promise<any> {
    const { 
      buttonText = 'Submit',
      buttonSelector,
      waitForResponse = true,
      successSelector
    } = node.data.config

    try {
      const page = this.context!.browser.page
      console.log(`📤 Submitting form...`)

      // Find and click submit button
      if (buttonSelector) {
        const button = await page.$(buttonSelector)
        if (button) {
          await button.click()
        } else {
          throw new Error(`Submit button not found: ${buttonSelector}`)
        }
      } else {
        await this.clickButtonSmart(page, buttonText, ['submit', 'send', 'save', 'continue'])
      }

      if (waitForResponse) {
        console.log(`⏳ Waiting for form submission response...`)
        await this.context!.browser.delay(3000)
        
        // Check for success indicator if provided
        if (successSelector) {
          try {
            await page.waitForSelector(successSelector, { timeout: 5000 })
            console.log(`✅ Success indicator found!`)
          } catch (e) {
            console.log(`⚠️ Success indicator not found, but form was submitted`)
          }
        }
      }

      return { 
        submitted: true,
        buttonText,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      throw new Error(`Form submission failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Helper method to fill fields intelligently
  private async fillFieldSmart(page: any, fieldHint: string, value: string, fallbackNames: string[]) {
    let element = null
    
    // Try exact matches first
    const searches = [
      `input[name="${fieldHint}"]`,
      `input[id="${fieldHint}"]`, 
      `input[placeholder*="${fieldHint}" i]`,
      `label:has-text("${fieldHint}") input`,
      ...fallbackNames.map(name => `input[name*="${name}" i]`),
      ...fallbackNames.map(name => `input[placeholder*="${name}" i]`),
    ]

    for (const selector of searches) {
      try {
        element = await page.$(selector)
        if (element) {
          console.log(`✅ Found field using: ${selector}`)
          break
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!element) {
      throw new Error(`Could not find field: ${fieldHint}`)
    }

    await element.click()
    await element.fill(value)
    await page.waitForTimeout(300) // Visual delay
  }

  // Helper method to click buttons intelligently  
  private async clickButtonSmart(page: any, buttonText: string, fallbackTexts: string[]) {
    let button = null
    
    // Try different button selectors
    const searches = [
      `button:has-text("${buttonText}")`,
      `input[type="submit"][value*="${buttonText}" i]`,
      `input[type="button"][value*="${buttonText}" i]`,
      `a:has-text("${buttonText}")`,
      ...fallbackTexts.map(text => `button:has-text("${text}")`),
      ...fallbackTexts.map(text => `input[type="submit"][value*="${text}" i]`),
    ]

    for (const selector of searches) {
      try {
        button = await page.$(selector)
        if (button) {
          console.log(`✅ Found button using: ${selector}`)
          break
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!button) {
      throw new Error(`Could not find button: ${buttonText}`)
    }

    await button.click()
    await page.waitForTimeout(500) // Visual delay
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
