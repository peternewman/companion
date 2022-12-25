import { cloneDeep } from 'lodash-es'
import CoreBase from '../Core/Base.js'
import type Registry from '../Registry.js'
import { SocketClient } from '../tmp.js'

const PagesRoom = 'pages'

export interface PageInfo {
	name: string
}

/**
 * The class that manages the user pages
 *
 * @extends CoreBase
 * @author Håkon Nessjøen <haakon@bitfocus.io>
 * @author Keith Rocheck <keith.rocheck@gmail.com>
 * @author William Viker <william@bitfocus.io>
 * @author Julian Waller <me@julusian.co.uk>
 * @since 1.1.0
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
class PageController extends CoreBase {
	private pages: Record<number, PageInfo | undefined>

	/**
	 * @param {Registry} registry - the application core
	 */
	constructor(registry: Registry) {
		super(registry, 'page', 'Page/Controller')

		this.pages = this.db.getKey('page')
		this.pages = this.setupPages(this.pages)
	}

	/**
	 * Setup a new socket client's events
	 * @param {SocketIO} client - the client socket
	 * @access public
	 */
	clientConnect(client: SocketClient) {
		client.onPromise('pages:set-name', (page: number, name: string) => {
			this.logger.silly(`socket: pages:set-name ${page}: ${name}`)

			const existingData = this.pages[page]
			if (!existingData) throw new Error(`Page "${page}" does not exist`)

			this.setPage(page, {
				...existingData,
				name,
			})
		})

		client.onPromise('pages:subscribe', () => {
			this.logger.silly('socket: get_page_all')

			client.join(PagesRoom)

			return this.pages
		})
		client.onPromise('pages:unsubscribe', () => {
			client.leave(PagesRoom)
		})
	}

	/**
	 * Get the entire page table
	 * @param {boolean} [clone = false] - <code>true</code> if a copy should be returned
	 * @returns {Object} the pages
	 * @access public
	 */
	getAll(clone = false) {
		let out

		if (this.pages !== undefined) {
			if (clone === true) {
				out = cloneDeep(this.pages)
			} else {
				out = this.pages
			}
		}

		return out
	}

	/**
	 * Get a specific page object
	 * @param {string} page - the page id
	 * @param {boolean} [clone = false] - <code>true</code> if a copy should be returned
	 * @returns the requested page
	 * @access public
	 */
	getPage(page: number, clone = false): PageInfo | undefined {
		let out

		if (this.pages[page] !== undefined) {
			if (clone === true) {
				out = cloneDeep(this.pages[page])
			} else {
				out = this.pages[page]
			}
		}

		return out
	}

	/**
	 * Get the name for a page
	 * @param {string} page - the page id
	 * @returns {string} the page's name
	 * @access public
	 */
	getPageName(page: number): string {
		const pageInfo = this.pages[page]
		if (pageInfo && pageInfo.name !== undefined) {
			return pageInfo.name
		} else {
			return ''
		}
	}

	/**
	 * Set/update a page
	 * @param {string} page - the page id
	 * @param {Object} value - the page object containing the name
	 * @param {boolean} [clone = false] - <code>true</code> if the graphics should invalidate
	 * @access public
	 */
	setPage(page: number, value, redraw = true) {
		if (!value) value = { name: 'PAGE' }

		this.logger.silly('Set page ' + page + ' to ', value)
		this.pages[page] = value

		this.io.emitToRoom(PagesRoom, 'pages:update', page, value)

		this.db.setKey('page', this.pages)

		if (redraw === true) {
			this.logger.silly('page controls invalidated for page', page)
			this.graphics.invalidatePageNumberControls(page)
		}
	}

	/**
	 * Load the page table with defaults
	 * @access protected
	 */
	private setupPages(pages: Record<number, PageInfo | undefined> | undefined) {
		// Default values
		if (pages === undefined) {
			pages = {}

			for (let n = 1; n <= 99; n++) {
				if (pages[n] === undefined) {
					pages[n] = {
						name: 'PAGE',
					}
				}
			}

			this.db.setKey('page', pages)
		}

		return pages
	}
}

export default PageController
