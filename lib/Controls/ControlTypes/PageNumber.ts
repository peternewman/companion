import { ActionInstance, Registry, SomeDrawStyle } from '../../tmp.js'
import ControlBase from '../ControlBase.js'

interface PageNumberConfig {
	type: 'pagenum'
}

/**
 * Class for a pagenum button control.
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
export default class ControlButtonPageNumber extends ControlBase<PageNumberConfig> {
	readonly type = 'pagenum'

	/**
	 * @param {Registry} registry - the application core
	 * @param {string} controlId - id of the control
	 * @param {object} storage - persisted storage object
	 * @param {boolean} isImport - if this is importing a button, not creating at startup
	 */
	constructor(registry: Registry, controlId: string, storage: PageNumberConfig, isImport: boolean) {
		super(registry, controlId, 'page-button', 'Controls/Button/PageNumber')

		if (!storage) {
			// New control

			// Save the change
			this.commitChange()

			// Notify interested
		} else {
			if (storage.type !== 'pagenum')
				throw new Error(`Invalid type given to ControlButtonPageNumber: "${storage.type}"`)

			if (isImport) this.commitChange()
		}
	}

	/**
	 * Get all the actions on this control
	 */
	getAllActions(): ActionInstance[] {
		return []
	}

	/**
	 * Get the complete style object of a button
	 * @returns the processed style of the button
	 * @access public
	 */
	getDrawStyle(): SomeDrawStyle {
		return {
			style: 'pagenum',
		}
	}

	/**
	 * Execute a press of this control
	 * @param {boolean} pressed Whether the control is pressed
	 * @param {string | undefined} deviceId The surface that intiated this press
	 * @access public
	 */
	pressControl(pressed: boolean, deviceId: string | undefined): void {
		if (pressed && deviceId) {
			this.surfaces.devicePageSet(deviceId, 1)
		}
	}

	/**
	 * Convert this control to JSON
	 * To be sent to the client and written to the db
	 * @param {boolean} clone - Whether to return a cloned object
	 * @access public
	 */
	toJSON(_clone = true): PageNumberConfig {
		return {
			type: this.type,
		}
	}

	forgetInstance(): void {
		// Nothing to do
	}
}
