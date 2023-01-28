import { cloneDeep } from 'lodash-es'
import { nanoid } from 'nanoid'
import CoreBase from '../Core/Base.js'
import { CreateBankControlId } from '../Shared/ControlId.js'
import { EventDefinitions } from '../Resources/EventDefinitions.js'
import type Registry from '../Registry.js'
import { ActionInstance, Complete, FeedbackInstance, SocketClient, TriggerEventInstance } from '../tmp.js'
import {
	CompanionButtonPresetOptions,
	CompanionButtonStyleProps,
	CompanionFeedbackButtonStyleResult,
	CompanionPresetAction,
	CompanionButtonPresetDefinition as ModulePresetDefinition,
} from '@companion-module/base'
import ControlButtonNormal, { ButtonConfig } from '../Controls/ControlTypes/Button/Normal.js'
import { SomeUIInputField } from '../Shared/InputFields.js'

const PresetsRoom = 'presets'
const ActionsRoom = 'action-definitions'
const FeedbacksRoom = 'feedback-definitions'

export interface FeedbackDefinition {
	label: string
	description?: string
	options: Array<SomeUIInputField>
	type: string
	style?: unknown

	previewControlIdFn?: string
}
export interface ActionDefinition {
	label: string
	description?: string
	options: Array<SomeUIInputField>

	previewControlIdFn?: string
}
export interface ButtonPresetDefinition {
	id: string
	category: string
	name: string
	type: 'button'
	style: CompanionButtonStyleProps
	/** Options for this preset */
	options?: CompanionButtonPresetOptions
	/** The feedbacks on the button */
	feedbacks: PresetFeedback[]
	steps: ButtonPresetStepActions[]
}
export interface PresetFeedback {
	/** The id of the feedback definition */
	type: string
	/** The option values for the action */
	options: Record<string, any>
	/**
	 * If a boolean feedback, the style effect of the feedback
	 */
	style?: CompanionFeedbackButtonStyleResult
}
export interface ButtonPresetStepActions {
	/** The button down actions */
	down: PresetAction[]
	/** The button up actions */
	up: PresetAction[]
	rotate_left?: PresetAction[]
	rotate_right?: PresetAction[]

	[delay: number]: PresetAction[] | undefined
}
export interface PresetAction {
	/** The id of the action definition */
	action: string
	/** The execution delay of the action */
	delay?: number
	/** The option values for the action */
	options: Record<string, any>
}

export interface UIPreset {
	id: string
	label: string
	category: string
}

function convertPresetActions(actions: CompanionPresetAction[]): PresetAction[] {
	return actions?.map(
		(act) =>
			({
				action: act.actionId,
				options: act.options,
				delay: act.delay,
			} satisfies Complete<PresetAction>)
	)
}

/**
 * Class to handle and store the 'definitions' produced by instances.
 *
 * @extends CoreBase
 * @author Håkon Nessjøen <haakon@bitfocus.io>
 * @author Keith Rocheck <keith.rocheck@gmail.com>
 * @author William Viker <william@bitfocus.io>
 * @author Julian Waller <me@julusian.co.uk>
 * @since 3.0.0
 * @abstract
 * @copyright 2022 Bitfocus AS
 * @license
 * This program is free software.
 * You should have received a copy of the MIT licence as well as the Bitfocus
 * Individual Contributor License Agreement for Companion along with
 * this program.
 *
 * You can be released from the requirements of the license by purchasing
 * a commercial license. Buying such a license is mandatory as soon as you
 * develop commercial activities involving the Companion software without
 * disclosing the source code of your own applications.
 */
class InstanceDefinitions extends CoreBase {
	/**
	 * The action definitions
	 * @type {Object}
	 * @access private
	 */
	#actionDefinitions: Record<string, Record<string, ActionDefinition>> = {}
	/**
	 * The feedback definitions
	 * @type {Object}
	 * @access protected
	 */
	#feedbackDefinitions: Record<string, Record<string, FeedbackDefinition>> = {}
	/**
	 * The preset definitions
	 * @type {Object}
	 * @access protected
	 */
	#presetDefinitions: Record<string, Record<string, ButtonPresetDefinition>> = {}

	/**
	 * @param {Registry} registry - the application core
	 */
	constructor(registry: Registry) {
		super(registry, 'definitions', 'Instance/Definitions')
	}

