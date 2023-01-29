import type { Registry, SocketClient } from '../tmp.js'
import UIExpress from './Express.js'
import UIHandler from './Handler.js'
import UIServer from './Server.js'
import UIUpdate from './Update.js'

class UIController {
	public readonly express: UIExpress
	public readonly server: UIServer
	public readonly io: UIHandler
	public readonly update: UIUpdate

	constructor(registry: Registry) {
		this.express = new UIExpress(registry)
		this.server = new UIServer(registry, this.express.app)
		this.io = new UIHandler(registry, this.server)
		this.update = new UIUpdate(registry)
	}

	/**
	 * Setup a new socket client's events
	 * @param {SocketIO} client - the client socket
	 * @access public
	 */
	clientConnect(client: SocketClient) {
		this.update.clientConnect(client)
	}
}

export default UIController
