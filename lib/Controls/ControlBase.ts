import { cloneDeep } from 'lodash-es'
import CoreBase from '../Core/Base.js'
import jsonPatch from 'fast-json-patch'
import debounceFn from 'debounce-fn'
import { ActionInstance, Registry, SomeDrawStyle, TriggerEventInstance } from '../tmp.js'
import { Size } from '../Resources/Util.js'
import FragmentFeedbacks from './Fragments/FragmentFeedbacks.js'

export function ControlConfigRoom(controlId: string): string {
	return `controls:${controlId}`
}

export interface ControlBaseWithFeedbacks<TStyle> {
	feedbacks: FragmentFeedbacks<TStyle>

	/**
	 * Update the style fields of this control
	 * @param {object} diff - config diff to apply
	 * @returns {boolean} true if any changes were made
	 * @access public
	 */
	styleSetFields(diff: Partial<TStyle>): boolean

	renameVariables(labelFrom: string, labelTo: string): void
}

export interface ControlBaseWithEvents {
	/**
	 * Add an event to this control
	 * @param {object} eventItem the item to add
	 * @returns {boolean} success
	 * @access public
	 */
	eventAdd(eventItem: TriggerEventInstance): boolean

	/**
	 * Duplicate an event on this control
	 * @param {string} id
	 * @returns {boolean} success
	 * @access public
	 */
	eventDuplicate(id: string): boolean

	eventEnabled(id: string, enabled: boolean): boolean

	/**
	 * Remove an event from this control
	 * @param {string} id the id of the event
	 * @returns {boolean} success
	 * @access public
	 */
	eventRemove(id: string): boolean

	/**
	 * Reorder an event in the list
	 * @param {number} oldIndex the index of the event to move
	 * @param {number} newIndex the target index of the event
	 * @returns {boolean} success
	 * @access public
	 */
	eventReorder(oldIndex: number, newIndex: number): void

	/**
	 * Update an option for an event
	 * @param {string} id the id of the event
	 * @param {string} key the key/name of the property
	 * @param {any} value the new value
	 * @returns {boolean} success
	 * @access public
	 */
	eventSetOptions(id: string, key: string, value: any): boolean
}

export interface ControlBaseWithSteps {
	/**
	 * Get the index of the current (next to execute) step
	 * @returns {number} The index of current step
	 * @access public
	 */
	getActiveStepIndex(): number | undefined

	/**
	 * Add a step to this control
	 * @returns {boolean} success
	 * @access public
	 */
	stepAdd(): string

	/**
	 * Progress through the action-sets
	 * @param {number} amount Number of steps to progress
	 * @returns {boolean} success
	 * @access public
	 */
	stepAdvanceDelta(amount: number): boolean

	/**
	 * Set the current (next to execute) action-set by index
	 * @param {number} index The step index to make the next
	 * @returns {boolean} success
	 * @access public
	 */
	stepMakeCurrent(index: number): boolean

	/**
	 * Remove an action-set from this control
	 * @param {string} stepId the id of the action-set
	 * @returns {boolean} success
	 * @access public
	 */
	stepRemove(stepId: string): boolean

	/**
	 * Set the current (next to execute) action-set by id
	 * @param {string} stepId The step id to make the next
	 * @returns {boolean} success
	 * @access public
	 */
	stepSelectNext(stepId: string): boolean

	/**
	 * Swap two action-sets
	 * @param {string} stepId1 One of the action-sets
	 * @param {string} stepId2 The other action-set
	 * @returns {boolean} success
	 * @access public
	 */
	stepSwap(stepId1: string, stepId2: string): boolean

	// TODO
	pushed: boolean
	setPushed(direction: boolean, deviceId: string | undefined): boolean

	setActionsRunning(running: boolean, skip_up: boolean): void
}
export interface ControlBaseWithDynamicActionSets {
	/**
	 * Add an action set to this control
	 * @returns {boolean} success
	 * @access public
	 */
	actionSetAdd(stepId: string): boolean

