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

// We have a lot of problems with USB in electron, so this is a workaround of that.
// TODO: I (Julian) suspect that this is due to node-hid using the uv-pool for reads, so might not be necessary soon
import cp, { ChildProcess } from 'child_process'
import LogController, { ChildLogger } from '../../Log/Controller.js'
import { EventEmitter } from 'eventemitter3'
import { fileURLToPath } from 'url'
import { isPackaged } from '../../Resources/Util.js'
import { ISurface, ISurfaceEvents, SurfaceConfig, SurfaceDrawStyle, SurfaceInfo } from '../info.js'
import { MAX_BUTTONS, MAX_BUTTONS_PER_ROW } from '../../Resources/Constants.js'

class SurfaceUSBController extends EventEmitter<ISurfaceEvents> implements ISurface {
	static async openDevice(type: string, devicepath: string): Promise<SurfaceUSBController> {
		const childId = '0' // The id of the instance inside the fork. We only put one per fork, so can hardcode the id

		const logger = LogController.createLogger(`Surface/USB/${type}/${devicepath}`)

		// fork the child process
		const child = cp.fork(
			isPackaged() ? __dirname + '/Handler.js' : fileURLToPath(new URL('Handler.js', import.meta.url)),
			[],
			{
				stdio: 'inherit',
				env: {
					ELECTRON_RUN_AS_NODE: '1',
					MAX_BUTTONS: MAX_BUTTONS + '',
					MAX_BUTTONS_PER_ROW: MAX_BUTTONS_PER_ROW + '',
				},
			}
		)

		const info = await new Promise<SurfaceInfo>((resolve, reject) => {
			const errorHandler = (e: any) => {
				child.removeAllListeners()
				child.kill('SIGKILL')
				reject(e)
			}

			const messageHandler = (data: any) => {
				if (data.cmd == 'ready') {
					child.send({ id: childId, cmd: 'add', type: type, devicepath: devicepath })
				} else if (data.cmd == 'add') {
					if (data.error) {
						errorHandler(data.error)
					} else {
						child.removeAllListeners()

						resolve(data.info)
					}
				} else if (data.cmd == 'error') {
					errorHandler(data.error || 'Unknown error')
				} else if (data.cmd == 'log') {
					logger.log(data.level, data.message)
				} else {
					errorHandler(`USB Child did not launch correctly. Got unexpected "${data.cmd}"`)
				}
			}

			child.on('error', errorHandler)
			child.on('message', messageHandler)
		})

		return new SurfaceUSBController(type, info, child)
	}

	private readonly childId: string
	private readonly logger: ChildLogger

	private readonly child: ChildProcess

	info: SurfaceInfo

	private constructor(type: string, info: SurfaceInfo, child: ChildProcess) {
		super()

		this.childId = '0' // The id of the instance inside the fork. We only put one per fork, so can hardcode the id

		this.logger = LogController.createLogger(`Surface/USB/${type}/${info.serialnumber}`)
		this.info = info

		this.logger.debug('device added successfully')

		this.child = child

		console.log('sub')

		child.on('message', (data: any) => {
			if (data.cmd == 'error') {
				this.logger.error('Error from usb module ' + type + ': ' + data.error)
				// Device threw an error, so remove it
				this.emit('remove')
			} else if (data.cmd == 'click') {
				this.emit('click', data.key, data.pressed, data.pageOffset ?? 0)
			} else if (data.cmd == 'rotate') {
				this.emit('rotate', data.key, data.direction, data.pageOffset ?? 0)
			} else if (data.cmd == 'log') {
				this.logger.log(data.level, data.message)
			} else if (data.cmd == 'remove') {
				this.emit('remove')
			} else if (data.cmd == 'xkeys-setVariable') {
				this.emit('xkeys-setVariable', data.name, data.value)
			} else if (data.cmd == 'xkeys-subscribePage') {
				this.emit('xkeys-subscribePage', data.pageCount)
			}
		})

		child.on('error', (e: any) => {
			this.logger.warn('Handle USB error: ', e)
		})
	}

	setConfig(config: SurfaceConfig, force?: boolean): void {
		this.child.send({ cmd: 'setConfig', id: this.childId, config, force })
	}

	draw(key: number, buffer: Buffer | undefined, style: SurfaceDrawStyle | undefined): void {
		this.child.send({ cmd: 'draw', id: this.childId, key, buffer, style })
	}

	clearDeck(): void {
		this.child.send({ cmd: 'clearDeck', id: this.childId })
	}

	quit(): void {
		this.child.send({ cmd: 'quit', id: this.childId })

		setTimeout(() => {
			this.child.kill()
		}, 2000)
	}

	xkeysDraw(page: number, key: number, color: number): void {
		this.child.send({ cmd: 'xkeys-color', id: this.childId, page, key, color })
	}
}

export default SurfaceUSBController
