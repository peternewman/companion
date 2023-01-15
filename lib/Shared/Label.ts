/**
 * Make a label 'safe' according to the valid regex
 * @param {string} label Label to check
 * @returns 'safe' version of the label
 */
export function makeLabelSafe(label: string): string {
	return label.replace(/[^\w-]/gi, '_')
}

/**
 * Check if a label is valid
 * @param {string} label Label to check
 * @returns
 */
export function isLabelValid(label: string): boolean {
	if (!label || typeof label !== 'string') return false

	// Check a few reserved words
	if (label.toLowerCase() === 'internal' || label.toLowerCase() === 'companion' || label.toLowerCase() === 'custom')
		return false

	const safeLabel = makeLabelSafe(label)
	return safeLabel === label
}
