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

import { Server as IOServer, ServerOptions, Socket } from 'socket.io'
import LogController from '../Log/Controller.js'
import { Registry, SocketClient } from '../tmp.js'
import { Server as httpsServer } from 'https'
import { Server as httpServer } from 'http'

class UIHandler {
	logger = LogController.createLogger('UI/Handler')

	registry: Registry
	options: Partial<ServerOptions>

	httpIO: IOServer
	httpsIO: IOServer | undefined

	constructor(registry: Registry, http: httpServer) {
		this.registry = registry

		this.options = {
			allowEIO3: true,
			maxHttpBufferSize: 100 * 1000 * 1000, // bytes. 100mb matches socket.io v2. while not entirely safe, its what it used to be so is good enough for now
			cors: {
				// Allow everything
				origin: (o, cb) => cb(null, o),
				credentials: true,
			},
		}

		this.httpIO = new IOServer(http, this.options)

		this.httpIO.on('connect', this.clientConnect.bind(this))
	}

	/**
	 * Setup a new socket client's events
	 * @param {SocketIO} client - the client socket
	 * @access public
	 */
	private clientConnect(client: Socket) {
		this.logger.debug('socket ' + client.id + ' connected')

		client.emit('app-version-info', {
			appVersion: this.registry.appVersion,
			appBuild: this.registry.appBuild,
		})

		const wrapperClient = client as SocketClient // TODO - remove this

		// Wrap all 'client.on' calls, so that we 'handle' any errors they might throw
		const originalOn = wrapperClient.on.bind(client)
		wrapperClient.on = (name, fcn) => {
			// @ts-expect-error
			originalOn.call(client, name, (...args: any[]) => {
				try {
					fcn(...args)
				} catch (e: any) {
					this.logger.warn(`Error in client handler '${name}': ${e} ${e?.stack}`)
				}
			})
			return wrapperClient
		}
		// Provide a promise based 'client.on' method, for methods which want to be promise based.
		// Note: it expects the last parameter to be the callback
		wrapperClient.onPromise = (name, fcn) => {
			// @ts-expect-error
			originalOn.call(wrapperClient, name, (...args: any[]) => {
				Promise.resolve().then(async () => {
					const cb = args.pop()
					try {
						const result = await fcn(...args)
						cb(null, result)
					} catch (e: any) {
						this.logger.warn(`Error in client handler '${name}': ${e} ${e?.stack}`)
						if (cb) cb('error', null)
					}
				})
			})
			return wrapperClient
		}

		this.registry.log.clientConnect(wrapperClient)
		this.registry.ui.clientConnect(wrapperClient)
		this.registry.data.clientConnect(wrapperClient)
		this.registry.page.clientConnect(wrapperClient)
		this.registry.controls.clientConnect(wrapperClient)
		this.registry.preview.clientConnect(wrapperClient)
		this.registry.surfaces.clientConnect(wrapperClient)
		this.registry.instance.clientConnect(wrapperClient)
		this.registry.cloud.clientConnect(wrapperClient)

		client.on('disconnect', () => {
			this.logger.debug('socket ' + wrapperClient.id + ' disconnected')
		})
	}

	emit(...args: Parameters<IOServer['emit']>) {
		this.httpIO.emit(...args)

		if (this.httpsIO !== undefined) {
			this.httpsIO.emit(...args)
		}
	}

	emitToRoom(room: string, ...args: Parameters<IOServer['emit']>) {
		this.httpIO.to(room).emit(...args)

		if (this.httpsIO !== undefined) {
			this.httpsIO.to(room).emit(...args)
		}
	}

	countRoomMembers(room: string) {
		let clientsInRoom = 0

		if (this.httpIO.sockets.adapter.rooms.has(room)) {
			clientsInRoom += this.httpIO.sockets.adapter.rooms.get(room)?.size ?? 0
		}
		if (this.httpsIO && this.httpsIO.sockets.adapter.rooms.has(room)) {
			clientsInRoom += this.httpsIO.sockets.adapter.rooms.get(room)?.size ?? 0
		}

		return clientsInRoom
	}

	enableHttps(https: httpsServer | undefined) {
		if (https !== undefined) {
			this.httpsIO = new IOServer(https, this.options)

			this.httpsIO.on('connect', this.clientConnect.bind(this))
		}
	}
}

export default UIHandler
