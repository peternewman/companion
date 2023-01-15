export function CreateBankControlId(page: number, bank: number) {
	return `bank:${page}-${bank}`
}

export function CreateTriggerControlId(triggerId: string): string {
	return `trigger:${triggerId}`
}

export interface ParsedTriggerId {
	type: 'trigger'
	trigger: string
}
export interface ParsedBankId {
	type: 'bank'
	page: number
	bank: number
}

export function ParseControlId(controlId: string): ParsedTriggerId | ParsedBankId | undefined {
	if (typeof controlId === 'string') {
		const match = controlId.match(/^bank:(\d+)-(\d+)$/)
		if (match) {
			return {
				type: 'bank',
				page: Number(match[1]),
				bank: Number(match[2]),
			}
		}

		const match2 = controlId.match(/^trigger:(.*)$/)
		if (match2) {
			return {
				type: 'trigger',
				trigger: match2[1],
			}
		}
	}

	return undefined
}
