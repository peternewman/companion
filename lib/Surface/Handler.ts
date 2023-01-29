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

import { cloneDeep } from 'lodash-es'
import CoreBase from '../Core/Base.js'
import { MAX_BUTTONS, MAX_BUTTONS_PER_ROW } from '../Resources/Constants.js'
import { toDeviceKey, toGlobalKey } from '../Resources/Util.js'
import { CreateBankControlId } from '../Shared/ControlId.js'
import { ButtonRender, Complete, Registry } from '../tmp.js'
import { ISurface, SurfaceConfig, SurfaceDrawStyle } from './info.js'

export interface SurfaceConfigExt extends SurfaceConfig {
	use_last_page: boolean
	page: number
	xOffset: number
	yOffset: number
}

export interface SurfaceDbConfig {
	name: string
	config: SurfaceConfigExt

	page: number

	type: string | undefined
	integrationType: string | undefined
}

const PINCODE_NUMBER_POSITIONS = [12, 17, 18, 19, 9, 10, 11, 1, 2, 3]
const PINCODE_CODE_POSITION = 8

class SurfaceHandler extends CoreBase {
	static DefaultSurfaceConfig: Complete<SurfaceConfigExt> = {
		// defaults from the panel - TODO properly
		brightness: 100,
		rotation: 0,

		emulator_control_enable: true,
		emulator_prompt_fullscreen: true,

		// companion owned defaults
		use_last_page: true,
		page: 1,
		xOffset: 0,
		yOffset: 0,
	}

	/**
	 * Current pincode entry if locked
	 */
	currentPincodeEntry = ''

	/**
	 * Time of last user interaction
	 */
	lastInteraction = Date.now()

	/**
	 * Time the surface should be automatically locked
	 */
	lockSurfaceAt = Date.now()

	/**
	 * Whether the surface is currently locked
	 */
	isSurfaceLocked = false

	/**
	 * Calculated info about the panel
	 */
	panelInfo = {
		xOffsetMax: 0,
		yOffsetMax: 0,
	}

	/**
	 * Xkeys: How many pages of colours it has asked for
	 */
	#xkeysPageCount = 0

	panel: ISurface

	currentPage = 1
	lastpress = -1
	lastpage = 0

	timeoutTimer: NodeJS.Timer

	panelconfig: SurfaceDbConfig

	constructor(registry: Registry, integrationType: string, panel: ISurface) {
		super(registry, `device(${panel.info.deviceId})`, `Surface/Handler/${panel.info.deviceId}`)
		this.logger.silly('loading for ' + panel.info.devicepath)

		this.panel = panel
		this.isSurfaceLocked = !!this.userconfig.getKey('pin_enable')

		// Fill in max offsets
		const keysPerRow = this.panel.info.keysPerRow || 0
		const keysTotal = this.panel.info.keysTotal || 0
		if (keysPerRow && keysTotal) {
			const maxRows = Math.ceil(MAX_BUTTONS / MAX_BUTTONS_PER_ROW)
			this.panelInfo.xOffsetMax = Math.max(Math.floor(MAX_BUTTONS_PER_ROW - keysPerRow), 0)
			this.panelInfo.yOffsetMax = Math.max(Math.floor(maxRows - Math.ceil(keysTotal / keysPerRow)), 0)
		}

		{
			const rawConfig = this.db.getKey('deviceconfig', {})
			this.panelconfig = rawConfig[this.deviceId]
			if (!this.panelconfig) {
				this.panelconfig = {
					name: '',
					config: cloneDeep(SurfaceHandler.DefaultSurfaceConfig),

					page: 1,

					type: undefined,
					integrationType: undefined,
				}
				this.logger.silly(`Creating config for newly discovered device ${this.deviceId}`)

				rawConfig[this.deviceId] = this.panelconfig
				this.db.setKey('deviceconfig', rawConfig)
			} else {
				this.logger.silly(`Reusing config for device ${this.deviceId} was on page ${this.currentPage}`)
			}
		}

		// Persist the type in the db for use when it is disconnected
		this.panelconfig.type = this.panel.info.type || 'Unknown'
		this.panelconfig.integrationType = integrationType

		if (!this.panelconfig.config) {
			this.panelconfig.config = cloneDeep(SurfaceHandler.DefaultSurfaceConfig)
		}

		if (this.panelconfig.config.xOffset === undefined || this.panelconfig.config.yOffset === undefined) {
			// Fill in missing default offsets
			this.panelconfig.config.xOffset = 0
			this.panelconfig.config.yOffset = 0
		}

		if (this.panelconfig.config.use_last_page === undefined) {
			// Fill in the new field based on previous behaviour:
			// If a page had been chosen, then it would start on that
			this.panelconfig.config.use_last_page = this.panelconfig.config.page === undefined
		}

		if (this.panelconfig.config.use_last_page) {
			if (this.panelconfig.page !== undefined) {
				// use last page if defined
				this.currentPage = this.panelconfig.page
			}
		} else {
			if (this.panelconfig.config.page !== undefined) {
				// use startup page if defined
				this.currentPage = this.panelconfig.page = this.panelconfig.config.page
			}
		}

		this.onBankInvalidated = this.onBankInvalidated.bind(this)

		this.graphics.on('bank_invalidated', this.onBankInvalidated)

		this.timeoutTimer = setInterval(() => {
			if (
				this.userconfig.getKey('pin_timeout') != 0 &&
				this.userconfig.getKey('pin_enable') == true &&
				Date.now() >= this.lockSurfaceAt &&
				!this.isSurfaceLocked
			) {
				if (this.userconfig.getKey('link_lockouts')) {
					this.surfaces.setAllLocked(true)
				} else {
					this.isSurfaceLocked = true
					this.drawPage()
				}
			}
			if (this.isSurfaceLocked && !this.userconfig.getKey('pin_enable')) {
				this.isSurfaceLocked = false
				this.drawPage()
			}
		}, 1000)

		this.panel.on('click', this.onDeviceClick.bind(this))
		this.panel.on('rotate', this.onDeviceRotate.bind(this))
		this.panel.on('remove', this.onDeviceRemove.bind(this))

		// subscribe to some xkeys specific events
		this.panel.on('xkeys-subscribePage', this.onXkeysSubscribePages.bind(this))
		this.panel.on('xkeys-setVariable', this.onXkeysSetVariable.bind(this))

		setImmediate(() => {
			this.saveConfig()

			if (this.panel.setConfig) {
				const config = this.panelconfig.config
				this.panel.setConfig(config, true)
			}

			this.surfaces.emit('surface_page', this.deviceId, this.currentPage)

			this.drawPage()
		})
	}

