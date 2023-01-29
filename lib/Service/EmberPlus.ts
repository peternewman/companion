import { EmberServer, Model as EmberModel } from 'emberplus-connection'
import { getPath } from 'emberplus-connection/dist/Ember/Lib/util.js'
import { Collection, EmberValue } from 'emberplus-connection/dist/types/types.js'
import { CreateBankControlId } from '../Shared/ControlId.js'
import { ButtonDrawStyle, ButtonRender, Registry } from '../tmp.js'
import ServiceBase from './Base.js'

class EmberServerExt extends EmberServer {
	close(): void {
		this.discard()
	}
}

/**
 * Class providing the Ember+ api.
 *
 * @extends ServiceBase
 * @author Balte de Wit <contact@balte.nl>
 * @author Håkon Nessjøen <haakon@bitfocus.io>
 * @author Keith Rocheck <keith.rocheck@gmail.com>
 * @author William Viker <william@bitfocus.io>
 * @author Julian Waller <me@julusian.co.uk>
 * @since 2.1.1
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
class ServiceEmberPlus extends ServiceBase<EmberServerExt> {
	/**
	 * Bank state array
	 * @type {Object}
	 * @access protected
	 */
	pushed: Record<string, boolean | undefined> = {}

	/**
	 * @param {Registry} registry - the application's core
	 */
	constructor(registry: Registry) {
		super(registry, 'ember+', 'Service/EmberPlus', 'emberplus_enabled', undefined)

		this.port = 9092

		this.graphics.on('bank_invalidated', this.updateBankText.bind(this))

		this.init()
	}

	/**
	 * Get the page/bank structure in EmberModel form
	 * @returns {EmberModel.NumberedTreeNodeImpl[]}
	 */
	private getPages(): Collection<EmberModel.NumberedTreeNode<EmberModel.EmberElement>> {
		throw new Error('TODO - fix this EmberPlus implementation')

		// const pages = this.page.getAll(true)

		// this.banks = this.db.getKey('bank')

		this.pushed = {}
		// for (const page in pages) {
		// 	for (const bank in this.banks[page]) {
		// 		this.pushed[page + '_' + bank] = 0
		// 	}
		// }

		let output: Collection<EmberModel.NumberedTreeNode<EmberModel.EmberElement>> = {}

		// for (const page in pages) {
		// 	const number = parseInt(page)
		// 	const children = {}

		// 	for (const bank in this.banks[page]) {
		// 		const bankNo = parseInt(bank)
		// 		children[bankNo] = new EmberModel.NumberedTreeNodeImpl(
		// 			bankNo,
		// 			new EmberModel.EmberNodeImpl(`Button ${page}.${bank}`),
		// 			{
		// 				0: new EmberModel.NumberedTreeNodeImpl(
		// 					0,
		// 					new EmberModel.ParameterImpl(
		// 						EmberModel.ParameterType.Boolean,
		// 						'State',
		// 						undefined,
		// 						this.pushed[page + '_' + bank] ? true : false,
		// 						undefined,
		// 						undefined,
		// 						EmberModel.ParameterAccess.ReadWrite
		// 					)
		// 				),
		// 				1: new EmberModel.NumberedTreeNodeImpl(
		// 					1,
		// 					new EmberModel.ParameterImpl(
		// 						EmberModel.ParameterType.String,
		// 						'Label',
		// 						undefined,
		// 						this.banks[page][bank].text || '',
		// 						undefined,
		// 						undefined,
		// 						EmberModel.ParameterAccess.ReadWrite
		// 					)
		// 				),
		// 			}
		// 		)
		// 	}

		// 	output[number] = new EmberModel.NumberedTreeNodeImpl(
		// 		number,
		// 		new EmberModel.EmberNodeImpl(pages[page].name === 'PAGE' ? 'Page ' + page : pages[page].name),
		// 		children
		// 	)
		// }

		return output
	}

	/**
	 * Start the service if it is not already running
	 * @access protected
	 */
	listen(): void {
		if (this.portConfig !== undefined) {
			this.port = Number(this.userconfig.getKey(this.portConfig))
		}

		if (this.server === undefined) {
			try {
				const root = {
					0: new EmberModel.NumberedTreeNodeImpl(0, new EmberModel.EmberNodeImpl('Companion Tree'), {
						0: new EmberModel.NumberedTreeNodeImpl(0, new EmberModel.EmberNodeImpl('identity'), {
							0: new EmberModel.NumberedTreeNodeImpl(
								0,
								new EmberModel.ParameterImpl(EmberModel.ParameterType.String, 'product', undefined, 'Companion')
							),
							1: new EmberModel.NumberedTreeNodeImpl(
								1,
								new EmberModel.ParameterImpl(EmberModel.ParameterType.String, 'company', undefined, 'Bitfocus AS')
							),
							2: new EmberModel.NumberedTreeNodeImpl(
								2,
								new EmberModel.ParameterImpl(
									EmberModel.ParameterType.String,
									'version',
									undefined,
									this.registry.appVersion
								)
							),
							3: new EmberModel.NumberedTreeNodeImpl(
								3,
								new EmberModel.ParameterImpl(
									EmberModel.ParameterType.String,
									'build',
									undefined,
									this.registry.appBuild
								)
							),
						}),
						1: new EmberModel.NumberedTreeNodeImpl(1, new EmberModel.EmberNodeImpl('pages'), this.getPages()),
					}),
				}

				this.server = new EmberServerExt(this.port)
				this.server.on('error', this.handleSocketError.bind(this))
				this.server.onSetValue = this.setValue.bind(this)
				this.server.init(root)
				this.logger.info('Listening on port ' + this.port)
				this.logger.silly('Listening on port ' + this.port)
			} catch (e: any) {
				this.logger.error(`Could not launch: ${e.message}`)
			}
		}
	}

	/**
	 * Process a received command
	 * @param {Object} parameter - the raw path
	 * @param {(string|number|boolean)} value - the new value
	 * @returns {Promise<boolean>} - <code>true</code> if the command was successfully parsed
	 */
	async setValue(parameter: EmberModel.NumberedTreeNode<EmberModel.Parameter>, value: EmberValue): Promise<boolean> {
		const path = getPath(parameter)

		if (!this.server) return false

		if (path.match(/^0\.1\.(\d+\.){2}0/)) {
			let pathInfo = path.split(/\./)
			if (pathInfo.length === 5) {
				const page = parseInt(pathInfo[2])
				const bank = parseInt(pathInfo[3])

				const controlId = CreateBankControlId(page, bank)

				if (page > 0 && page < 100) {
					this.logger.silly('Change ' + controlId + ' to', value)
					this.controls.pressControl(controlId, !!value, 'emberplus')
					this.server.update(parameter, { value })
					return true
				}
			}
		} else if (path.match(/^0\.1\.(\d+\.){2}1/)) {
			let pathInfo = path.split(/\./)
			if (pathInfo.length === 5) {
				const page = parseInt(pathInfo[2])
				const bank = parseInt(pathInfo[3])

				const controlId = CreateBankControlId(page, bank)
				const control = this.controls.getControl(controlId)

				if (control && control.styleSetFields && typeof control.styleSetFields === 'function') {
					this.logger.silly('Change ' + controlId + ' text to', value)

					control.styleSetFields({
						text: value,
					})

					this.server.update(parameter, { value })
					return true
				}
			}
		}

		return false
	}

	/**
	 * Send the latest bank state to the page/bank indicated
	 * @param {number} page - the page number
	 * @param {number} bank - the bank number
	 * @param {boolean} state - the state
	 * @param {string | undefined} deviceid - checks the <code>deviceid</code> to ensure that Ember+ doesn't loop its own state change back
	 */
	updateBankState(page: number, bank: number, state: boolean, deviceid: string | undefined) {
		if (deviceid === 'emberplus') {
			return
		}

		this.pushed[page + '_' + bank] = state

		if (this.server) {
			let path = '0.1.' + page + '.' + bank + '.0'
			let node = this.server.getElementByPath(path)

			// Update ember+ with internal state of button
			if (node) {
				this.server.update(node, { value: state })
			}
		}
	}

	/**
	 * Send the latest bank text to the page/bank indicated
	 * @param {number} page - the page number
	 * @param {number} bank - the bank number
	 */
	updateBankText(page: number, bank: number, render: ButtonRender): void {
		if (this.server) {
			//this.logger.info(`Updating ${page}.${bank} label ${this.banks[page][bank].text}`)
			let path = '0.1.' + page + '.' + bank + '.1'
			let node = this.server.getElementByPath(path)

			// Update ember+ with internal state of button
			const newText = render.style?.text || ''
			if (node && node.contents.type === EmberModel.ElementType.Parameter && node.contents.value !== newText) {
				this.server.update(node, { value: newText })
			}
		}
	}
}

export default ServiceEmberPlus
