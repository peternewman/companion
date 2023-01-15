// TODO - should this return numbers?
export function GetStepIds(steps: Record<string, unknown>): string[] {
	return Object.keys(steps).sort((a, b) => Number(a) - Number(b))
}
