import type { ChildProcess } from 'child_process'
import EventEmitter from 'events'

export class RespawnMonitor extends EventEmitter {
	child: ChildProcess | undefined

	start(): void
	stop(cb?: () => void): void
}

export interface RespawnOptions {
	name: string
	env: Record<string, string>
	maxRestarts: number
	kill: number
	cwd: string
	fork: boolean
	stdio: string[]
}
export interface RespawnOptionsWithCommand extends RespawnOptions {
	command: string
}

function respawn(options: RespawnOptionsWithCommand): RespawnMonitor
function respawn(command: string[], options: RespawnOptions): RespawnMonitor

export default respawn
