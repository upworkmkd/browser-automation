# Browser Automation Platform - Web Interface

A visual workflow builder for browser automation with AI-powered capabilities. This is the Phase 1 implementation featuring a Next.js web interface with PostgreSQL database.

## Features

- 🎨 **Visual Workflow Builder** - Drag and drop nodes to create automation workflows
- 🤖 **AI-Powered Nodes** - Intelligent element detection using GPT-4
- 🔧 **Basic Node Types** - URL, Click, Type, Wait, Screenshot nodes
- 📊 **Real-time Execution** - Monitor workflow progress with live status updates
- 💾 **PostgreSQL Database** - Persistent workflow and execution storage
- 🔄 **tRPC API** - Type-safe API with automatic serialization

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenAI API key (for AI-powered features)

### Installation

1. **Install dependencies:**
   ```bash
   cd web
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/browser_automation_web"
   OPENAI_API_KEY="your_openai_api_key"
   ```

3. **Set up the database:**
   ```bash
   # Initialize Prisma
   npx prisma generate
   
   # Push the schema to your database
   npx prisma db push
   
   # Optional: Open Prisma Studio to view data
   npx prisma studio
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3001](http://localhost:3001)

## Project Structure

```
web/
├── src/
│   ├── app/                  # Next.js 13 App Router
│   │   ├── api/trpc/        # tRPC API routes
│   │   ├── workflows/       # Workflow management pages
│   │   └── providers.tsx    # React Query + tRPC providers
│   ├── components/          # React components
│   │   ├── nodes/           # Custom node components
│   │   ├── WorkflowBuilder.tsx
│   │   └── NodePanel.tsx
│   ├── lib/                 # Utilities and business logic
│   │   └── execution/       # Workflow execution engine
│   └── server/              # Server-side code
│       ├── routers/         # tRPC routers
│       ├── context.ts       # tRPC context
│       └── db.ts           # Prisma client
├── prisma/
│   └── schema.prisma       # Database schema
└── package.json
```

## Usage

### Creating a Workflow

1. Navigate to the **Workflows** page
2. Click **"New Workflow"**
3. Enter a name and description
4. Click **"Create Workflow"** to open the visual editor

### Building a Workflow

1. **Add Nodes**: Click the **"Add Node"** button to see available node types
2. **Configure Nodes**: Click on any node to configure its settings in the right panel
3. **Connect Nodes**: Drag from the bottom handle of one node to the top handle of another
4. **Save Workflow**: Click **"Save"** to persist your changes

### Running a Workflow

1. From the workflow editor, click **"Run"** or navigate to the execution page
2. Click **"Start Execution"** to begin automation
3. Monitor real-time progress and logs
4. View detailed results and any errors

## Available Node Types

### Navigation Nodes
- **URL Node**: Navigate to a specific URL
- **Wait Node**: Wait for time, elements, or network idle

### Interaction Nodes  
- **Click Node**: Click on page elements using CSS selectors
- **Type Node**: Type text into input fields

### Data Nodes
- **Screenshot Node**: Capture screenshots of pages or elements

## Integration with Existing CLI Tool

The web interface integrates seamlessly with the existing browser automation infrastructure:

- **Browser Automation**: Uses the same `BrowserHelper` class
- **CAPTCHA Solving**: Integrates the comprehensive CAPTCHA handler
- **AI Matching**: Leverages the existing `AIMatcher` for intelligent element detection

## Database Schema

The application uses PostgreSQL with the following main tables:

- **workflows**: Store workflow definitions (nodes and edges as JSON)
- **workflow_executions**: Track execution runs and results  
- **execution_logs**: Detailed logs for each node execution
- **node_templates**: Predefined node type configurations

## API Routes

All API routes are type-safe using tRPC:

- `workflow.*`: CRUD operations for workflows
- `execution.*`: Execution management and logging
- `node.*`: Node template management

## Development

### Adding New Node Types

1. **Add node template** in `src/server/routers/node.ts`
2. **Create execution logic** in `src/lib/execution/WorkflowExecutor.ts`
3. **Update UI components** if needed (icons, configuration forms)

### Database Changes

1. **Update Prisma schema**: Edit `prisma/schema.prisma`
2. **Generate client**: Run `npx prisma generate`
3. **Push to database**: Run `npx prisma db push`

## Roadmap

### Phase 2 (Next Steps)
- AI-powered element detection nodes
- Integration of comprehensive CAPTCHA solver
- Advanced logic nodes (conditions, loops)
- Real-time WebSocket updates

### Phase 3 (Future)
- Cloud execution capabilities
- Team collaboration features
- Template marketplace
- Advanced analytics

## Contributing

This is Phase 1 of the browser automation platform. The foundation is built to support the full roadmap outlined in `../roadmap.md`.

## License

This project is part of the larger browser automation toolkit.
