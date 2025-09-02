'use client'

import { useParams } from 'next/navigation'
import { WorkflowBuilder } from '../../../../components/WorkflowBuilder'

export default function EditWorkflowPage() {
  const params = useParams()
  const workflowId = params.id as string

  return <WorkflowBuilder workflowId={workflowId} />
}
