import {
	CompanionInputFieldBase,
	CompanionInputFieldCheckbox,
	CompanionInputFieldColor,
	CompanionInputFieldCustomVariable,
	CompanionInputFieldDropdown,
	CompanionInputFieldMultiDropdown,
	CompanionInputFieldNumber,
	CompanionInputFieldStaticText,
	CompanionInputFieldTextInput,
} from '@companion-module/base'
import { EncodeIsVisible } from '@companion-module/base/dist/host-api/api'
import {
	UIInputFieldBase,
	UIInputFieldCheckbox,
	UIInputFieldColor,
	UIInputFieldCustomVariable,
	UIInputFieldDropdown,
	UIInputFieldMultiDropdown,
	UIInputFieldNumber,
	UIInputFieldStaticText,
	UIInputFieldTextInput,
} from '../Shared/InputFields.js'
import { Complete } from '../tmp'

function ReceiveInputFieldBase<T extends string>(
	type: T,
	field: EncodeIsVisible<CompanionInputFieldBase> & { width?: number },
	isConfig: boolean
): Complete<UIInputFieldBase<T>> {
	return {
		id: field.id,
		type: type,
		label: field.label,
		tooltip: field.tooltip,
		isVisibleFn: field.isVisibleFn,
		width: isConfig ? field.width ?? 12 : undefined,
	}
}

export function ReceiveInputFieldNumber(
	field: EncodeIsVisible<CompanionInputFieldNumber> & { width?: number },
	isConfig: boolean
): UIInputFieldNumber {
	return {
		...ReceiveInputFieldBase('number', field, isConfig),

		default: field.default,
		required: field.required,
		min: field.min,
		max: field.max,
		step: field.step,
		range: field.range,
	} satisfies Complete<UIInputFieldNumber>
}

export function ReceiveInputFieldStaticText(
	field: EncodeIsVisible<CompanionInputFieldStaticText> & { width?: number },
	isConfig: boolean
): UIInputFieldStaticText {
	return {
		...ReceiveInputFieldBase('static-text', field, isConfig),

		value: field.value,
	} satisfies Complete<UIInputFieldStaticText>
}

export function ReceiveInputFieldColor(
	field: EncodeIsVisible<CompanionInputFieldColor> & { width?: number },
	isConfig: boolean
): UIInputFieldColor {
	return {
		...ReceiveInputFieldBase('colorpicker', field, isConfig),

		default: field.default,
	} satisfies Complete<UIInputFieldColor>
}

export function ReceiveInputFieldCheckbox(
	field: EncodeIsVisible<CompanionInputFieldCheckbox> & { width?: number },
	isConfig: boolean
): UIInputFieldCheckbox {
	return {
		...ReceiveInputFieldBase('checkbox', field, isConfig),

		default: field.default,
	} satisfies Complete<UIInputFieldCheckbox>
}

export function ReceiveInputFieldTextInput(
	field: EncodeIsVisible<CompanionInputFieldTextInput> & { width?: number },
	isConfig: boolean
): UIInputFieldTextInput {
	return {
		...ReceiveInputFieldBase('textinput', field, isConfig),

		default: field.default,
		required: field.required,
		regex: field.regex,
		useVariables: field.useVariables,
		placeholder: undefined,
	} satisfies Complete<UIInputFieldTextInput>
}

export function ReceiveInputFieldCustomVariable(
	field: EncodeIsVisible<CompanionInputFieldCustomVariable> & { width?: number },
	isConfig: boolean
): UIInputFieldCustomVariable {
	return {
		...ReceiveInputFieldBase('custom-variable', field, isConfig),
	} satisfies Complete<UIInputFieldCustomVariable>
}

export function ReceiveInputFieldDropdown(
	field: EncodeIsVisible<CompanionInputFieldDropdown> & { width?: number },
	isConfig: boolean
): UIInputFieldDropdown {
	return {
		...ReceiveInputFieldBase('dropdown', field, isConfig),

		choices: field.choices,
		default: field.default,
		allowCustom: field.allowCustom,
		regex: field.regex,
		minChoicesForSearch: field.minChoicesForSearch,
	} satisfies Complete<UIInputFieldDropdown>
}

export function ReceiveInputFieldMultiDropdown(
	field: EncodeIsVisible<CompanionInputFieldMultiDropdown> & { width?: number },
	isConfig: boolean
): UIInputFieldMultiDropdown {
	return {
		...ReceiveInputFieldBase('multidropdown', field, isConfig),

		choices: field.choices,
		default: field.default,
		minChoicesForSearch: field.minChoicesForSearch,
		minSelection: field.minSelection,
		maxSelection: field.maxSelection,
	} satisfies Complete<UIInputFieldMultiDropdown>
}
