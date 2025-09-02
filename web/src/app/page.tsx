import Link from 'next/link'
import { ArrowRight, Bot, Workflow, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Browser Automation Platform</h1>
          </div>
          <nav className="hidden md:flex space-x-6">
            <Link href="/workflows" className="text-muted-foreground hover:text-foreground transition-colors">
              Workflows
            </Link>
            <Link href="/templates" className="text-muted-foreground hover:text-foreground transition-colors">
              Templates
            </Link>
            <Link href="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
              Documentation
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl font-extrabold tracking-tight mb-6">
            Visual Browser Automation
            <span className="text-primary"> Made Simple</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create powerful browser automation workflows with drag-and-drop simplicity. 
            Built with AI-powered element detection and comprehensive CAPTCHA solving.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link 
              href="/workflows/new"
              className="inline-flex items-center px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Create Workflow
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              href="/workflows"
              className="inline-flex items-center px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/90 transition-colors"
            >
              View All Workflows
            </Link>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-card rounded-xl p-6 shadow-sm">
              <Workflow className="h-12 w-12 text-primary mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">Visual Workflow Builder</h3>
              <p className="text-muted-foreground">
                Drag and drop nodes to create complex automation workflows without writing code.
              </p>
            </div>
            
            <div className="bg-card rounded-xl p-6 shadow-sm">
              <Bot className="h-12 w-12 text-primary mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">AI-Powered Detection</h3>
              <p className="text-muted-foreground">
                Use GPT-4 to intelligently find and interact with elements using natural language descriptions.
              </p>
            </div>
            
            <div className="bg-card rounded-xl p-6 shadow-sm">
              <Zap className="h-12 w-12 text-primary mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">Universal CAPTCHA Solver</h3>
              <p className="text-muted-foreground">
                Handle any CAPTCHA automatically including reCAPTCHA, hCaptcha, math problems, and puzzles.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-border mt-16">
        <div className="text-center text-muted-foreground">
          <p>&copy; 2024 Browser Automation Platform. Built with Next.js and AI.</p>
        </div>
      </footer>
    </div>
  )
}
