import { HAlignment, VAlignment } from '../Graphics/Image.js'
import type { Registry, ButtonStyle } from '../tmp.js'
import { MAX_BUTTONS, MAX_BUTTONS_PER_ROW } from './Constants.js'

export function argb(
	a: string | number,
	r: string | number,
	g: string | number,
	b: string | number,
	base = 10
): number {
	a = parseInt(a as any, base)
	r = parseInt(r as any, base)
	g = parseInt(g as any, base)
	b = parseInt(b as any, base)

	if (isNaN(a) || isNaN(r) || isNaN(g) || isNaN(b)) return false as any // TODO HACK
	const rgbVal = rgb(r, g, b)
	if ((rgbVal as any) === false) return false as any // TODO HACK

	return (
		a * 0x1000000 + rgbVal // bitwise doesn't work because JS bitwise is working with 32bit signed int
	)
}

export function decimalToRgb(decimal: number): { red: number; green: number; blue: number } {
	return {
		red: (decimal >> 16) & 0xff,
		green: (decimal >> 8) & 0xff,
		blue: decimal & 0xff,
	}
}

export function rgb(r: number | string, g: number | string, b: number | string, base = 10): number {
	r = parseInt(r as any, base)
	g = parseInt(g as any, base)
	b = parseInt(b as any, base)

	if (isNaN(r) || isNaN(g) || isNaN(b)) return false as any // TODO HACK
	return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
}

export function rgbRev(dec: number): { r: number; g: number; b: number } {
	dec = Math.round(dec)

	return {
		r: (dec & 0xff0000) >> 16,
		g: (dec & 0x00ff00) >> 8,
		b: dec & 0x0000ff,
	}
}

export function delay(milliseconds: number): Promise<void> {
	return new Promise<void>((resolve) => {
		setTimeout(() => resolve(), milliseconds || 1)
	})
}

export const getTimestamp = () => {
	let d = new Date()
	let year = d.getFullYear().toString()
	let month = convert2Digit(d.getMonth() + 1)
	let day = convert2Digit(d.getDate())
	let hrs = convert2Digit(d.getHours())
	let mins = convert2Digit(d.getMinutes())
	let out = year + month + day + '-' + hrs + mins
	return out
}
export function convert2Digit(num: number): string | number {
	if (num < 10) {
		return '0' + num
	}
	return num
}

export function isFalsey(val: string): boolean {
	return (typeof val === 'string' && val.toLowerCase() == 'false') || val == '0'
}

export function parseLineParameters(line: string): Record<string, string | true | undefined> {
	const makeSafe = (index: number) => {
		return index === -1 ? Number.POSITIVE_INFINITY : index
	}

	let fragments = ['']
	let quotes = 0

	let i = 0
	while (i < line.length) {
		// Find the next characters of interest
		const spaceIndex = makeSafe(line.indexOf(' ', i))
		const slashIndex = makeSafe(line.indexOf('\\', i))
		const quoteIndex = makeSafe(line.indexOf('"', i))

		// Find which is closest
		let o = Math.min(spaceIndex, slashIndex, quoteIndex)
		if (!isFinite(o)) {
			// None were found, copy the remainder and stop
			const slice = line.substring(i)
			fragments[fragments.length - 1] += slice

			break
		} else {
			// copy the slice before this character
			const slice = line.substring(i, o)
			fragments[fragments.length - 1] += slice

			const c = line[o]
			if (c == '\\') {
				// If char is a slash, the character following it is of interest
				// Future: does this consider non \" chars?
				fragments[fragments.length - 1] += line[o + 1]

				i = o + 2
			} else {
				i = o + 1

				// Figure out what the char was
				if (c === '"') {
					quotes ^= 1
				} else if (!quotes && c === ' ') {
					fragments.push('')
				} else {
					fragments[fragments.length - 1] += c
				}
			}
		}
	}

	const res: Record<string, string | true | undefined> = {}

	for (const fragment of fragments) {
		const [key, value] = fragment.split('=', 2)
		res[key] = value === undefined ? true : value
	}

	return res
}

export function clamp(val: number, min: number, max: number): number {
	return Math.min(Math.max(val, min), max)
}

// From Global key number 0->31, to Device key f.ex 0->14
// 0-4 would be 0-4, but 5-7 would be -1
// and 8-12 would be 5-9
export function toDeviceKey(keysTotal: number, keysPerRow: number, key: number): number {
	if (keysTotal == MAX_BUTTONS) {
		return key
	}

	if (key % MAX_BUTTONS_PER_ROW > keysPerRow) {
		return -1
	}

	let row = Math.floor(key / MAX_BUTTONS_PER_ROW)
	let col = key % MAX_BUTTONS_PER_ROW

	if (row >= keysTotal / keysPerRow || col >= keysPerRow) {
		return -1
	}

	return row * keysPerRow + col
}

