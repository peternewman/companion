import jsonPatch from 'fast-json-patch'
import { isEqual } from 'lodash-es'
import CoreBase from '../Core/Base.js'
import type { SocketClient } from '../tmp.js'
import type Registry from '../Registry.js'
import type { InstanceStatus as ModuleStatusLevel } from '@companion-module/base'

export enum InstanceStatusCategory {
	Error = 'error',
	Warning = 'warning',
	Good = 'good',
}

export interface InstanceStatus {
	category: InstanceStatusCategory | null
	level: ModuleStatusLevel | 'crashed' | null
	message: string | undefined
}

class Status extends CoreBase {
	/**
	 * The latest statuses object
	 * levels: null = unknown, see updateInstanceStatus for possible values
	 * @access private
	 */
	#instanceStatuses: Record<string, InstanceStatus | undefined> = {}

	constructor(registry: Registry) {
		super(registry, 'instance', 'Instance/Status')
	}

	/**
	 * Setup a new socket client's events
	 * @param {SocketIO} client - the client socket
	 * @access public
	 */
	clientConnect(client: SocketClient) {
		client.onPromise('instance_status:get', () => {
			return this.#instanceStatuses
		})
	}

	/**
	 * Update the status of an instance
	 * @param {String} instance_id
	 * @param {number | null} level
	 * @param {String | null} msg
	 */
	updateInstanceStatus(
		instance_id: string,
		level: ModuleStatusLevel | 'crashed' | null,
		msg: string | undefined | null
	) {
		let category: InstanceStatusCategory | null = InstanceStatusCategory.Warning

		switch (level) {
			case null:
				category = null
				break
			case 'ok':
				category = InstanceStatusCategory.Good
				break
			case 'connecting':
			case 'disconnected':
			case 'connection_failure':
			case 'crashed':
			case 'unknown_error':
				category = InstanceStatusCategory.Error
				break
			case 'bad_config':
			case 'unknown_warning':
			default:
				category = InstanceStatusCategory.Warning
				break
		}

		const newStatuses = { ...this.#instanceStatuses }
		newStatuses[instance_id] = {
			category: category,
			level: level,
			message: msg?.toString?.(),
		}

		if (!isEqual(newStatuses[instance_id], this.#instanceStatuses[instance_id])) {
			this.internalModule.calculateInstanceErrors(newStatuses)

			this.controls.checkAllStatus()

			this.#setStatuses(newStatuses)
		}
	}

	/**
	 * Get the status of an instance
	 * @param {String} instance_id
	 * @returns {object} ??
	 */
	getInstanceStatus(instance_id: string) {
		return this.#instanceStatuses[instance_id]
	}

	forgetInstanceStatus(instance_id: string) {
		const newStatuses = { ...this.#instanceStatuses }
		delete newStatuses[instance_id]

		this.#setStatuses(newStatuses)
	}

	#setStatuses(newObj: Record<string, InstanceStatus | undefined>) {
		const patch = jsonPatch.compare(this.#instanceStatuses || {}, newObj || {})
		if (patch.length > 0) {
			// TODO - make this be a subscription with a dedicated room
			this.io.emit(`instance_status:patch`, patch)
		}

		this.#instanceStatuses = newObj
	}
}

export default Status