	/**
	 * Setup a new socket client's events
	 * @param {SocketIO} client - the client socket
	 * @access public
	 */
	clientConnect(client: SocketClient) {
		client.onPromise('presets:subscribe', () => {
			client.join(PresetsRoom)

			const result: Record<string, Record<string, UIPreset>> = {}
			for (const [id, presets] of Object.entries(this.#presetDefinitions)) {
				if (Object.keys(presets).length > 0) {
					result[id] = this.#simplifyPresetsForUi(presets)
				}
			}

			return result
		})
		client.onPromise('presets:unsubscribe', () => {
			client.leave(PresetsRoom)
		})

		client.onPromise('action-definitions:subscribe', () => {
			client.join(ActionsRoom)

			return this.#actionDefinitions
		})
		client.onPromise('action-definitions:unsubscribe', () => {
			client.leave(ActionsRoom)
		})

		client.onPromise('feedback-definitions:subscribe', () => {
			client.join(FeedbacksRoom)

			return this.#feedbackDefinitions
		})
		client.onPromise('feedback-definitions:unsubscribe', () => {
			client.leave(FeedbacksRoom)
		})

		client.onPromise('event-definitions:get', () => {
			return EventDefinitions
		})

		client.onPromise('presets:import_to_bank', this.importPresetToBank.bind(this))

		client.onPromise('presets:preview_render', (instanceId: string, preset_id: string) => {
			const definition = this.#presetDefinitions[instanceId]?.[preset_id]
			if (definition) {
				const style = {
					...definition.style,
					style: definition.type,
				}

				if (style.text) style.text = this.instance.variable.parseVariables(style.text).text

				const render = this.graphics.drawPreview(style)
				if (render) {
					return render.buffer
				} else {
					return null
				}
			} else {
				return null
			}
		})

		client.onPromise('action-definitions:create-item', this.createActionItem.bind(this))
		client.onPromise('feedback-definitions:create-item', this.createFeedbackItem.bind(this))

		client.onPromise('action-definitions:learn-single', (action: ActionInstance) => {
			if (action) {
				const instance = this.instance.moduleHost.getChild(action.instance)
				if (instance) {
					return instance.actionLearnValues(action)
				}
			}
		})
		client.onPromise('feedback-definitions:learn-single', (feedback: FeedbackInstance) => {
			if (feedback) {
				const instance = this.instance.moduleHost.getChild(feedback.instance_id)
				if (instance) {
					return instance.feedbackLearnValues(feedback)
				}
			}
		})
	}

	/**
	 * Create a action item without saving
	 * @param {string} instanceId - the id of the instance
	 * @param {string} actionId - the id of the action
	 * @access public
	 */
	createActionItem(instanceId: string, actionId: string) {
		const definition = this.getActionDefinition(instanceId, actionId)
		if (definition) {
			const action: ActionInstance = {
				id: nanoid(),
				action: actionId,
				instance: instanceId,
				options: {},
				delay: 0,
			}

			if (definition.options !== undefined && definition.options.length > 0) {
				for (const j in definition.options) {
					const opt = definition.options[j]
					action.options[opt.id] = cloneDeep(opt.default)
				}
			}

			return action
		} else {
			return null
		}
	}

	/**
	 * Create a feedback item without saving fpr the UI
	 * @param {string} instanceId - the id of the instance
	 * @param {string} feedbackId - the id of the feedback
	 * @param {boolean} booleanOnly - whether the feedback must be boolean
	 * @access public
	 */
	createFeedbackItem(instanceId: string, feedbackId: string, booleanOnly: boolean) {
		const definition = this.getFeedbackDefinition(instanceId, feedbackId)
		if (definition) {
			if (booleanOnly && definition.type !== 'boolean') return null

			const feedback: FeedbackInstance = {
				id: nanoid(),
				type: feedbackId,
				instance_id: instanceId,
				options: {},
				style: {},
			}

			if (definition.options !== undefined && definition.options.length > 0) {
				for (const j in definition.options) {
					const opt = definition.options[j]
					feedback.options[opt.id] = cloneDeep(opt.default)
				}
			}

			if (!booleanOnly && definition.type === 'boolean' && definition.style) {
				feedback.style = cloneDeep(definition.style)
			}

			return feedback
		} else {
			return null
		}
	}

	createEventItem(eventType: string) {
		const definition = EventDefinitions[eventType]
		if (definition) {
			const event: TriggerEventInstance = {
				id: nanoid(),
				type: eventType,
				enabled: true,
				options: {},
			}

			for (const opt of definition.options) {
				if ('default' in opt) {
					event.options[opt.id] = cloneDeep(opt.default)
				}
			}

			return event
		} else {
			return null
		}
	}

	/**
	 * Forget all the definitions for an instance
	 * @param {string} instanceId
	 * @access public
	 */
	forgetInstance(instanceId: string) {
		delete this.#presetDefinitions[instanceId]
		this.io.emitToRoom(PresetsRoom, 'presets:update', instanceId, undefined)

		delete this.#actionDefinitions[instanceId]
		this.io.emitToRoom(ActionsRoom, 'action-definitions:update', instanceId, undefined)

		delete this.#feedbackDefinitions[instanceId]
		this.io.emitToRoom(FeedbacksRoom, 'feedback-definitions:update', instanceId, undefined)
	}

	/**
	 * Get an action definition
	 * @param {string} instanceId
	 * @param {string} actionId
	 * @access public
	 */
	getActionDefinition(instanceId: string, actionId: string) {
		if (this.#actionDefinitions[instanceId]) {
			return this.#actionDefinitions[instanceId][actionId]
		} else {
			return undefined
		}
	}

	/**
	 * Get a feedback definition
	 * @param {string} instanceId
	 * @param {string} feedbackId
	 * @access public
	 */
	getFeedbackDefinition(instanceId: string, feedbackId: string) {
		if (this.#feedbackDefinitions[instanceId]) {
			return this.#feedbackDefinitions[instanceId][feedbackId]
		} else {
			return undefined
		}
	}

	/**
	 * Import a preset onto a bank
	 * @param {string} instanceId
	 * @param {object} preset_id
	 * @param {number} page
	 * @param {number} bank
	 * @access public
	 */
	importPresetToBank(instanceId: string, preset_id: string, page: number, bank: number) {
		const rawPreset = this.#presetDefinitions[instanceId]?.[preset_id]
		if (rawPreset) {
			const definition: ButtonConfig = {
				type: 'button',
				style: cloneDeep({
					...ControlButtonNormal.DefaultStyle,
					...(rawPreset.style as any), // TODO HACK
				}),
				options: cloneDeep({
					...ControlButtonNormal.DefaultOptions,
					...rawPreset.options,
				}),
				feedbacks: [],
				steps: {},
			}

			if (rawPreset.steps) {
				for (let i = 0; i < rawPreset.steps.length; i++) {
					const action_sets: Record<string, ActionInstance[]> = {}

					for (let set in rawPreset.steps[i]) {
						const rawSet = rawPreset.steps[i][set]
						if (rawSet) {
							action_sets[set] = rawSet.map((act) => ({
								id: nanoid(),
								instance: instanceId,
								action: act.action,
								delay: act.delay ?? 0,
								options: act.options,
							}))
						}
					}

					definition.steps[i] = {
						action_sets: action_sets,
						options: cloneDeep(ControlButtonNormal.DefaultStepOptions),
					}
				}
			}

			if (rawPreset.feedbacks) {
				definition.feedbacks = rawPreset.feedbacks.map(
					(fb) =>
						({
							id: nanoid(),
							instance_id: instanceId,
							type: fb.type,
							options: fb.options,
							style: fb.style,
						} satisfies FeedbackInstance)
				)
			}

			if (!rawPreset.options) {
				// TODO - how is this possible?
				rawPreset.options = {}
			}

			this.controls.importControl(CreateBankControlId(page, bank), rawPreset)
		}
	}

	/**
	 * Set the action definitions for an instance
	 * @param {string} instanceId
	 * @param {object} actions
	 * @access public
	 */
	setActionDefinitions(instanceId: string, actions: Record<string, ActionDefinition>) {
		this.#actionDefinitions[instanceId] = actions
		this.io.emitToRoom(ActionsRoom, 'action-definitions:update', instanceId, actions)
	}

	/**
	 * Set the feedback definitions for an instance
	 * @param {string} instanceId - the instance ID
	 * @param {object} feedbacks - the feedback definitions
	 * @access public
	 */
	setFeedbackDefinitions(instanceId: string, feedbacks: Record<string, FeedbackDefinition>) {
		this.#feedbackDefinitions[instanceId] = feedbacks
		this.io.emitToRoom(FeedbacksRoom, 'feedback-definitions:update', instanceId, feedbacks)
	}

	/**
	 * Set the preset definitions for an instance
	 * @access public
	 * @param {string} instanceId
	 * @param {string} label
	 * @param {object} rawPresets
	 */
	setPresetDefinitions(instanceId: string, label: string, rawPresets: Record<string, ModulePresetDefinition>) {
		const newPresets: Record<string, ButtonPresetDefinition> = {}

		for (const [id, rawPreset] of Object.entries(rawPresets)) {
			try {
				newPresets[id] = {
					id: id,
					category: rawPreset.category,
					name: rawPreset.name,
					type: rawPreset.type,
					style: rawPreset.style,
					options: rawPreset.options,
					feedbacks: rawPreset.feedbacks.map((fb) => ({
						type: fb.feedbackId,
						options: fb.options,
						style: fb.style,
					})),
					steps: rawPreset.steps.map(
						(step) =>
							({
								down: convertPresetActions(step.down),
								up: convertPresetActions(step.up),
								rotate_left: rawPreset.options?.rotaryActions
									? convertPresetActions(step.rotate_left || [])
									: undefined,
								rotate_right: rawPreset.options?.rotaryActions
									? convertPresetActions(step.rotate_right || [])
									: undefined,
								// TODO - delay groups
							} satisfies Complete<ButtonPresetStepActions>)
					),
				}

				if (!newPresets[id].steps.length) {
					newPresets[id].steps.push({ down: [], up: [] })
				}
			} catch (e) {
				this.logger.warn(`${label} gave invalid preset "${id}": ${e}`)
			}
		}

		this.#updateVariablePrefixesAndStoreDefinitions(instanceId, label, newPresets)
	}

	/**
	 * The ui doesnt need many of the preset properties. Simplify an array of them in preparation for sending to the ui
	 * @param {object} presets
	 * @access private
	 */
	#simplifyPresetsForUi(presets: Record<string, ButtonPresetDefinition>): Record<string, UIPreset> {
		const res: Record<string, UIPreset> = {}

		for (const [id, preset] of Object.entries(presets)) {
			res[id] = {
				id: preset.id,
				label: preset.name,
				category: preset.category,
			}
		}

		return res
	}

