import type { CompanionAdvancedFeedbackResult } from '@companion-module/base'
import CoreBase from '../Core/Base.js'
import type { ActionDefinition, FeedbackDefinition } from '../Instance/Definitions.js'
import type { InstanceStatusValue } from '../Instance/Status.js'
import type { ActionInstance, FeedbackInstance, RunActionExtras, VariableDefinition } from '../tmp.js'

export abstract class InternalFragment extends CoreBase {
	variablesChanged?(changed_variables: Record<string, any>, removed_variables: string[]): void

	getActionDefinitions?(): Record<string, ActionDefinition>
	executeAction?(action: ActionInstance, extras: RunActionExtras): boolean | undefined
	actionUpgrade?(action: ActionInstance, controlId: string): ActionInstance | undefined

	getFeedbackDefinitions?(): Record<string, FeedbackDefinition>
	executeFeedback?(feedback: InternalFeedbackInstance): Partial<CompanionAdvancedFeedbackResult> | boolean | undefined

	getVariableDefinitions?(): VariableDefinition[]
	updateVariables?(): void

	calculateInstanceErrors?(instance_statuses: Record<string, InstanceStatusValue | undefined>): void
}

export interface InternalCallbackInfo {
	page: number | undefined
	bank: number | undefined

	deviceid: string | undefined
}

export interface InternalFeedbackInstance extends FeedbackInstance {
	controlId: string

	info: InternalCallbackInfo
}
