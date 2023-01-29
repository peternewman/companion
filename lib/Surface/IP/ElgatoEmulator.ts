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

import { EventEmitter } from 'eventemitter3'
import { cloneDeep } from 'lodash-es'
import LogController from '../../Log/Controller.js'
import jsonPatch from 'fast-json-patch'
import debounceFn from 'debounce-fn'
import { ISurface, ISurfaceEvents, SurfaceConfig, SurfaceDrawStyle, SurfaceInfo } from '../info.js'
import { Registry, SocketClient } from '../../tmp.js'
import UIHandler from '../../UI/Handler.js'

export function EmulatorRoom(id: string): string {
	return `emulator:${id}`
}

class SurfaceIPElgatoEmulator extends EventEmitter<ISurfaceEvents> implements ISurface {
	logger = LogController.createLogger('Surface/IP/ElgatoEmulator')

	#lastSentConfigJson: SurfaceConfig = {}
	#pendingKeyBuffers = new Set<number>()

	#emitChanged = debounceFn(
		() => {
			if (this.#pendingKeyBuffers.size > 0) {
				const newImages: Record<number, Buffer | false> = {}
				for (const key of this.#pendingKeyBuffers.values()) {
					newImages[key] = this.imageCache[key] || false
				}

				this.#pendingKeyBuffers.clear()

				this.io.emitToRoom(EmulatorRoom(this.id), 'emulator:images', newImages)
			}
		},
		{
			wait: 5,
			maxWait: 50,
			before: false,
			after: true,
		}
	)

	registry: Registry
	io: UIHandler

	id: string

	info: SurfaceInfo
	// _config: SurfaceConfig

	imageCache: Record<number, Buffer | false | undefined>

	constructor(registry: Registry, emulatorId: string) {
		super()

		this.registry = registry
		this.io = this.registry.io

		this.id = emulatorId

		this.info = {
			type: 'Emulator',
			devicepath: `emulator:${emulatorId}`,
			configFields: ['emulator_control_enable', 'emulator_prompt_fullscreen'],
			keysPerRow: 8,
			keysTotal: 32,
			deviceId: `emulator:${emulatorId}`,
			location: '',
		}

		this.logger.debug('Adding Elgato Streamdeck Emulator')

		this.imageCache = {}
		for (let key = 0; key < this.info.keysTotal; key++) {
			this.imageCache[key] = false
		}
	}

	setupClient(client: SocketClient): SurfaceConfig {
		client.emit('emulator:images', this.imageCache)

		return this.#lastSentConfigJson
	}

	setConfig(config: SurfaceConfig): void {
		const roomName = EmulatorRoom(this.id)
		if (this.io.countRoomMembers(roomName) > 0) {
			const patch = jsonPatch.compare(this.#lastSentConfigJson || {}, config || {})
			if (patch.length > 0) {
				this.io.emitToRoom(roomName, `emulator:config`, config)
			}
		}

		this.#lastSentConfigJson = cloneDeep(config)
	}

	quit(): void {}

	draw(key: number, buffer: Buffer | undefined, _style: SurfaceDrawStyle | undefined): boolean {
		if (buffer === undefined || buffer.length != 15552) {
			this.logger.verbose('buffer was not 15552, but ', buffer?.length)
			return false
		}

		this.imageCache[key] = buffer || false

		this.#pendingKeyBuffers.add(key)
		this.#emitChanged()

		// this.io.emitToRoom(EmulatorRoom(this.id), 'emulator:image', key, buffer)

		return true
	}

	clearDeck(): void {
		this.logger.silly('elgato.prototype.clearDeck()')

		// clear all images
		this.imageCache = {}
		for (let key = 0; key < this.info.keysTotal; key++) {
			this.imageCache[key] = false
		}

		this.io.emitToRoom(EmulatorRoom(this.id), 'emulator:images', this.imageCache)
	}
}

export default SurfaceIPElgatoEmulator
