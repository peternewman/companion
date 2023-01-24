import { EventEmitter } from 'events'
import type { Registry } from '../tmp.js'
import type winston from 'winston'
import type DataCache from '../Data/Cache.js'
import type ControlsController from '../Controls/Controller.js'
import type DataDatabase from '../Data/Database.js'
import type GraphicsController from '../Graphics/Controller.js'
import type UIHandler from '../UI/Handler.js'
import type PageController from '../Page/Controller.js'
import type GraphicsPreview from '../Graphics/Preview.js'
import type ServiceController from '../Service/Controller.js'
import type SurfaceController from '../Surface/Controller.js'
import type DataUserConfig from '../Data/UserConfig.js'
import type InternalController from '../Internal/Controller.js'

/**
 * Abstract class to be extended by most core classes.  Provides access to the
 * {@link Registry} and other core modules.
 *
 * @author Håkon Nessjøen <haakon@bitfocus.io>
 * @author Keith Rocheck <keith.rocheck@gmail.com>
 * @author William Viker <william@bitfocus.io>
 * @since 2.3.0
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
class CoreBase extends EventEmitter {
	/**
	 * The application core
	 * @type {Registry}
	 * @access protected
	 */
	registry: Registry

	/**
	 * The logger for this class
	 * @type {winston.Logger}
	 * @access protected
	 */
	logger: winston.Logger

	/**
	 * This needs to be called in the extending class
	 * using <code>super(registry, 'module_name', 'module_path')</code>.
	 * @param {Registry} registry - the application core
	 * @param {string} logSource - module name to be used in UI logs
	 * @param {string} debugNamespace - module path to be used in the debugger
	 */
	constructor(registry: Registry, _logSource: string, debugNamespace: string) {
		super()

		this.registry = registry

		this.logger = this.registry.log.createLogger(debugNamespace)
	}

	/**
	 * The disk cache library
	 * @type {DataCache}
	 * @access protected
	 * @readonly
	 */
	get cache(): DataCache {
		return this.registry.cache
	}

	/**
	 * The core controls controller
	 * @type {ControlsController}
	 * @access protected
	 * @readonly
	 */
	get controls(): ControlsController {
		return this.registry.controls
	}

	/**
	 * The core database library
	 * @type {DataDatabase}
	 * @access protected
	 * @readonly
	 */
	get db(): DataDatabase {
		return this.registry.db
	}

	/**
	 * The core graphics controller
	 * @type {GraphicsController}
	 * @access protected
	 * @readonly
	 */
	get graphics(): GraphicsController {
		return this.registry.graphics
	}

	/**
	 * The core instance controller
	 * @type {InstanceController}
	 * @access protected
	 * @readonly
	 */
	get instance() {
		return this.registry.instance
	}

	/**
	 * The core interface client
	 * @type {UIHandler}
	 * @access protected
	 * @readonly
	 */
	get io(): UIHandler {
		return this.registry.io
	}

	/**
	 * The core page controller
	 * @type {PageController}
	 * @access protected
	 * @readonly
	 */
	get page(): PageController {
		return this.registry.page
	}

	/**
	 * The core page controller
	 * @type {GraphicsPreview}
	 * @access protected
	 * @readonly
	 */
	get preview(): GraphicsPreview {
		return this.registry.preview
	}

	/**
	 * The core service controller
	 * @type {ServiceController}
	 * @access protected
	 * @readonly
	 */
	get services(): ServiceController {
		return this.registry.services
	}

	/**
	 * The core device controller
	 * @type {SurfaceController}
	 * @access protected
	 * @readonly
	 */
	get surfaces(): SurfaceController {
		return this.registry.surfaces
	}

	/**
	 * The core user config manager
	 * @type {DataUserConfig}
	 * @access protected
	 * @readonly
	 */
	get userconfig(): DataUserConfig {
		return this.registry.userconfig
	}

	/**
	 * The internal module
	 * @type {InternalController}
	 * @access protected
	 * @readonly
	 */
	get internalModule(): InternalController {
		return this.registry.internalModule
	}
}

export default CoreBase
