import { cloneDeep } from 'lodash-es'
import CoreBase from '../Core/Base.js'
import jsonPatch from 'fast-json-patch'
import debounceFn from 'debounce-fn'
import { Registry } from '../tmp.js'
import { Size } from '../Resources/Util.js'

export function ControlConfigRoom(controlId: string): string {
	return `controls:${controlId}`
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
	getAllActions() {
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
}
