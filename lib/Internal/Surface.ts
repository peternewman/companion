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

import { CompanionOptionValues, combineRgb } from '@companion-module/base'
import { InternalCallbackInfo, InternalFeedbackInstance, InternalFragment } from './FragmantBase.js'
import type { ActionInstance, Registry, RunActionExtras, VariableDefinition } from '../tmp.js'
import { ActionDefinition, FeedbackDefinition } from '../Instance/Definitions.js'
import {
	SomeUIInputField,
	UIInputFieldCheckbox,
	UIInputFieldInternalPage,
	UIInputFieldInternalSurfaceSerial,
	UIInputFieldNumber,
	UIInputFieldTextInput,
	serializeIsVisibleFn,
} from '../Shared/InputFields.js'

const CHOICES_CONTROLLER: UIInputFieldInternalSurfaceSerial = {
	type: 'internal:surface_serial',
	label: 'Surface / controller',
	id: 'controller',
	default: 'self',
	includeSelf: true,
}

const CHOICES_CONTROLLER_WITH_VARIABLES: SomeUIInputField[] = [
	{
		type: 'checkbox',
		label: 'Use variables for surface',
		id: 'controller_from_variable',
		default: false,
	} satisfies UIInputFieldCheckbox,
	{
		...CHOICES_CONTROLLER,
		isVisibleFn: serializeIsVisibleFn((options) => !options.controller_from_variable),
	},
	{
		type: 'textinput',
		label: 'Surface / controller',
		id: 'controller_variable',
		default: 'self',
		isVisibleFn: serializeIsVisibleFn((options) => !!options.controller_from_variable),
		useVariables: true,
	} satisfies UIInputFieldTextInput,
]

const CHOICES_PAGE_WITH_VARIABLES: SomeUIInputField[] = [
	{
		type: 'checkbox',
		label: 'Use variables for page',
		id: 'page_from_variable',
		default: false,
	} satisfies UIInputFieldCheckbox,
	{
		type: 'internal:page',
		label: 'Page',
		id: 'page',
		includeDirection: true,
		default: 0,
		isVisibleFn: serializeIsVisibleFn((options: CompanionOptionValues) => !options.page_from_variable),
	} satisfies UIInputFieldInternalPage,
	{
		type: 'textinput',
		label: 'Page (expression)',
		id: 'page_variable',
		default: '1',
		isVisibleFn: serializeIsVisibleFn((options) => !!options.page_from_variable),
		useVariables: true,
	} satisfies UIInputFieldTextInput,
]

export default class Surface extends InternalFragment {
	/** Page history for surfaces */
	#pageHistory = new Map()

	constructor(registry: Registry) {
		super(registry, 'internal', 'Internal/Surface')

		// this.internalModule = internalModule

		setImmediate(() => {
			this.internalModule.setVariables({
				't-bar': 0,
				jog: 0,
				shuttle: 0,
			})
		})

		this.surfaces.on('surface_page', () => {
			this.internalModule.checkFeedbacks('surface_on_page')
		})
	}

	#fetchControllerId(options: Record<string, any>, info: InternalCallbackInfo, useVariableFields: boolean) {
		let theController = options.controller

		if (useVariableFields && options.controller_from_variable) {
			theController = this.instance.variable.parseVariables(options.controller_variable).text
		}

		theController = theController.trim()

		if (info && theController === 'self') theController = info.deviceid

