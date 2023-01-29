import EventEmitter from 'eventemitter3'
import { ButtonDrawStyle, SocketClient } from '../tmp'

export interface SurfaceInfo {
	type: string
	devicepath: string
	configFields: Array<keyof SurfaceConfig>
	keysPerRow: number
	keysTotal: number
	deviceId: string
	// serialnumber: string
	location: string
}

export type SurfaceConfig = Partial<{
	brightness: number
	rotation: 0 | 90 | 180 | -90

	emulator_control_enable: boolean
	emulator_prompt_fullscreen: boolean
}>

export type ISurfaceEvents = {
	click: [key: number, pressed: boolean, pageOffset?: number]
	rotate: [key: number, direction: boolean, pageOffset?: number]
	remove: []

	'xkeys-subscribePage': [pageCount: number]
	'xkeys-setVariable': [name: string, value: number]
}

export type SurfaceDrawStyle = 'pageup' | 'pagedown' | 'pagenum' | ButtonDrawStyle | undefined

export interface ISurface extends EventEmitter<ISurfaceEvents> {
	info: SurfaceInfo

	quit(): void

	draw(key: number, buffer: Buffer | undefined, style: SurfaceDrawStyle): void

	clearDeck(): void

	setConfig(config: SurfaceConfig, force?: boolean): void

	setBrightness?(value: number): void

	xkeysDraw?(pageOffset: number, bank: number, bgcolor: number): void

	setupClient?(client: SocketClient): void
}
