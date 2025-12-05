export {};

declare module "./dots.mjs" {
	interface DotsFieldData {
		min: foundry.data.types.NumberFieldOptions | foundry.data.fields.NumberField;
		value: foundry.data.types.NumberFieldOptions | foundry.data.fields.NumberField;
		max: foundry.data.types.NumberFieldOptions | foundry.data.fields.NumberField;
	}

	interface DotsFieldInputData {
		/**
		 * The value of the dots field, or a plain number to be used as the value with default min and max.
		 */
		value?: number | { min: number; max: number; value: number };
		/** The minimum value of the dots field; overrides {@linkcode value.min} if present */
		min?: number;
		/** The maximum value of the dots field; overrides {@linkcode value.max} if present */
		max?: number;

		/**
		 * Fields for which an input should be generated.
		 * @defaultValue `value`
		 */
		fields?: Set<"min" | "value" | "max"> | Array<"min" | "value" | "max"> | string;
	}
}

export interface DotsData {
	min: number;
	value: number;
	max: number;
}
