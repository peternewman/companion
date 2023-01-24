import { performance } from 'perf_hooks'
import { EventEmitter } from 'eventemitter3'

type TriggerEventsEvents = {
	tick: [nowSeconds: number, unixTime: number]
	trigger_enabled: [controlId: string, enabled: boolean]
}

/**
 * Main bus for trigger events
 *
 * @extends CoreBase
 * @author Håkon Nessjøen <haakon@bitfocus.io>
 * @author Keith Rocheck <keith.rocheck@gmail.com>
 * @author William Viker <william@bitfocus.io>
 * @author Julian Waller <me@julusian.co.uk>
 * @since 3.0.0
 * @abstract
 * @copyright 2022 Bitfocus AS
 * @license
 * This program is free software.
 * You should have received a copy of the MIT licence as well as the Bitfocus
 * Individual Contributor License Agreement for Companion along with
 * this program.
 *
 * You can be released from the requirements of the license by purchasing
 * a commercial license. Buying such a license is mandatory as soon as you
 * develop commercial activities involving the Companion software without
 * disclosing the source code of your own applications.
 */
export default class TriggerEvents extends EventEmitter<TriggerEventsEvents> {
	/**
	 * The last tick time emitted
	 * @type {number}
	 * @access private
	 */
	#lastTick: number = Math.round(performance.now() / 1000)

	constructor() {
		super()

		/* this.interval = */ setInterval(() => {
			// Future: Would this benefit from ticking more than once a second?
			const nowSeconds = Math.round(performance.now() / 1000)
			this.#lastTick = nowSeconds
			this.emit('tick', nowSeconds, Date.now())
		}, 1000)
	}

	/**
	 * Get the last tick time emitted
	 * @type {number}
	 * @access public
	 */
	getLastTickTime() {
		return this.#lastTick
	}
}
