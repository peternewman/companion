import CoreBase from '../Core/Base.js'
import type { ActionDefinition, FeedbackDefinition } from '../Instance/Definitions.js'
import type { InstanceStatus } from '../Instance/Status.js'
import type { ActionInstance, FeedbackInstance, RunActionExtras, VariableDefinition } from '../tmp.js'

export abstract class InternalFragment extends CoreBase {
	variablesChanged?(changed_variables: Record<string, any>, removed_variables: string[]): void

	getActionDefinitions?(): Record<string, ActionDefinition>
	executeAction?(action: ActionInstance, extras: RunActionExtras): boolean | undefined

	getFeedbackDefinitions?(): Record<string, FeedbackDefinition>
	executeFeedback?(feedback: FeedbackInstance): boolean | undefined

	getVariableDefinitions?(): VariableDefinition[]
	updateVariables?(): void

	calculateInstanceErrors?(instance_statuses: Record<string, InstanceStatus | undefined>): void
}
