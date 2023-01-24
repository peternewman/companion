import { CompanionAlignment, CompanionFeedbackButtonStyleResult } from '@companion-module/base'
import { Server, Socket } from 'socket.io'
import { EventsMap, ReservedOrUserEventNames, ReservedOrUserListener } from 'socket.io/dist/typed-events'
import type LogController from './Log/Controller'
import type ControlsController from './Controls/Controller'

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
	appBuild: string
	appVersion: string
	machineId: string
	//

	io: SocketServerExt

	log: typeof LogController

	controls: ControlsController
}

export interface SocketClient<
	ListenEvents extends EventsMap = EventsMap,
	EmitEvents extends EventsMap = EventsMap,
	ReservedEvents extends EventsMap = {}
> extends Socket<ListenEvents, EmitEvents, ReservedEvents> {
	a: null

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

export interface SocketServerExt extends Server {
	emitToRoom(room: string, ...args: any[]): void
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