		return theController
	}

	#fetchPage(options: Record<string, any>, info: InternalCallbackInfo, useVariableFields: boolean) {
		let thePage = options.page

		if (useVariableFields && options.page_from_variable) {
			thePage = this.instance.variable.parseExpression(options.page_variable, 'number').value
		}

		if (info) {
			if (thePage === 0 || thePage === '0') thePage = info.page
		}

		return thePage
	}

	getVariableDefinitions(): VariableDefinition[] {
		return [
			{
				label: 'XKeys: T-bar position',
				name: 't-bar',
			},
			{
				label: 'XKeys: Shuttle position',
				name: 'shuttle',
			},
			{
				label: 'XKeys: Jog position',
				name: 'jog',
			},
		]
	}

	actionUpgrade(action: ActionInstance, _controlId: string): ActionInstance | undefined {
		// Upgrade an action. This check is not the safest, but it should be ok
		if (action.options.controller === 'emulator') {
			// Hope that the default emulator still exists
			action.options.controller = 'emulator:emulator'

			return action
		}
		return undefined
	}

	override getActionDefinitions(): Record<string, ActionDefinition> {
		return {
			set_brightness: {
				label: 'Set surface with serialnumber to brightness',
				options: [
					...CHOICES_CONTROLLER_WITH_VARIABLES,

					{
						type: 'number',
						label: 'Brightness',
						id: 'brightness',
						default: 100,
						min: 0,
						max: 100,
						step: 1,
						range: true,
					} satisfies UIInputFieldNumber,
				],
			},

			set_page: {
				label: 'Set surface with serialnumber to page',
				options: [...CHOICES_CONTROLLER_WITH_VARIABLES, ...CHOICES_PAGE_WITH_VARIABLES],
			},
			set_page_byindex: {
				label: 'Set surface with index to page',
				options: [
					{
						type: 'number',
						label: 'Surface / controller',
						id: 'controller',
						tooltip: 'Emulator is 0, all other controllers in order of type and serial-number',
						min: 0,
						max: 100,
						default: 0,
						range: false,
					},
					...CHOICES_PAGE_WITH_VARIABLES,
				],
			},

			inc_page: {
				label: 'Increment page number',
				options: [...CHOICES_CONTROLLER_WITH_VARIABLES],
			},
			dec_page: {
				label: 'Decrement page number',
				options: [...CHOICES_CONTROLLER_WITH_VARIABLES],
			},

			lockout_device: {
				label: 'Trigger a device to lockout immediately.',
				options: [...CHOICES_CONTROLLER_WITH_VARIABLES],
			},
			unlockout_device: {
				label: 'Trigger a device to unlock immediately.',
				options: [...CHOICES_CONTROLLER_WITH_VARIABLES],
			},

			lockout_all: {
				label: 'Trigger all devices to lockout immediately.',
				options: [],
			},
			unlockout_all: {
				label: 'Trigger all devices to unlock immediately.',
				options: [],
			},

			rescan: {
				label: 'Rescan USB for devices',
				options: [],
			},
		}
	}

	override executeAction(action: ActionInstance, extras: RunActionExtras): boolean | undefined {
		if (action.action === 'set_brightness') {
			const theController = this.#fetchControllerId(action.options, extras, true)

			this.surfaces.setDeviceBrightness(theController, action.options.brightness, true)
			return true
		} else if (action.action === 'set_page') {
			const theController = this.#fetchControllerId(action.options, extras, true)
			const thePage = this.#fetchPage(action.options, extras, true)

			this.#changeSurfacePage(theController, thePage)
			return true
		} else if (action.action === 'set_page_byindex') {
			const thePage = this.#fetchPage(action.options, extras, true)

			const deviceId = this.surfaces.getDeviceIdFromIndex(action.options.controller)
			if (deviceId !== undefined) {
				this.#changeSurfacePage(deviceId, thePage)
			} else {
				this.logger.warn(`Trying to set controller #${action.options.controller} but it isn't available.`)
			}
			return true
		} else if (action.action === 'inc_page') {
			const theController = this.#fetchControllerId(action.options, extras, true)

			this.#changeSurfacePage(theController, '+1')
			return true
		} else if (action.action === 'dec_page') {
			const theController = this.#fetchControllerId(action.options, extras, true)

			this.#changeSurfacePage(theController, '-1')
			return true
		} else if (action.action === 'lockout_device') {
			if (this.userconfig.getKey('pin_enable')) {
				const theController = this.#fetchControllerId(action.options, extras, true)
				if (extras.controlId && extras.deviceid == theController) {
					const control = this.controls.getControl(extras.controlId)
					if (control && typeof control.setPushed === 'function') {
						// Make sure the button doesn't show as pressed
						control.setPushed(false, extras.deviceid)
					}
				}

				setImmediate(() => {
					if (this.userconfig.getKey('link_lockouts')) {
						this.surfaces.setAllLocked(true)
					} else {
						this.surfaces.setDeviceLocked(theController, true, true)
					}
				})
			}
			return true
		} else if (action.action === 'unlockout_device') {
			if (this.userconfig.getKey('pin_enable')) {
				const theController = this.#fetchControllerId(action.options, extras, true)

				setImmediate(() => {
					if (this.userconfig.getKey('link_lockouts')) {
						this.surfaces.setAllLocked(false)
					} else {
						this.surfaces.setDeviceLocked(theController, false, true)
					}
				})
			}
			return true
		} else if (action.action === 'lockout_all') {
			if (this.userconfig.getKey('pin_enable')) {
				if (extras.controlId) {
					const control = this.controls.getControl(extras.controlId)
					if (control && typeof control.setPushed === 'function') {
						// Make sure the button doesn't show as pressed
						control.setPushed(false, extras.deviceid)
					}
				}

				setImmediate(() => {
					this.surfaces.setAllLocked(true)
				})
			}
			return true
		} else if (action.action === 'unlockout_all') {
			if (this.userconfig.getKey('pin_enable')) {
				setImmediate(() => {
					this.surfaces.setAllLocked(false)
				})
			}
			return true
		} else if (action.action === 'rescan') {
			this.surfaces.triggerRefreshDevices().catch(() => {
				// TODO
			})
			return true
		}
		return undefined
	}

	#changeSurfacePage(surfaceId: string, toPage: number | 'back' | 'forward' | '+1' | '-1') {
		const currentPage = this.surfaces.devicePageGet(surfaceId, true)
		if (currentPage === undefined) {
			// Bad surfaceId
		} else {
			// no history yet
			// start with the current (from) page
			let pageHistory = this.#pageHistory.get(surfaceId)
			if (!pageHistory) {
				pageHistory = {
					history: [currentPage],
					index: 0,
				}
				this.#pageHistory.set(surfaceId, pageHistory)
			}

			if (toPage === 'back' || toPage === 'forward') {
				// determine the 'to' page
				const pageDirection = toPage === 'back' ? -1 : 1
				const pageIndex = pageHistory.index + pageDirection
				const pageTarget = pageHistory.history[pageIndex]

				// change only if pageIndex points to a real page
				if (pageTarget !== undefined) {
					pageHistory.index = pageIndex

					setImmediate(() => {
						this.surfaces.devicePageSet(surfaceId, pageTarget, true)
					})
				}
			} else {
				let newPage: number
				if (toPage === '+1') {
					newPage = currentPage + 1
					if (newPage > 99) newPage = 1
				} else if (toPage === '-1') {
					newPage = currentPage - 1
					if (newPage < 1) newPage = 99
				} else {
					newPage = Number(toPage)
				}
				if (isNaN(newPage)) newPage = 1

				// Change page after this runloop
				setImmediate(() => {
					this.surfaces.devicePageSet(surfaceId, newPage, true)
				})

				// Clear forward page history beyond current index, add new history entry, increment index;
				pageHistory.history = pageHistory.history.slice(0, pageHistory.index + 1)
				pageHistory.history.push(newPage)
				pageHistory.index += 1

				// Limit the max history
				const maxPageHistory = 100
				if (pageHistory.history.length > maxPageHistory) {
					const startIndex = pageHistory.history.length - maxPageHistory
					const endIndex = pageHistory.history.length
					pageHistory.history = pageHistory.history.slice(startIndex, endIndex)
					pageHistory.index = endIndex
				}
			}
		}
	}

	override getFeedbackDefinitions(): Record<string, FeedbackDefinition> {
		return {
			surface_on_page: {
				type: 'boolean',
				label: 'When a surface is on the selected page',
				description: 'Change style when a surface is on the selected page',
				style: {
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(255, 0, 0),
				},
				options: [
					{
						type: 'internal:surface_serial',
						label: 'Surface / controller',
						id: 'controller',
					},
					{
						type: 'internal:page',
						label: 'Page',
						id: 'page',
						includeDirection: false,
						default: 0,
					},
				],
			},
		}
	}

	override executeFeedback(feedback: InternalFeedbackInstance): boolean | undefined {
		if (feedback.type == 'surface_on_page') {
			const theController = this.#fetchControllerId(feedback.options, feedback.info, false)
			const thePage = this.#fetchPage(feedback.options, feedback.info, false)

			const currentPage = this.surfaces.devicePageGet(theController, true)

			return currentPage == thePage
		}
		return undefined
	}
}
