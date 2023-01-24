import type { Registry, SocketClient } from '../tmp.js'
import DataCache from './Cache.js'
import DataImportExport from './ImportExport.js'
import DataMetrics from './Metrics.js'
import DataUserConfig from './UserConfig.js'

class DataController {
	public readonly cache: DataCache
	public readonly userconfig: DataUserConfig
	public readonly importExport: DataImportExport
	public readonly metrics: DataMetrics

	constructor(registry: Registry) {
		this.cache = new DataCache(registry)
		this.userconfig = new DataUserConfig(registry)
		this.importExport = new DataImportExport(registry)
		this.metrics = new DataMetrics(registry)
	}

	/**
	 * Setup a new socket client's events
	 * @param {SocketIO} client - the client socket
	 * @access public
	 */
	clientConnect(client: SocketClient) {
		this.userconfig.clientConnect(client)
		this.importExport.clientConnect(client)
	}
}

export default DataController
