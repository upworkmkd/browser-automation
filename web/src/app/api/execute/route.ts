import { NextRequest, NextResponse } from 'next/server'
import { ServerWorkflowExecutor } from '../../../server/execution/ServerWorkflowExecutor'
import { prisma } from '../../../server/db'

export async function POST(request: NextRequest) {
  try {
    const { workflowId } = await request.json()

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      )
    }

    // Get workflow from database
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    })

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        status: 'RUNNING',
      },
    })

    // Execute workflow
    let result
    const executor = new ServerWorkflowExecutor(
      // onNodeUpdate
      async (nodeId, status, error, data) => {
        // Update node status in real-time (you could use WebSockets here)
        console.log(`Node ${nodeId}: ${status}`, error || data)
      },
      // onLog
      async (nodeId, level, message, data) => {
        // Save log to database
        await prisma.executionLog.create({
          data: {
            executionId: execution.id,
            nodeId,
            level: level as any,
            message,
            data,
          },
        })
      }
    )

    try {
      result = await executor.executeWorkflow(
        workflow.nodes as any[],
        workflow.edges as any[]
      )

      // Update execution status
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: result.success ? 'SUCCESS' : 'FAILED',
          error: result.error,
          results: result.data,
          completedAt: new Date(),
        },
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          error: errorMessage,
          completedAt: new Date(),
        },
      })

      result = { success: false, error: errorMessage, duration: 0 }
    } finally {
      await executor.cleanup()
    }

    return NextResponse.json({
      success: result.success,
      executionId: execution.id,
      duration: result.duration,
      error: result.error,
      data: result.data,
    })

  } catch (error) {
    console.error('Execution API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