	/**
	 * Remove an action-set from this control
	 * @param {string} setId the id of the action-set
	 * @returns {boolean} success
	 * @access public
	 */
	actionSetRemove(stepId: string, setId: string): boolean

	/**
	 * Rename an action-sets
	 * @param {string} oldSetId The old id of the set
	 * @param {string} newSetId The new id for the set
	 * @returns {boolean} success
	 * @access public
	 */
	actionSetRename(stepId: string, oldSetId0: string, newSetId0: string): boolean

	actionSetRunWhileHeld(stepId: string, setId0: string, runWhileHeld: boolean): boolean
}

export interface ControlBaseWithActions {
	/**
	 * Add an action to this control
	 * @param {string} stepId
	 * @param {string} setId
	 * @param {object} actionItem
	 * @returns {boolean} success
	 * @access public
	 */
	actionAdd(stepId: string, setId: string, actionItem: ActionInstance): boolean

	// /**
	//  * Append some actions to this button
	//  * @param {string} stepId
	//  * @param {string} setId the action_set id to update
	//  * @param {Array} newActions actions to append
	//  * @access public
	//  */
	// actionAppend(stepId: string, setId: string, newActions: ActionInstance[]): boolean

	/**
	 * Duplicate an action on this control
	 * @param {string} stepId
	 * @param {string} setId
	 * @param {string} id
	 * @returns {boolean} success
	 * @access public
	 */
	actionDuplicate(stepId: string, setId: string, id: string): boolean

	/**
	 * Enable or disable an action
	 * @param {string} stepId
	 * @param {string} setId
	 * @param {string} id
	 * @param {boolean} enabled
	 * @access public
	 */
	actionEnabled(stepId: string, setId: string, id: string, enabled: boolean): boolean

	/**
	 * Learn the options for an action, by asking the instance for the current values
	 * @param {string} stepId
	 * @param {string} setId the id of the action set
	 * @param {string} id the id of the action
	 * @returns {boolean} success
	 * @access public
	 */
	actionLearn(stepId: string, setId: string, id: string): Promise<boolean>

	/**
	 * Remove an action from this control
	 * @param {string} stepId
	 * @param {string} setId the id of the action set
	 * @param {string} id the id of the action
	 * @returns {boolean} success
	 * @access public
	 */
	actionRemove(stepId: string, setId: string, id: string): boolean

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
		dragStepId: string,
		dragSetId: string,
		dragIndex: number,
		dropStepId: string,
		dropSetId: string,
		dropIndex: number
	): boolean

	/**
	 * Remove an action from this control
	 * @param {object} newProps
	 * @access public
	 */
	actionReplace(newProps: Pick<ActionInstance, 'id' | 'action' | 'options'>): void

	// /**
	//  * Replace all the actions in a set
	//  * @param {string} stepId
	//  * @param {string} setId the action_set id to update
	//  * @param {Array} newActions actions to populate
	//  * @access public
	//  */
	// actionReplaceAll(stepId: string, setId: string, newActions: ActionInstance[]): boolean

	/**
	 * Set the delay of an action
	 * @param {string} stepId
	 * @param {string} setId the action_set id
	 * @param {string} id the action id
	 * @param {number} delay the desired delay
	 * @returns {boolean} success
	 * @access public
	 */
	actionSetDelay(stepId: string, setId: string, id: string, delay: number): boolean

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
	actionSetOption(stepId: string, setId: string, id: string, key: string, value: any): boolean

	/**
	 * Check the status of a bank, and re-draw if needed
	 * @param {boolean} redraw whether to perform a draw
	 * @returns {boolean} whether the status changed
	 * @access public
	 */
	checkButtonStatus(redraw?: boolean): boolean
}

