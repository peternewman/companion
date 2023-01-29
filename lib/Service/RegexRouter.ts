import { pathToRegexp, Key as PathKey } from 'path-to-regexp'

interface Route<TArgs extends any[], TRes> {
	regexp: RegExp
	handler: (match: RegExpExecArray, ...args: TArgs) => TRes
}

class RegexRouter<TArgs extends any[], TRes> {
	#defaultHandler: ((path: string, ...args: TArgs) => TRes) | undefined

	#routes: Route<TArgs, TRes>[] = []

	constructor(defaultHandler?: (path: string, ...args: TArgs) => TRes) {
		this.#defaultHandler = defaultHandler
	}

	processMessage(path: string, ...args: TArgs): TRes | undefined {
		for (const route of this.#routes) {
			const match = route.regexp.exec(path)
			if (match) {
				return route.handler(match, ...args)
			}
		}

		if (this.#defaultHandler) {
			return this.#defaultHandler(path, ...args)
		}

		return undefined
	}

	addRegex(regexp: RegExp, handler: (match: RegExpExecArray, ...args: TArgs) => TRes) {
		this.#routes.push({ regexp, handler })
	}

	addPath(path: string, handler: (values: Record<string, any>, ...args: TArgs) => TRes) {
		const keys: PathKey[] = []
		const regexp = pathToRegexp(path, keys)

		this.addRegex(regexp, (match, ...args) => {
			const values: Record<string, any> = {}
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i]
				values[key.name] = match[i + 1]
			}

			return handler(values, ...args)
		})
	}
}

export default RegexRouter
