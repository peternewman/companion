/*
 * This file is part of the Companion project
 * Copyright (c) 2018 Bitfocus AS
 * Authors: William Viker <william@bitfocus.io>, Håkon Nessjøen <haakon@bitfocus.io>
 *
 * This program is free software.
 * You should have received a copy of the MIT licence as well as the Bitfocus
 * Individual Contributor License Agreement for companion along with
 * this program.
 *
 * You can be released from the requirements of the license by purchasing
 * a commercial license. Buying such a license is mandatory as soon as you
 * develop commercial activities involving the Companion software without
 * disclosing the source code of your own applications.
 *
 */

import { ActionDefinition, FeedbackDefinition } from '../Instance/Definitions.js'
import { rgb } from '../Resources/Util.js'
import { ParseControlId } from '../Shared/ControlId.js'
import type { ActionInstance, FeedbackInstance, Registry, RunActionExtras } from '../tmp.js'
import { InternalFragment } from './FragmantBase.js'

export default class Triggers extends InternalFragment {
	constructor(registry: Registry) {
		super(registry, 'internal', 'Internal/Triggers')

		// this.internalModule = internalModule

		this.controls.triggers.on('trigger_enabled', () => {
			this.internalModule.checkFeedbacks('trigger_enabled')
		})
	}

	override getActionDefinitions(): Record<string, ActionDefinition> {
		return {
			trigger_enabled: {
				label: 'Enable or disable trigger',
				options: [
					{
						type: 'internal:trigger',
						label: 'Trigger',
						id: 'trigger_id',
					},
					{
						type: 'dropdown',
						label: 'Enable',
						id: 'enable',
						default: 'true',
						choices: [
							{ id: 'toggle', label: 'Toggle' },
							{ id: 'true', label: 'Yes' },
							{ id: 'false', label: 'No' },
						],
					},
				],
			},
		}
	}

	override executeAction(action: ActionInstance, _extras: RunActionExtras): boolean | undefined {
		if (action.action === 'trigger_enabled') {
			const parsedControlId = ParseControlId(action.options.trigger_id)
			if (parsedControlId?.type === 'trigger') {
				const control = this.controls.getControl(action.options.trigger_id)
				if (!control) return false

				let newState = action.options.enable == 'true'
				if (action.options.enable == 'toggle') newState = !control.options.enabled

				control.optionsSetField('enabled', newState)
			}

			return true
		}
		return undefined
	}

	override getFeedbackDefinitions(): Record<string, FeedbackDefinition> {
		return {
			trigger_enabled: {
				type: 'boolean',
				label: 'Check if trigger is enabled or disabled',
				style: {
					color: rgb(255, 255, 255),
					bgcolor: rgb(255, 0, 0),
				},
				options: [
					{
						type: 'internal:trigger',
						label: 'Trigger',
						id: 'trigger_id',
					},
					{
						type: 'dropdown',
						label: 'Enable',
						id: 'enable',
						default: 'true',
						choices: [
							{ id: 'true', label: 'Yes' },
							{ id: 'false', label: 'No' },
						],
					},
				],
			},
		}
	}

	override executeFeedback(feedback: FeedbackInstance): boolean | undefined {
		if (feedback.type === 'trigger_enabled') {
			const parsedControlId = ParseControlId(feedback.options.trigger_id)
			if (parsedControlId?.type === 'trigger') {
				const control = this.controls.getControl(feedback.options.trigger_id)
				if (!control) return false

				const state = control.options.enabled
				const target = feedback.options.enable == 'true'
				return state == target
			} else {
				return false
			}
		}
		return undefined
	}
}
