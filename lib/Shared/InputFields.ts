import { CompanionOptionValues, DropdownChoice, DropdownChoiceId } from '@companion-module/base'

export type SomeUIInputField =
	| UIInputFieldTextInput
	| UIInputFieldCheckbox
	| UIInputFieldNumber
	| UIInputFieldDropdown
	| UIInputFieldMultiDropdown
	| UIInputFieldColor
	// Internal only
	| UIInputFieldInternalPage
	| UIInputFieldInternalBank
	| UIInputFieldInternalSurfaceSerial
	| UIInputFieldInternalVariable
	| UIInputFieldInternalCustomVariable
	| UIInputFieldInternalTrigger
	| UIInputFieldInternalInstance

export function serializeIsVisibleFn(fn: (options: CompanionOptionValues) => boolean): string {
	return fn.toString()
}

/**
 * The common properties for an input field
 */
export interface UIInputFieldBase<Type> {
	/** The unique id of this input field within the input group */
	id: string
	/** The type of this input field */
	type: Type
	/** The label of the field */
	label: string
	/** A hover tooltip for this field */
	tooltip?: string
	/**
	 * A function called to check whether this input should be visible, based on the current options selections within the input group
	 *
	 * Note: This function must not depend on anything outside of its scope. If it does it will fail to compile and will be skipped.
	 */
	isVisibleFn?: string
}

export interface UIInputFieldTextInput extends UIInputFieldBase<'textinput'> {
	/**
	 * The default text value
	 */
	default?: string
	/**
	 * Whether a value is required
	 * Note: values may not conform to this, it is a visual hint only
	 */
	required?: boolean
	/**
	 * A regex to use to inform the user if the current input is valid.
	 * Note: values may not conform to this, it is a visual hint only
	 */
	regex?: string
	/**
	 * Whether to suggest variables to the user
	 */
	useVariables?: boolean

	placeholder?: string
}

export interface UIInputFieldCheckbox extends UIInputFieldBase<'checkbox'> {
	/** The default value */
	default: boolean
}

export interface UIInputFieldNumber extends UIInputFieldBase<'number'> {
	/** The default value */
	default: number

	/**
	 * Whether a value is required
	 * Note: values may not conform to this, it is a visual hint only
	 */
	required?: boolean
	/**
	 * The minimum value to allow
	 * Note: values may not conform to this, it is a visual hint only
	 */
	min?: number
	/**
	 * The maximum value to allow
	 * Note: values may not conform to this, it is a visual hint only
	 */
	max?: number

	/** The stepping of the arrows */
	step?: number

	/** Whether to show a slider for the input */
	range?: boolean
}

export interface UIInputFieldDropdown extends UIInputFieldBase<'dropdown'> {
	/** The possible choices */
	choices: DropdownChoice[]

	/** The default selected value */
	default: DropdownChoiceId

	/** Allow custom values to be defined by the user */
	allowCustom?: boolean
	/** Check custom value against regex */
	regex?: string

	/** The minimum number of entries the dropdown must have before it allows searching */
	minChoicesForSearch?: number
}

export interface UIInputFieldMultiDropdown extends UIInputFieldBase<'multidropdown'> {
	/** The possible choices */
	choices: DropdownChoice[]

	/** The default selected values */
	default: DropdownChoiceId[]

	/** The minimum number of entries the dropdown must have before it allows searching */
	minChoicesForSearch?: number

	/** The minimum number of selected values */
	minSelection?: number
	/** The maximum number of selected values */
	maxSelection?: number
}

export interface UIInputFieldColor extends UIInputFieldBase<'colorpicker'> {
	/**
	 * The default color value to set when creating this action/feedback/instance
	 */
	default: number
}

export interface UIInputFieldInternalPage extends UIInputFieldBase<'internal:page'> {
	/** The default value */
	default: number

	includeDirection?: boolean
}

export interface UIInputFieldInternalBank extends UIInputFieldBase<'internal:bank'> {
	/** The default value */
	default: number

	// includeDirection?: boolean
}

export interface UIInputFieldInternalSurfaceSerial extends UIInputFieldBase<'internal:surface_serial'> {
	/** The default value */
	default?: 'self'

	includeSelf?: boolean
}

export interface UIInputFieldInternalVariable extends UIInputFieldBase<'internal:variable'> {}

export interface UIInputFieldInternalCustomVariable extends UIInputFieldBase<'internal:custom_variable'> {}

export interface UIInputFieldInternalTrigger extends UIInputFieldBase<'internal:trigger'> {}

export interface UIInputFieldInternalInstance extends UIInputFieldBase<'internal:instance_id'> {
	includeAll?: boolean

	default?: 'all'
}
