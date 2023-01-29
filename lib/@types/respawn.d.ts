import type { ChildProcess } from 'child_process'

declare module 'respawn' {
	export default class Respawn {
		child: ChildProcess | undefined
	}
}
