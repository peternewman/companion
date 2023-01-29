import ServiceUdpBase from './UdpBase.js'
import { CreateBankControlId } from '../Shared/ControlId.js'
import { Registry } from '../tmp.js'
import { RemoteInfo } from 'dgram'

/**
 * Class providing the Artnet api.
 *
 * @extends ServiceUdpBase
 * @author Håkon Nessjøen <haakon@bitfocus.io>
 * @author Keith Rocheck <keith.rocheck@gmail.com>
 * @author William Viker <william@bitfocus.io>
 * @author Julian Waller <me@julusian.co.uk>
 * @since 1.2.0
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
class ServiceArtnet extends ServiceUdpBase {
	currentPage = 0
	currentBank = 0
	currentDir = 0

	/**
	 * @param {Registry} registry - the application core
	 */
	constructor(registry: Registry) {
		super(registry, 'artnet', 'Service/Artnet', 'artnet_enabled', undefined)

		this.port = 6454

		this.init()
	}

	/**
	 * Process an incoming message from a remote
	 * @param {Buffer} data - the incoming message
	 * @param {ServiceUdpBase~DgramRemoteInfo} remote - remote address information
	 */
	processIncoming(data: Buffer, _remote: RemoteInfo): void {
		try {
			if (data.length >= 18 + 255) {
				let sequence = data.readUInt8(12)
				let physical = data.readUInt8(13)
				let universe = data.readUInt8(14)
				// let offset = data.readUInt8(16)
				let length = data.readUInt8(17)

				let rawData = []

				for (let i = 18; i < 18 + 255; i++) {
					rawData.push(data.readUInt8(i))
				}

				let packet = {
					sequence: sequence,
					physical: physical,
					universe: universe,
					length: length,
					data: rawData,
				}

				if (Number(packet.universe) === Number(this.userconfig.getKey('artnet_universe'))) {
					let ch = Number(this.userconfig.getKey('artnet_channel'))
					if (ch >= 1) {
						ch -= 1
					}

					let dmxPage = Number(packet.data[ch])
					let dmxBank = Number(packet.data[ch + 1])
					let dmxDir = Number(packet.data[ch + 2])

					if (dmxPage !== this.currentPage || dmxBank !== this.currentBank || dmxDir !== this.currentDir) {
						this.currentPage = dmxPage
						this.currentBank = dmxBank
						this.currentDir = dmxDir

						if (dmxDir == 0 || dmxPage == 0 || dmxBank == 0) {
							return
						}

						const controlId = CreateBankControlId(dmxPage, dmxBank)

						// down
						if (dmxDir > 128) {
							this.controls.pressControl(controlId, false, 'artnet')
						}
						// up
						else if (dmxDir >= 10) {
							this.controls.pressControl(controlId, true, 'artnet')
						}
						// nothing.
						else {
						}
					}
				}
			}
		} catch (err: any) {
			this.logger.silly(`message error: ${err.toString()}`, err.stack)
		}
	}
}

export default ServiceArtnet
