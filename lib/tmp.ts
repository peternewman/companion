import type { CompanionAlignment, CompanionFeedbackButtonStyleResult } from '@companion-module/base'
import type { Socket } from 'socket.io'
import type { EventsMap, ReservedOrUserEventNames, ReservedOrUserListener } from 'socket.io/dist/typed-events'
import type LogController from './Log/Controller'
import type ControlsController from './Controls/Controller'
import type UIHandler from './UI/Handler'
import type InternalController from './Internal/Controller'
import type express from 'express'
import type DataUserConfig from './Data/UserConfig'
import type DataCache from './Data/Cache'
import type DataController from './Data/Controller'
import type DataDatabase from './Data/Database'
import type GraphicsController from './Graphics/Controller'
import type CloudController from './Cloud/Controller'
import type UIController from './UI/Controller'
import type winston from 'winston'
import type PageController from './Page/Controller'
import type GraphicsPreview from './Graphics/Preview'
import type ServiceController from './Service/Controller'
import type SurfaceController from './Surface/Controller'

/**
 * Make all optional properties be required and `| undefined`
 * This is useful to ensure that no property is missed, when manually converting between types, but allowing fields to be undefined
 */
export type Complete<T> = {
	[P in keyof Required<T>]: Pick<T, P> extends Required<Pick<T, P>> ? T[P] : T[P] | undefined
}

/**
 * HACK: temporary
 */
export interface Registry {
	configDir: string
	machineId: string
	appVersion: string
	appBuild: string
	pkgInfo: string

	/**
	 * The disk cache library
	 * @type {DataCache}
	 * @access public
	 */
	cache: DataCache
	/**
	 * The core controls controller
	 * @type {ControlsController}
	 * @access public
	 */
	controls: ControlsController

	data: DataController
	/**
	 * The core database library
	 * @type {DataDatabase}
	 * @access public
	 */
	db: DataDatabase
	/**
	 * The core graphics controller
	 * @type {GraphicsController}
	 * @access public
	 */
	graphics: GraphicsController
	/**
	 * The core instance controller
	 * @type {InstanceController}
	 * @access public
	 */
	instance: any // InstanceController // TODO
	/**
	 * The core interface client
	 * @type {UIHandler}
	 * @access public
	 */
	io: UIHandler

	cloud: CloudController

	ui: UIController
	/**
	 * The logger
	 * @type {LogController}
	 * @access public
	 * @deprecated
	 */
	log: typeof LogController
	/**
	 * The logger
	 * @type {winston.Logger}
	 * @access public
	 */
	logger: winston.Logger
	/**
	 * The core page controller
	 * @type {PageController}
	 * @access public
	 */
	page: PageController
	/**
	 * The core page controller
	 * @type {GraphicsPreview}
	 * @access public
	 */
	preview: GraphicsPreview
	/**
	 * The core service controller
	 * @type {ServiceController}
	 * @access public
	 */
	services: ServiceController
	/**
	 * The core device controller
	 * @type {SurfaceController}
	 * @access public
	 */
	surfaces: SurfaceController
	/**
	 * The core user config manager
	 */
	userconfig: DataUserConfig

	/**
	 * The 'internal' module
	 */
	internalModule: InternalController

	/*
	 * Express Router for /int api endpoints
	 */
	api_router: express.Router

	exit(fromInternal: boolean, restart: boolean): void
}

export interface SocketClient<
	ListenEvents extends EventsMap = EventsMap,
	EmitEvents extends EventsMap = EventsMap,
	ReservedEvents extends EventsMap = {}
> extends Socket<ListenEvents, EmitEvents, ReservedEvents> {
	/**
	 * Adds the `listener` function as an event listener for `ev`.
	 *
	 * @param ev Name of the event
	 * @param listener Callback function
	 */
	onPromise<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
		ev: Ev,
		listener: ReservedOrUserListener<ReservedEvents, ListenEvents, Ev>
	): this
}

export type ButtonStyle = ButtonDrawStyleBase

export type SomeDrawStyle = PageButtonDrawStyle | ButtonDrawStyle
export interface PageButtonDrawStyle {
	style: 'pageup' | 'pagedown' | 'pagenum'
}

export interface ButtonDrawStyleBase {
	show_topbar: boolean | 'default' | undefined

	alignment: CompanionAlignment
	pngalignment: CompanionAlignment

	bgcolor: number
	color: number

	png64: string | null

	imageBuffers: ButtonDrawImageBuffer[]

	size: number | 'small' | 'large' | 'auto'
	text: string
	textExpression: boolean
}

export type BankStatus = 'error' | 'warning' | 'good'

export interface ButtonDrawStyle extends ButtonDrawStyleBase {
	style: 'button'
	pushed: boolean
	step_cycle: number | undefined
	bank_status: BankStatus | undefined
	action_running: boolean
	cloud: boolean
}

export interface ButtonDrawImageBuffer {
	buffer?: string | Buffer | Uint8Array
	x?: number
	y?: number
	width?: number
	height?: number
}

export interface ButtonRender {
	updated: number
	buffer: Buffer
	style?: any // TODO
}

export interface ActionInstance {
	id: string
	action: string
	instance: string
	options: Record<string, any>
	delay: number

	disabled?: boolean

	upgradeIndex?: number
}

export interface FeedbackInstance {
	id: string
	type: string
	instance_id: string
	options: Record<string, any>

	style?: Partial<CompanionFeedbackButtonStyleResult>

	disabled?: boolean

	upgradeIndex?: number
}

export interface TriggerEventInstance {
	id: string
	type: string
	enabled: boolean
	options: Record<string, any>
}

export interface VariableDefinition {
	label: string
	name: string
}

export interface RunActionExtras {
	controlId: string
	deviceid: string | undefined
	page: number | undefined
	bank: number | undefined
}
