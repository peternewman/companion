import ControlBase, {
	ControlBaseWithActions,
	ControlBaseWithEvents,
	ControlBaseWithFeedbacks,
} from '../../ControlBase.js'
import FragmentActions from '../../Fragments/FragmentActions.js'
import FragmentFeedbacks from '../../Fragments/FragmentFeedbacks.js'
import { TriggersListRoom } from '../../Controller.js'
import { cloneDeep } from 'lodash-es'
import jsonPatch from 'fast-json-patch'
import debounceFn from 'debounce-fn'
import TriggersEventTimer from './Events/Timer.js'
import TriggersEventMisc from './Events/Misc.js'
import { clamp } from '../../../Resources/Util.js'
import TriggersEventVariables from './Events/Variable.js'
import type { ActionInstance, FeedbackInstance, Registry, TriggerEventInstance } from '../../../tmp.js'
import { nanoid } from 'nanoid'
import TriggerEvents from '../../TriggerEvents.js'

export interface TriggerInfo extends TriggerOptions {
	type: 'trigger'
	lastExecuted: number | undefined
	description: string
}

export interface TriggerConfig {
	type: 'trigger'
	options: TriggerOptions
	action_sets: Record<string, ActionInstance[]>
	condition: FeedbackInstance[]
	events: TriggerEventInstance[]
}

export interface TriggerOptions {
	name: string
	enabled: boolean
	sortOrder: number
	relativeDelay: boolean
}

