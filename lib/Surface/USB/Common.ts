import type { SurfaceConfig, SurfaceDrawStyle, SurfaceInfo } from '../info'

export { SurfaceConfig, SurfaceDrawStyle, SurfaceInfo }

export class IpcWrapper {
	#id: string
	#devicePath: string

	constructor(id: string, devicePath: string) {
		this.#id = id
		this.#devicePath = devicePath
	}
	log(level: string, message: string): void {
		process.send!({ cmd: 'log', id: this.#id, device: this.#devicePath, level, message })
	}
	remove(): void {
		process.send!({ cmd: 'remove', id: this.#id, device: this.#devicePath })
	}
	click(key: number, pressed: boolean, pageOffset?: number): void {
		process.send!({ cmd: 'click', id: this.#id, device: this.#devicePath, key, pressed, pageOffset })
	}
	rotate(key: number, direction: boolean, pageOffset?: number): void {
		process.send!({ cmd: 'rotate', id: this.#id, device: this.#devicePath, key, direction, pageOffset })
	}
	xkeysSetVariable(name: string, value: number): void {
		process.send!({ cmd: 'xkeys-setVariable', id: this.#id, device: this.#devicePath, name, value })
	}
	xkeysSubscribePages(pageCount: number): void {
		process.send!({ cmd: 'xkeys-subscribePage', id: this.#id, device: this.#devicePath, pageCount })
	}
}

export interface SurfaceChild {
	quit(): void

	draw(key: number, buffer: Buffer | undefined, style: SurfaceDrawStyle): void

	clearDeck(): void

	drawColor?(page: number, key: number, color: number): void

	setConfig(config: SurfaceConfig, force?: boolean): void
}