// From device key number to global key number
// Reverse of toDeviceKey
export function toGlobalKey(keysPerRow: number, key: number): number {
	let rows = Math.floor(key / keysPerRow)
	let col = key % keysPerRow

	return rows * MAX_BUTTONS_PER_ROW + col
}

/**
 * Rotate a 72x72 pixel buffer for the given orientation
 * @param {Buffer} buffer
 * @param {0 | 90 | -90 | 180} rotation
 * @returns
 */
export function rotateBuffer(buffer: Buffer, rotation: -90 | 180 | 90 | 0): Buffer {
	if (!buffer || buffer.length !== 15552) {
		// malformed input, so return it back
		return buffer
	}

	if (rotation === -90) {
		let buf = Buffer.alloc(15552)

		for (let x = 0; x < 72; ++x) {
			for (let y = 0; y < 72; ++y) {
				buf.writeUIntBE(buffer.readUIntBE(x * 72 * 3 + y * 3, 3), y * 72 * 3 + (71 - x) * 3, 3)
			}
		}
		buffer = buf
	}

	if (rotation === 180) {
		let buf = Buffer.alloc(15552)

		for (let x = 0; x < 72; ++x) {
			for (let y = 0; y < 72; ++y) {
				buf.writeUIntBE(buffer.readUIntBE(x * 72 * 3 + y * 3, 3), (71 - x) * 72 * 3 + (71 - y) * 3, 3)
			}
		}
		buffer = buf
	}

	if (rotation === 90) {
		let buf = Buffer.alloc(15552)

		for (let x = 0; x < 72; ++x) {
			for (let y = 0; y < 72; ++y) {
				buf.writeUIntBE(buffer.readUIntBE(x * 72 * 3 + y * 3, 3), (71 - y) * 72 * 3 + x * 3, 3)
			}
		}
		buffer = buf
	}

	return buffer
}

export async function showFatalError(title: string, message: string) {
	sendOverIpc({
		messageType: 'fatal-error',
		title,
		body: message,
	})

	console.error(message)
	process.exit(1)
}

export async function showErrorMessage(title: string, message: string) {
	sendOverIpc({
		messageType: 'show-error',
		title,
		body: message,
	})

	console.error(message)
}

export function sendOverIpc(data: any) {
	if (process.env.COMPANION_IPC_PARENT && process.send) {
		process.send(data)
	}
}

declare const __webpack_require__: any // HACK
/**
 * Whether the application is packaged with webpack
 */
export function isPackaged(): boolean {
	return typeof __webpack_require__ === 'function'
}

export interface Size {
	width: number
	height: number
}

/**
 * Get the size of the bitmap for a button
 */
export function GetButtonBitmapSize(registry: Registry, style: ButtonStyle): Size {
	let removeTopBar = !style.show_topbar
	if (style.show_topbar === 'default' || style.show_topbar === undefined) {
		removeTopBar = registry.userconfig.getKey('remove_topbar') === true
	}

	if (removeTopBar) {
		return {
			width: 72,
			height: 72,
		}
	} else {
		return {
			width: 72,
			height: 58,
		}
	}
}

export function SplitVariableId(variableId: string) {
	const splitIndex = variableId.indexOf(':')
	if (splitIndex === -1) throw new Error(`"${variableId}" is not a valid variable id`)

	const label = variableId.substring(0, splitIndex)
	const variable = variableId.substring(splitIndex + 1)

	return [label, variable]
}

export function ParseAlignment(alignment: string, validate = false): [HAlignment, VAlignment, string] {
	let [halign0, valign0] = alignment.toLowerCase().split(':', 2)

	let halign: HAlignment
	let valign: VAlignment

	if (halign0 !== 'left' && halign0 !== 'right' && halign0 !== 'center') {
		if (validate) throw new Error(`Invalid horizontal component: "${halign0}"`)

		halign = 'center'
	} else {
		halign = halign0
	}

	if (valign0 !== 'top' && valign0 !== 'bottom' && valign0 !== 'center') {
		if (validate) throw new Error(`Invalid vertical component: "${valign0}"`)

		valign = 'center'
	} else {
		valign = valign0
	}

	return [halign, valign, `${halign}:${valign}`]
}
