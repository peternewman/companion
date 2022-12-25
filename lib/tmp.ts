import { Server, Socket } from 'socket.io'
import { EventsMap, ReservedOrUserEventNames, ReservedOrUserListener } from 'socket.io/dist/typed-events'

/**
 * HACK: temporary
 */
export interface Registry {
	appBuild: string
	appVersion: string
	machineId: string
	//

	io: SocketServerExt
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

export interface ButtonStyle {
	show_topbar: boolean | 'default' | undefined
}

export interface ButtonRender {
	updated: number
	buffer: Buffer
	style?: any // TODO
}