	get deviceId() {
		return this.panel.info.deviceId
	}

	#deviceIncreasePage() {
		this.currentPage++
		if (this.currentPage >= 100) {
			this.currentPage = 1
		}
		if (this.currentPage <= 0) {
			this.currentPage = 99
		}

		this.#storeNewDevicePage(this.currentPage)
	}

	#deviceDecreasePage() {
		this.currentPage--
		if (this.currentPage >= 100) {
			this.currentPage = 1
		}
		if (this.currentPage <= 0) {
			this.currentPage = 99
		}

		this.#storeNewDevicePage(this.currentPage)
	}

	drawPage() {
		if (this.panel) {
			if (this.isSurfaceLocked) {
				const buffers = this.graphics.getImagesForPincode(this.currentPincodeEntry)
				this.panel.clearDeck()
				this.#drawButton(PINCODE_CODE_POSITION, buffers.code.buffer, undefined)

				PINCODE_NUMBER_POSITIONS.forEach((key, i) => {
					if (buffers[i]) {
						this.#drawButton(key, buffers[i].buffer, undefined)
					}
				})
			} else if (this.#xkeysPageCount > 0) {
				this.#xkeysDrawPages()
			} else {
				const xOffset = Math.min(Math.max(this.panelconfig.config.xOffset || 0, 0), this.panelInfo.xOffsetMax)
				const yOffset = Math.min(Math.max(this.panelconfig.config.yOffset || 0, 0), this.panelInfo.yOffsetMax)

				for (let i = 0; i < MAX_BUTTONS; ++i) {
					// Note: the maths looks inverted, but it goes through the toDeviceKey still
					const key = i - xOffset - yOffset * MAX_BUTTONS_PER_ROW

					const image = this.graphics.getBank(this.currentPage, i + 1)
					this.#drawButton(key, image.buffer, image.style)
				}
			}
		}
	}

	#drawButton(key: number, buffer: Buffer | undefined, style: SurfaceDrawStyle | undefined): void {
		const localKey = toDeviceKey(this.panel.info.keysTotal, this.panel.info.keysPerRow, key)
		if (localKey >= 0 && localKey < this.panel.info.keysTotal) {
			this.panel.draw(localKey, buffer, style)
		}
	}

	getPanelConfig() {
		return this.panelconfig.config
	}

	getPanelInfo() {
		return this.panelInfo
	}

	setLocked(locked: boolean): void {
		if (!locked) {
			// Reset timers for next auto-lock
			this.lastInteraction = Date.now()
			this.lockSurfaceAt = Number(this.userconfig.getKey('pin_timeout')) * 1000 + Date.now()
		}

		// If it changed, redraw
		if (this.isSurfaceLocked != locked) {
			this.isSurfaceLocked = !!locked

			this.drawPage()
		}
	}

	onBankInvalidated(page: number, bank: number, render: ButtonRender): void {
		// If device is locked ignore updates. pincode updates are handled separately
		if (this.isSurfaceLocked) return

		if (this.#xkeysPageCount > 0) {
			// xkeys mode
			const pageOffset = page - this.currentPage
			if (this.panel.xkeysDraw && pageOffset >= 0 && pageOffset < this.#xkeysPageCount) {
				this.panel.xkeysDraw(pageOffset, bank, render.style?.bgcolor || 0)
			}
		} else if (page == this.currentPage) {
			// normal mode
			const xOffset = Math.min(Math.max(this.panelconfig.config.xOffset || 0, 0), this.panelInfo.xOffsetMax)
			const yOffset = Math.min(Math.max(this.panelconfig.config.yOffset || 0, 0), this.panelInfo.yOffsetMax)

			// Note: the maths looks inverted, but it goes through the toDeviceKey still
			const key = bank - 1 - xOffset - yOffset * MAX_BUTTONS_PER_ROW

			this.#drawButton(key, render.buffer, render.style)
		}
	}

	setBrightness(brightness: number): void {
		if (this.panel) {
			if (this.panel.setConfig) {
				const config = {
					...this.panelconfig.config,
					brightness: brightness,
				}

				setImmediate(() => {
					this.panel.setConfig(config)
				})
			}
		}
	}

	onDeviceRemove(): void {
		if (this.panel) {
			this.surfaces.removeDevice(this.panel.info.devicepath)
		}
	}

	onDeviceClick(key: number, pressed: boolean, pageOffset?: number): void {
		if (this.panel) {
			key = toGlobalKey(this.panel.info.keysPerRow, key)

			if (!this.isSurfaceLocked) {
				this.lastInteraction = Date.now()
				this.lockSurfaceAt = Number(this.userconfig.getKey('pin_timeout')) * 1000 + Date.now()

				// Translate key for offset
				const xOffset = Math.min(Math.max(this.panelconfig.config.xOffset || 0, 0), this.panelInfo.xOffsetMax)
				const yOffset = Math.min(Math.max(this.panelconfig.config.yOffset || 0, 0), this.panelInfo.yOffsetMax)

				// Note: the maths looks inverted, but its already been through toGlobalKey
				key = Number(key) + xOffset + yOffset * MAX_BUTTONS_PER_ROW

				let thisPage = this.currentPage

				// TODO - what is lastpress vs lastpage. This flow looks weird and like it might get things wrong sometimes..
				let thispress = this.currentPage
				if (pressed) {
					this.lastpress = thispress
					this.lastpage = this.currentPage
				} else if (thispress != this.lastpress) {
					// page changed on this device before button released
					// release the old page+bank
					thisPage = this.lastpage
					this.lastpress = -1
				} else {
					this.lastpress = -1
				}

				// allow the xkeys to span pages
				thisPage += pageOffset ?? 0

				const controlId = CreateBankControlId(thisPage, key + 1)
				this.controls.pressControl(controlId, pressed, this.deviceId)
				this.logger.debug('Button ' + thisPage + '.' + (key + 1) + ' ' + (pressed ? 'pressed' : 'released'))
			} else {
				if (pressed) {
					const pressCode = PINCODE_NUMBER_POSITIONS.indexOf(key)
					if (pressCode !== -1) {
						this.currentPincodeEntry += pressCode.toString()
					}

					if (this.currentPincodeEntry == this.userconfig.getKey('pin').toString()) {
						this.isSurfaceLocked = false
						this.currentPincodeEntry = ''
						this.lastInteraction = Date.now()
						this.lockSurfaceAt = Number(this.userconfig.getKey('pin_timeout')) * 1000 + Date.now()

						this.drawPage()

						if (this.userconfig.getKey('link_lockouts')) {
							this.surfaces.setAllLocked(false)
						}
					} else if (this.currentPincodeEntry.length >= this.userconfig.getKey('pin').toString().length) {
						this.currentPincodeEntry = ''
					}
				}

				if (this.isSurfaceLocked) {
					// Update lockout button
					const datap = this.graphics.getImagesForPincode(this.currentPincodeEntry)
					this.#drawButton(PINCODE_CODE_POSITION, datap.code.buffer, undefined)
				}
			}
		}
	}

	onDeviceRotate(key: number, direction: boolean, pageOffset?: number): void {
		if (this.panel) {
			key = toGlobalKey(this.panel.info.keysPerRow, key)

			if (!this.isSurfaceLocked) {
				this.lastInteraction = Date.now()
				this.lockSurfaceAt = Number(this.userconfig.getKey('pin_timeout')) * 1000 + Date.now()

				// Translate key for offset
				const xOffset = Math.min(Math.max(this.panelconfig.config.xOffset || 0, 0), this.panelInfo.xOffsetMax)
				const yOffset = Math.min(Math.max(this.panelconfig.config.yOffset || 0, 0), this.panelInfo.yOffsetMax)

				// Note: the maths looks inverted, but its already been through toGlobalKey
				key = Number(key) + xOffset + yOffset * MAX_BUTTONS_PER_ROW

				let thisPage = this.currentPage

				// // TODO - what is lastpress vs lastpage. This flow looks weird and like it might get things wrong sometimes..
				// let thispress = this.currentPage
				// if (pressed) {
				// 	this.lastpress = thispress
				// 	this.lastpage = this.currentPage
				// } else if (thispress != this.lastpress) {
				// 	// page changed on this device before button released
				// 	// release the old page+bank
				// 	thisPage = this.lastpage
				// 	this.lastpress = ''
				// } else {
				// 	this.lastpress = ''
				// }

				// allow the xkeys to span pages
				thisPage += pageOffset ?? 0

				const controlId = CreateBankControlId(thisPage, key + 1)
				this.controls.rotateControl(controlId, direction, this.deviceId)
				this.logger.debug('Rotary ' + thisPage + '.' + (key + 1) + ' rotated ' + (direction ? 'right' : 'left'))
			} else {
				// Ignore when locked out
			}
		}
	}

	onXkeysSubscribePages(pageCount: number): void {
		this.#xkeysPageCount = pageCount

		this.#xkeysDrawPages()
	}

	#xkeysDrawPages(): void {
		if (!this.panel.xkeysDraw) return

		for (let page = 0; page < this.#xkeysPageCount; page++) {
			for (let bank = 0; bank < MAX_BUTTONS; bank++) {
				const render = this.graphics.getBank(this.currentPage + page, bank)

				this.panel.xkeysDraw(page, bank, render.style?.bgcolor || 0)
			}
		}
	}

	onXkeysSetVariable(name: string, value: number) {
		this.instance.variable.setVariableValues('internal', {
			[name]: value,
		})
	}

	doPageDown(): void {
		if (this.userconfig.getKey('page_direction_flipped') === true) {
			this.#deviceIncreasePage()
		} else {
			this.#deviceDecreasePage()
		}
	}

	setCurrentPage(page: number): void {
		this.currentPage = page
		if (this.currentPage == 100) {
			this.currentPage = 1
		}
		if (this.currentPage == 0) {
			this.currentPage = 99
		}
		this.#storeNewDevicePage(this.currentPage)
	}

	getCurrentPage(): number {
		return this.currentPage
	}

	doPageUp(): void {
		if (this.userconfig.getKey('page_direction_flipped') === true) {
			this.#deviceDecreasePage()
		} else {
			this.#deviceIncreasePage()
		}
	}

	saveConfig(): void {
		const deviceConfig = this.db.getKey('deviceconfig', {})
		deviceConfig[this.deviceId] = this.panelconfig
		this.db.setKey('deviceconfig', deviceConfig)
	}

	setPanelConfig(newconfig: SurfaceConfigExt): void {
		if (!newconfig.use_last_page && newconfig.page !== undefined && newconfig.page !== this.panelconfig.config.page) {
			// Startup page has changed, so change over to it
			this.#storeNewDevicePage(newconfig.page)
		}

		let redraw = false
		if (newconfig.xOffset != this.panelconfig.config.xOffset || newconfig.yOffset != this.panelconfig.config.yOffset)
			redraw = true
		if (newconfig.rotation != this.panelconfig.config.rotation) redraw = true

		this.panelconfig.config = newconfig
		this.saveConfig()

		if (this.panel.setConfig) {
			this.panel.setConfig(newconfig)
		}

		if (redraw) {
			this.drawPage()
		}
	}

	setPanelName(newname: string): void {
		if (typeof newname === 'string') {
			this.panelconfig.name = newname

			// save it
			this.saveConfig()
		}
	}

	#storeNewDevicePage(newpage: number): void {
		this.panelconfig.page = this.currentPage = newpage
		this.saveConfig()

		this.surfaces.emit('surface_page', this.deviceId, newpage)

		this.drawPage()
	}

	unload(purge?: boolean): void {
		clearInterval(this.timeoutTimer)

		this.logger.error(this.panel.info.type + ' disconnected')
		this.logger.silly('unloading for ' + this.panel.info.devicepath)
		this.graphics.off('bank_invalidated', this.onBankInvalidated)

		try {
			this.panel.quit()
		} catch (e) {}

		const deviceId = this.deviceId

		// delete this.panel.device
		// delete this.panel

		if (purge && deviceId) {
			// this.panelconfig = undefined

			const deviceConfig = this.db.getKey('deviceconfig', {})
			delete deviceConfig[deviceId]
			this.db.setKey('deviceconfig', deviceConfig)
		}
	}
}

export default SurfaceHandler
