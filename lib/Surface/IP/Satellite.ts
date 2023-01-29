/*
 * This file is part of the Companion project
 * Copyright (c) 2019 Bitfocus AS
 * Authors: Håkon Nessjøen <haakon@bitfocus.io>, William Viker <william@bitfocus.io>
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
import { rotateBuffer } from '../../Resources/Util.js'
import LogController from '../../Log/Controller.js'
import { EventEmitter } from 'eventemitter3'
import { Socket } from 'net'
import { ISurface, ISurfaceEvents, SurfaceConfig, SurfaceInfo } from '../info.js'

export interface SatelliteDeviceInfo {
	deviceId: string
	productName: string
	path: string
	keysPerRow: number
	keysTotal: number
	socket: Socket

	streamBitmaps: boolean
	streamColors: boolean
	streamText: boolean
}

class SurfaceIPSatellite extends EventEmitter<ISurfaceEvents> implements ISurface {
	logger = LogController.createLogger('Surface/IP/Satellite')

	socket: Socket

	deviceId: string
	info: SurfaceInfo
	_config: SurfaceConfig

	#streamBitmaps = false
	#streamColors = false
	#streamText = false

	constructor(deviceInfo: SatelliteDeviceInfo) {
		super()

		this.info = {
			type: deviceInfo.productName,
			devicepath: deviceInfo.path,
			configFields: ['brightness'],
			keysPerRow: deviceInfo.keysPerRow,
			keysTotal: deviceInfo.keysTotal,
			deviceId: deviceInfo.path,
			location: deviceInfo.socket.remoteAddress ?? '',
		}

		this.deviceId = deviceInfo.deviceId

		this.socket = deviceInfo.socket

		this.#streamBitmaps = deviceInfo.streamBitmaps
		this.#streamColors = deviceInfo.streamColors
		this.#streamText = deviceInfo.streamText

		this.logger.info(`Adding Satellite device "${this.deviceId}"`)

		if (this.#streamBitmaps) {
			this.info.configFields.push('rotation')
		}

		this._config = {
			rotation: 0,
			brightness: 100,
		}
	}

	quit(): void {}

	draw(key: number, buffer: Buffer | undefined, style): boolean {
		if (this.socket !== undefined) {
			let params = ``
			if (this.#streamColors) {
				// convert color to hex
				const bgcolor = style && typeof style.bgcolor === 'number' ? style.bgcolor : 0
				const color = bgcolor.toString(16).padStart(6, '0')

				params += ` COLOR=#${color}`
			}
			if (this.#streamBitmaps) {
				if (buffer === undefined || buffer.length != 15552) {
					this.logger.warn('buffer was not 15552, but ', buffer?.length)
				} else {
					params += ` BITMAP=${rotateBuffer(buffer, this._config.rotation ?? 0).toString('base64')}`
				}
			}
			if (this.#streamText) {
				const text = style?.text || ''
				params += ` TEXT=${Buffer.from(text).toString('base64')}`
			}

			let type = 'BUTTON'
			if (style === 'pageup') {
				type = 'PAGEUP'
			} else if (style === 'pagedown') {
				type = 'PAGEDOWN'
			} else if (style === 'pagenum') {
				type = 'PAGENUM'
			}

			params += ` PRESSED=${style?.pushed ? 'true' : 'false'}`

			this.socket.write(`KEY-STATE DEVICEID=${this.deviceId} KEY=${key} TYPE=${type} ${params}\n`)
		}

		return true
	}

	doButton(key: number, state: boolean): void {
		this.emit('click', key, state)
	}

	doRotate(key: number, direction: boolean): void {
		this.emit('rotate', key, direction)
	}

	clearDeck(): void {
		this.logger.silly('elgato.prototype.clearDeck()')
		if (this.socket !== undefined) {
			this.socket.write(`KEYS-CLEAR DEVICEID=${this.deviceId}\n`)
		} else {
			this.logger.debug('trying to emit to nonexistaant socket: ', this.deviceId)
		}
	}

	setConfig(config: SurfaceConfig, force?: boolean): void {
		if ((force || this._config.brightness != config.brightness) && config.brightness !== undefined) {
			this.setBrightness(config.brightness)
		}

		this._config = config
	}

	setBrightness(value: number): void {
		this.logger.silly('brightness: ' + value)
		if (this.socket !== undefined) {
			this.socket.write(`BRIGHTNESS DEVICEID=${this.deviceId} VALUE=${value}\n`)
		}
	}
}

export default SurfaceIPSatellite