/**
 * Abstract class for a control.
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
export default abstract class ControlBase<TConfigJson, TRuntimeJson = Record<string, never>> extends CoreBase {
	public readonly controlId: string

	public abstract type: string

	/**
	 * The last sent config json object
	 * @access private
	 */
	#lastSentConfigJson: TConfigJson | null = null
	/**
	 * The last sent runtime json object
	 * @access private
	 */
	#lastSentRuntimeJson: TRuntimeJson | null = null

	/**
	 * @param {Registry} registry - the application core
	 * @param {string} controlId - id of the control
	 * @param {string} logSource
	 * @param {string} debugNamespace
	 */
	constructor(registry: Registry, controlId: string, logSource: string, debugNamespace: string) {
		super(registry, logSource, debugNamespace)

		this.controlId = controlId
	}

	/**
	 * Post-process a change to this control
	 * This includes, redrawing, writing to the db and informing any interested clients
	 * @param {boolean} redraw - whether to redraw the control
	 * @access protected
	 */
	commitChange(redraw = true): void {
		// Trigger redraw
		if (redraw) this.triggerRedraw()

		const newJson = this.toJSON(true)

		// Save to db
		this.db.setKey(['controls', this.controlId], newJson)

		// Now broadcast to any interested clients
		const roomName = ControlConfigRoom(this.controlId)

		if (this.io.countRoomMembers(roomName) > 0) {
			const patch = jsonPatch.compare(this.#lastSentConfigJson || {}, newJson || {})
			if (patch.length > 0) {
				this.io.emitToRoom(roomName, `controls:config-${this.controlId}`, patch)
			}
		}

		this.#lastSentConfigJson = newJson
	}

	/**
	 * Prepare this control for deletion, this should be extended by controls.
	 * Immediately after this is called, it will be removed from the store, and assumed to be fully deleted
	 * @access public
	 */
	destroy() {
		// Inform clients
		const roomName = ControlConfigRoom(this.controlId)
		this.io.emitToRoom(roomName, `controls:config-${this.controlId}`, false)
		this.io.emitToRoom(roomName, `controls:runtime-${this.controlId}`, false)
	}

	/**
	 * Get all the actions on this control
	 */
	getAllActions(): ActionInstance[] {
		throw new Error('must be implemented by subclass!')
	}

	/**
	 * Get the size of the bitmap render of this control
	 * @access public
	 * @abstract
	 */
	getBitmapSize(): Size | null {
		return null
	}

	/**
	 * Emit a change to the runtime properties of this control.
	 * This is for any properties that the ui may want about this control which are not persisted in toJSON()
	 * This is done via this.toRuntimeJSON()
	 * @access protected
	 */
	sendRuntimePropsChange() {
		const newJson = cloneDeep(this.toRuntimeJSON())

		// Now broadcast to any interested clients
		const roomName = ControlConfigRoom(this.controlId)

		if (this.io.countRoomMembers(roomName) > 0) {
			const patch = jsonPatch.compare(this.#lastSentRuntimeJson || {}, newJson || {})
			if (patch.length > 0) {
				this.io.emitToRoom(roomName, `controls:runtime-${this.controlId}`, patch)
			}
		}

		this.#lastSentRuntimeJson = newJson
	}

	/**
	 * Convert this control to JSON
	 * To be sent to the client and written to the db
	 * @param {boolean} clone - Whether to return a cloned object
	 * @access public
	 * @abstract
	 */
	toJSON(clone = true): TConfigJson {
		throw new Error('must be implemented by subclass!')
	}

	/**
	 * Get any volatile properties for the control
	 * Not all controls have additional data
	 * @access public
	 */
	toRuntimeJSON(): TRuntimeJson {
		return {} as TRuntimeJson
	}

	/**
	 * Trigger a redraw of this control, if it can be drawn
	 * @access protected
	 */
	triggerRedraw = debounceFn(
		() => {
			setImmediate(() => {
				this.graphics.invalidateControl(this.controlId)
			})
		},
		{
			before: true,
			after: true,
			wait: 10,
			maxWait: 20,
		}
	)

	abstract forgetInstance(instanceId: string): void

	getDrawStyle?(): SomeDrawStyle

	verifyInstanceIds?(knownInstanceIds: Set<string>): void
}
