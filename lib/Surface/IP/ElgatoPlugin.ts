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

import LogController from '../../Log/Controller.js'
import { rotateBuffer } from '../../Resources/Util.js'
import { EventEmitter } from 'eventemitter3'
import { CreateBankControlId } from '../../Shared/ControlId.js'
import type { Registry } from '../../tmp.js'
import ControlsController from '../../Controls/Controller.js'
import type { SurfaceInfo, SurfaceConfig, ISurface, ISurfaceEvents } from '../info.js'
import { MAX_BUTTONS } from '../../Resources/Constants.js'
import type { WebSocket } from 'ws'

class SurfaceIPElgatoPlugin extends EventEmitter<ISurfaceEvents> implements ISurface {
	logger = LogController.createLogger('Surface/IP/ElgatoPlugin')

	private readonly controls: ControlsController

	private readonly socket: WebSocket

	info: SurfaceInfo
	_config: SurfaceConfig

	constructor(registry: Registry, devicepath: string, socket: WebSocket) {
		super()
		this.controls = registry.controls

		this.socket = socket

		this.logger.debug('Adding Elgato Streamdeck Plugin')

		this.info = {
			type: 'Elgato Streamdeck Plugin',
			devicepath: devicepath,
			configFields: ['rotation'],
			keysPerRow: 8,
			keysTotal: 32,
			deviceId: 'plugin',
			location: '',
		}

		this._config = {
			rotation: 0,
		}

		socket.on('keydown', (data: any) => {
			let key = data.keyIndex
			let page = data.page
			let bank = data.bank

			if (key !== undefined) {
				this.emit('click', key, true)
			} else if (page !== undefined && bank !== undefined) {
				const controlId = CreateBankControlId(page, bank + 1)
				this.controls.pressControl(controlId, true, this.info.devicepath)

				this.logger.debug(`${controlId} pressed`)
			}
		})

		socket.on('keyup', (data: any) => {
			let key = data.keyIndex
			let page = data.page
			let bank = data.bank

			if (key !== undefined) {
				this.emit('click', key, false)
			} else if (page !== undefined && bank !== undefined) {
				const controlId = CreateBankControlId(page, bank + 1)
				this.controls.pressControl(controlId, false, this.info.devicepath)

				this.logger.debug(`${controlId} released`)
			}
		})

		socket.on('rotate', (data: any) => {
			let key = data.keyIndex
			let page = data.page
			let bank = data.bank

			let right = data.ticks > 0

			if (key !== undefined) {
				this.emit('rotate', key, right)
			} else if (page !== undefined && bank !== undefined) {
				const controlId = CreateBankControlId(page, bank + 1)
				this.controls.rotateControl(controlId, right, this.info.devicepath)

				this.logger.debug(`${controlId} rotated ${right}`)
			}
		})
	}

	quit(): void {
		this.socket.removeAllListeners('keyup')
		this.socket.removeAllListeners('keydown')
		this.socket.removeAllListeners('rotate')
	}

	draw(key: number, buffer: Buffer | undefined, style): boolean {
		if (buffer === undefined || buffer.length != 15552) {
			this.logger.silly('buffer was not 15552, but ', buffer?.length)
			return false
		}

		buffer = rotateBuffer(buffer, this._config.rotation ?? 0)
		this.socket.send(
			JSON.stringify({
				command: 'fillImage',
				arguments: {
					keyIndex: key,
					data: buffer,
				},
			})
		)

		return true
	}

	clearDeck(): void {
		this.logger.silly('elgato.prototype.clearDeck()')
		const emptyBuffer = Buffer.alloc(72 * 72 * 3)

		for (let i = 0; i < MAX_BUTTONS; ++i) {
			this.socket.send(
				JSON.stringify({
					command: 'fillImage',
					arguments: {
						keyIndex: i,
						data: emptyBuffer,
					},
				})
			)
		}
	}

	setConfig(config: SurfaceConfig): void {
		this._config = config
	}
}

export default SurfaceIPElgatoPlugin