/**
 * Class for an interval trigger.
 *
 * @extends ControlBase
 * @author Håkon Nessjøen <haakon@bitfocus.io>
 * @author Keith Rocheck <keith.rocheck@gmail.com>
 * @author William Viker <william@bitfocus.io>
 * @author Julian Waller <me@julusian.co.uk>
 * @since 3.0.0
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
export default class ControlTrigger
	extends ControlBase<TriggerConfig>
	implements ControlBaseWithActions, ControlBaseWithFeedbacks<Record<string, never>>, ControlBaseWithEvents
{
	readonly type = 'trigger'

	/**
	 * The defaults options for a trigger
	 * @type {Object}
	 * @access public
	 * @static
	 */
	static DefaultOptions: TriggerOptions = {
		name: 'New Trigger',
		enabled: false,
		sortOrder: 0,
		relativeDelay: false,
	}

	/**
	 * Enabled condition_true events
	 * @type {Array}
	 * @access private
	 */
	#conditionCheckEvents = new Set<string>()

	/**
	 * Last value of the condition
	 * @type {boolean}
	 * @access private
	 */
	#conditionCheckLastValue = false

	/**
	 * Shared event bus, across all triggers
	 * @type {EventEmitter}
	 * @access private
	 */
	#eventBus: TriggerEvents

	/**
	 * The last time the trigger was executed
	 * @type {number}
	 * @access private
	 */
	#lastExecuted: number | undefined = undefined

	/**
	 * The last sent trigger json object
	 * @access private
	 */
	#lastSentTriggerJson: TriggerInfo | null = null

	/**
	 * The events for this trigger
	 * @access public
	 */
	events: TriggerEventInstance[] = []

	/**
	 * Miscellaneous trigger events helper
	 * @type {TriggersEventMisc}
	 * @access private
	 */
	#miscEvents: TriggersEventMisc

	/**
	 * Basic trigger configuration
	 * @access public
	 */
	options: TriggerOptions

	/**
	 * Timer based trigger events helper
	 * @type {TriggersEventTimer}
	 * @access private
	 */
	#timerEvents: TriggersEventTimer

	/**
	 * Variables based trigger events helper
	 * @type {TriggersEventVariables}
	 * @access private
	 */
	#variablesEvents: TriggersEventVariables

	actions: FragmentActions
	feedbacks: FragmentFeedbacks<Record<string, never>>

	/**
	 * @param {Registry} registry - the application core
	 * @param {string} controlId - id of the control
	 * @param {object} storage - persisted storage object
	 * @param {boolean} isImport - if this is importing a button, not creating at startup
	 */
	constructor(
		registry: Registry,
		eventBus: TriggerEvents,
		controlId: string,
		storage: TriggerConfig | null,
		isImport: boolean
	) {
		super(registry, controlId, 'trigger', 'Controls/ControlTypes/Triggers')

		this.actions = new FragmentActions(
			registry,
			controlId,
			this.commitChange.bind(this),
			this.checkButtonStatus.bind(this)
		)
		this.feedbacks = new FragmentFeedbacks(
			registry,
			controlId,
			this.commitChange.bind(this),
			this.triggerRedraw.bind(this),
			true
		)

		this.#eventBus = eventBus
		this.#timerEvents = new TriggersEventTimer(registry, eventBus, controlId, this.executeActions.bind(this))
		this.#miscEvents = new TriggersEventMisc(registry, eventBus, controlId, this.executeActions.bind(this))
		this.#variablesEvents = new TriggersEventVariables(registry, eventBus, controlId, this.executeActions.bind(this))

		this.options = cloneDeep(ControlTrigger.DefaultOptions)
		this.actions.action_sets = {
			0: [],
		}
		this.feedbacks.feedbacks = []
		this.events = []

		if (!storage) {
			// New control

			// Save the change
			this.commitChange()

			// Notify interested
		} else {
			if (storage.type !== 'trigger') throw new Error(`Invalid type given to ControlTriggerInterval: "${storage.type}"`)

			this.options = storage.options || this.options
			this.actions.action_sets = storage.action_sets || this.actions.action_sets
			this.feedbacks.feedbacks = storage.condition || this.feedbacks.feedbacks
			this.events = storage.events || this.events

			if (isImport) this.commitChange()
		}

		this.#setupEvents()
	}

	/**
	 * Add an action to this control
	 * @param {string} stepId
	 * @param {string} setId
	 * @param {object} actionItem
	 * @returns {boolean} success
	 * @access public
	 */
	actionAdd(_stepId: string, _setId: string, actionItem: ActionInstance) {
		return this.actions.actionAdd('0', actionItem)
	}

	/**
	 * Append some actions to this button
	 * @param {string} stepId
	 * @param {string} setId the action_set id to update
	 * @param {Array} newActions actions to append
	 * @access public
	 */
	actionAppend(_stepId: string, _setId: string, newActions: ActionInstance[]) {
		return this.actions.actionAppend('0', newActions)
	}

	/**
	 * Learn the options for an action, by asking the instance for the current values
	 * @param {string} stepId
	 * @param {string} setId the id of the action set
	 * @param {string} id the id of the action
	 * @returns {boolean} success
	 * @access public
	 */
	async actionLearn(_stepId: string, _setId: string, id: string): Promise<boolean> {
		return this.actions.actionLearn('0', id)
	}

	/**
	 * Enable or disable an action
	 * @param {string} stepId
	 * @param {string} setId
	 * @param {string} id
	 * @param {boolean} enabled
	 * @access public
	 */
	actionEnabled(_stepId: string, _setId: string, id: string, enabled: boolean): boolean {
		return this.actions.actionEnabled('0', id, enabled)
	}

	/**
	 * Remove an action from this control
	 * @param {string} stepId
	 * @param {string} setId the id of the action set
	 * @param {string} id the id of the action
	 * @returns {boolean} success
	 * @access public
	 */
	actionRemove(_stepId: string, _setId: string, id: string) {
		return this.actions.actionRemove('0', id)
	}

	/**
	 * Duplicate an action on this control
	 * @param {string} stepId
	 * @param {string} setId
	 * @param {string} id
	 * @returns {boolean} success
	 * @access public
	 */
	actionDuplicate(_stepId: string, _setId: string, id: string) {
		return this.actions.actionDuplicate('0', id)
	}

	/**
	 * Replace all the actions in a set
	 * @param {string} stepId
	 * @param {string} setId the action_set id to update
	 * @param {Array} newActions actions to populate
	 * @access public
	 */
	actionReplaceAll(_stepId: string, _setId: string, newActions: ActionInstance[]) {
		return this.actions.actionReplaceAll('0', newActions)
	}

	/**
	 * Set the delay of an action
	 * @param {string} stepId
	 * @param {string} setId the action_set id
	 * @param {string} id the action id
	 * @param {number} delay the desired delay
	 * @returns {boolean} success
	 * @access public
	 */
	actionSetDelay(_stepId: string, _setId: string, id: string, delay: number) {
		return this.actions.actionSetDelay('0', id, delay)
	}

	/**
	 * Set an opton of an action
	 * @param {string} stepId
	 * @param {string} setId the action_set id
	 * @param {string} id the action id
	 * @param {string} key the desired option to set
	 * @param {any} value the new value of the option
	 * @returns {boolean} success
	 * @access public
	 */
	actionSetOption(_stepId: string, _setId: string, id: string, key: string, value: any) {
		return this.actions.actionSetOption('0', id, key, value)
	}

	/**
	 * Reorder an action in the list or move between sets
	 * @param {string} dragStepId
	 * @param {string} dragSetId the action_set id to remove from
	 * @param {number} dragIndex the index of the action to move
	 * @param {string} dropStepId
	 * @param {string} dropSetId the target action_set of the action
	 * @param {number} dropIndex the target index of the action
	 * @returns {boolean} success
	 * @access public
	 */
	actionReorder(
		_dragStepId: string,
		_dragSetId: string,
		dragIndex: number,
		_dropStepId: string,
		_dropSetId: string,
		dropIndex: number
	): boolean {
		const set = this.actions.action_sets['0']
		if (set) {
			dragIndex = clamp(dragIndex, 0, set.length)
			dropIndex = clamp(dropIndex, 0, set.length)

			set.splice(dropIndex, 0, ...set.splice(dragIndex, 1))

			this.commitChange()

			return true
		}

		return false
	}

	checkButtonStatus(): void {
		// Ignore
	}

	executeActions(nowTime: number, isTest?: boolean): void {
		if (isTest) {
			this.logger.debug(`Test Execute ${this.options.name}`)
		} else {
			if (!this.options.enabled) return

			// Ensure the condition passes
			const conditionPasses = this.feedbacks.checkValueAsBoolean()
			if (!conditionPasses) return

			this.logger.debug(`Execute ${this.options.name}`)

			this.#lastExecuted = nowTime
			this.#sendTriggerJsonChange()
		}

		const actions = this.actions.action_sets['0']
		if (actions) {
			this.logger.silly('found actions')

			this.controls.actions.runMultipleActions(actions, this.controlId, this.options.relativeDelay, {
				deviceid: this.controlId,
			})
		}
	}

	/**
	 * Get all the actions on this control
	 */
	getAllActions(): ActionInstance[] {
		const actions: ActionInstance[] = []

		for (const set of Object.values(this.actions.action_sets)) {
			actions.push(...set)
		}

		return actions
	}

	/**
	 * Convert this control to JSON
	 * To be sent to the client and written to the db
	 * @param {boolean} clone - Whether to return a cloned object
	 * @access public
	 */
	toJSON(clone = true): TriggerConfig {
		const obj: TriggerConfig = {
			type: this.type,
			options: this.options,
			action_sets: this.actions.action_sets,
			condition: this.feedbacks.feedbacks,
			events: this.events,
		}
		return clone ? cloneDeep(obj) : obj
	}

	toTriggerJSON(): TriggerInfo {
		const eventStrings: string[] = []
		for (const event of this.events) {
			if (event.enabled) {
				switch (event.type) {
					case 'interval':
						eventStrings.push(this.#timerEvents.getIntervalDescription(event))
						break
					case 'timeofday':
						eventStrings.push(this.#timerEvents.getTimeOfDayDescription(event))
						break
					case 'startup':
						eventStrings.push('Startup')
						break
					case 'client_connect':
						eventStrings.push('Web client connect')
						break
					case 'button_press':
						eventStrings.push('On any button press')
						break
					case 'button_depress':
						eventStrings.push('On any button depress')
						break
					case 'condition_true':
						eventStrings.push('On condition becoming true')
						break
					case 'variable_changed':
						eventStrings.push(this.#variablesEvents.getVariablesChangedDescription(event))
						break
					default:
						eventStrings.push('Unknown event')
						break
				}
			}
		}

		return {
			type: this.type,
			...this.options,
			lastExecuted: this.#lastExecuted,
			description: eventStrings.join('<br />'),
		}
	}

	/**
	 * Remove any actions and feedbacks referencing a specified instanceId
	 * @param {string} instanceId
	 * @access public
	 */
	forgetInstance(instanceId: string): void {
		const changedFeedbacks = this.feedbacks.forgetInstance(instanceId)
		const changedActions = this.actions.forgetInstance(instanceId)

		if (changedFeedbacks || changedActions) {
			this.commitChange()
		}
	}

	/**
	 * Start or stop the trigger from running
	 */
	#setupEvents(): void {
		this.#timerEvents.setEnabled(this.options.enabled)
		this.#miscEvents.setEnabled(this.options.enabled)
		this.#variablesEvents.setEnabled(this.options.enabled)
		this.#eventBus.emit('trigger_enabled', this.controlId, this.options.enabled)

		// Event runner cleanup
		for (const event of this.events) {
			this.#restartEvent(event)
		}
	}

	#restartEvent(event: TriggerEventInstance): void {
		if (event.enabled) {
			switch (event.type) {
				case 'interval':
					this.#timerEvents.setInterval(event.id, event.options.seconds)
					break
				case 'timeofday':
					this.#timerEvents.setTimeOfDay(event.id, event.options)
					break
				case 'startup':
					this.#miscEvents.setStartup(event.id, event.options.delay)
					break
				case 'client_connect':
					this.#miscEvents.setClientConnect(event.id, event.options.delay)
					break
				case 'button_press':
					this.#miscEvents.setControlPress(event.id, true)
					break
				case 'button_depress':
					this.#miscEvents.setControlPress(event.id, false)
					break
				case 'condition_true':
					this.#conditionCheckEvents.add(event.id)
					this.triggerRedraw() // Recheck the condition
					break
				case 'variable_changed':
					this.#variablesEvents.setVariableChanged(event.id, event.options.variableId)
					break
				default:
					this.logger.warn(`restartEvent called for unknown type: ${event.type}`)
					break
			}
		} else {
			this.#stopEvent(event)
		}
	}
	#stopEvent(event: TriggerEventInstance): void {
		switch (event.type) {
			case 'interval':
				this.#timerEvents.clearInterval(event.id)
				break
			case 'timeofday':
				this.#timerEvents.clearTimeOfDay(event.id)
				break
			case 'startup':
				this.#miscEvents.clearStartup(event.id)
				break
			case 'client_connect':
				this.#miscEvents.clearClientConnect(event.id)
				break
			case 'button_press':
			case 'button_depress':
				this.#miscEvents.clearControlPress(event.id)
				break
			case 'condition_true':
				this.#conditionCheckEvents.delete(event.id)
				break
			case 'variable_changed':
				this.#variablesEvents.clearVariableChanged(event.id)
				break
			default:
				this.logger.warn(`stopEvent called for unknown type: ${event.type}`)
				break
		}
	}

	/**
	 * Update an option field of this control
	 * @access public
	 */
	optionsSetField<K extends keyof TriggerOptions>(key: K, value: TriggerOptions[K], forceSet = false): boolean {
		if (!forceSet && key === 'sortOrder') throw new Error('sortOrder cannot be set by the client')

		this.options[key] = value

		if (key === 'enabled') {
			this.#timerEvents.setEnabled(this.options.enabled)
			this.#miscEvents.setEnabled(this.options.enabled)
			this.#variablesEvents.setEnabled(this.options.enabled)
			this.#eventBus.emit('trigger_enabled', this.controlId, this.options.enabled)
		}

		this.commitChange()

		return true
	}

	/**
	 * If this control was imported to a running system, do some data cleanup/validation
	 * @access protected
	 */
	postProcessImport() {
		const ps = []

		ps.push(this.feedbacks.postProcessImport())
		ps.push(this.actions.postProcessImport())

		Promise.all(ps).catch((e) => {
			this.logger.silly(`postProcessImport for ${this.controlId} failed: ${e.message}`)
		})

		this.commitChange()
		this.sendRuntimePropsChange()
	}

	/**
	 * Prune all actions/feedbacks referencing unknown instances
	 * Doesn't do any cleanup, as it is assumed that the instance has not been running
	 * @param {Set<string>} knownInstanceIds
	 * @access public
	 */
	verifyInstanceIds(knownInstanceIds: Set<string>): void {
		const changedActions = this.actions.verifyInstanceIds(knownInstanceIds)
		const changedFeedbacks = this.feedbacks.verifyInstanceIds(knownInstanceIds)

		if (changedFeedbacks || changedActions) {
			this.commitChange()
		}
	}

	/**
	 * Emit a change to the trigger properties of this control.
	 * This is for any properties that the ui may want about this control which are not persisted in toJSON()
	 * This is done via this.toTriggerJSON()
	 * @access protected
	 */
	#sendTriggerJsonChange(): void {
		const newJson = cloneDeep(this.toTriggerJSON())

		if (this.io.countRoomMembers(TriggersListRoom) > 0) {
			const patch = jsonPatch.compare(this.#lastSentTriggerJson || {}, newJson || {})
			if (patch.length > 0) {
				this.io.emitToRoom(TriggersListRoom, `triggers:update`, this.controlId, patch)
			}
		}

		this.#lastSentTriggerJson = newJson
	}

	commitChange(): void {
		super.commitChange()

		this.#sendTriggerJsonChange()
	}

	destroy(): void {
		this.#timerEvents.destroy()
		this.#miscEvents.destroy()
		this.#variablesEvents.destroy()

		this.#eventBus.emit('trigger_enabled', this.controlId, false)

		this.actions.destroy()
		this.feedbacks.destroy()

		super.destroy()

		this.io.emitToRoom(TriggersListRoom, `triggers:update`, this.controlId, null)
	}

	/**
	 * Trigger a recheck of the condition, as something has changed and it might be the 'condition'
	 * @access protected
	 */
	triggerRedraw = debounceFn(
		(): void => {
			try {
				const newStatus = this.feedbacks.checkValueAsBoolean()
				if (
					this.options.enabled &&
					this.#conditionCheckEvents.size > 0 &&
					!this.#conditionCheckLastValue &&
					newStatus
				) {
					setImmediate(() => {
						this.executeActions(Date.now(), false)
					})
				}
				this.#conditionCheckLastValue = newStatus
			} catch (e) {
				this.logger.warn(`Failed to recheck condition: ${e}`)
			}
		},
		{
			before: true,
			after: true,
			wait: 10,
			maxWait: 20,
		}
	)

	// Events

	/**
	 * Add an event to this control
	 * @param {object} eventItem the item to add
	 * @returns {boolean} success
	 * @access public
	 */
	eventAdd(eventItem: TriggerEventInstance): boolean {
		this.events.push(eventItem)

		// Inform relevant module
		this.#restartEvent(eventItem)

		this.commitChange()

		return true
	}

	/**
	 * Duplicate an event on this control
	 * @param {string} id
	 * @returns {boolean} success
	 * @access public
	 */
	eventDuplicate(id: string): boolean {
		const index = this.events.findIndex((fb) => fb.id === id)
		if (index !== -1) {
			const eventItem = cloneDeep(this.events[index])
			eventItem.id = nanoid()

			this.events.splice(index + 1, 0, eventItem)

			this.#restartEvent(eventItem)

			this.commitChange()

			return true
		}

		return false
	}

	eventEnabled(id: string, enabled: boolean): boolean {
		for (const event of this.events) {
			if (event && event.id === id) {
				event.enabled = !!enabled

				// Restart event
				this.#restartEvent(event)

				this.commitChange()

				return true
			}
		}

		return false
	}

	/**
	 * Remove an event from this control
	 * @param {string} id the id of the event
	 * @returns {boolean} success
	 * @access public
	 */
	eventRemove(id: string): boolean {
		const index = this.events.findIndex((ev) => ev.id === id)
		if (index !== -1) {
			const event = this.events[index]
			this.events.splice(index, 1)

			this.#stopEvent(event)

			this.commitChange()

			return true
		} else {
			return false
		}
	}

	/**
	 * Reorder an event in the list
	 * @param {number} oldIndex the index of the event to move
	 * @param {number} newIndex the target index of the event
	 * @returns {boolean} success
	 * @access public
	 */
	eventReorder(oldIndex: number, newIndex: number): void {
		oldIndex = clamp(oldIndex, 0, this.events.length)
		newIndex = clamp(newIndex, 0, this.events.length)
		this.events.splice(newIndex, 0, ...this.events.splice(oldIndex, 1))

		this.commitChange()
	}

	/**
	 * Update an option for an event
	 * @param {string} id the id of the event
	 * @param {string} key the key/name of the property
	 * @param {any} value the new value
	 * @returns {boolean} success
	 * @access public
	 */
	eventSetOptions(id: string, key: string, value: any): boolean {
		for (const event of this.events) {
			if (event && event.id === id) {
				if (!event.options) event.options = {}

				event.options[key] = value

				// Restart event
				this.#restartEvent(event)

				this.commitChange()

				return true
			}
		}

		return false
	}
}