	/**
	 * Update all the variables in the presets to reference the supplied label
	 * @param {string} instanceId
	 * @param {string} labelTo
	 */
	updateVariablePrefixesForLabel(instanceId: string, labelTo: string) {
		if (this.#presetDefinitions[instanceId] !== undefined) {
			this.logger.silly('Updating presets for instance ' + labelTo)
			this.#updateVariablePrefixesAndStoreDefinitions(instanceId, labelTo, this.#presetDefinitions[instanceId])
		}
	}

	/**
	 * Update all the variables in the presets to reference the supplied label, and store them
	 * @param {string} instanceId
	 * @param {string} label
	 * @param {object} presets
	 */
	#updateVariablePrefixesAndStoreDefinitions(
		instanceId: string,
		label: string,
		presets: Record<string, ButtonPresetDefinition>
	) {
		const variableRegex = /\$\(([^:)]+):([^)]+)\)/g
		function replaceAllVariables(fixtext: string) {
			if (fixtext && fixtext.includes('$(')) {
				let matches
				while ((matches = variableRegex.exec(fixtext)) !== null) {
					if (matches[2] !== undefined) {
						fixtext = fixtext.replace(matches[0], '$(' + label + ':' + matches[2] + ')')
					}
				}
			}
			return fixtext
		}

		/*
		 * Clean up variable references: $(instance:variable)
		 * since the name of the instance is dynamic. We don't want to
		 * demand that your presets MUST be dynamically generated.
		 */
		for (const preset of Object.values(presets)) {
			if (preset.style) {
				preset.style.text = replaceAllVariables(preset.style.text)
			}

			if (preset.feedbacks) {
				for (const feedback of preset.feedbacks) {
					if (feedback.style && feedback.style.text) {
						feedback.style.text = replaceAllVariables(feedback.style.text)
					}
				}
			}
		}

		this.#presetDefinitions[instanceId] = presets
		this.io.emitToRoom(PresetsRoom, 'presets:update', instanceId, this.#simplifyPresetsForUi(presets))
	}
}

export default InstanceDefinitions
