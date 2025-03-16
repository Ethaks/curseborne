export {};

declare module "./dots.mjs" {
	interface DotsFieldData {
		value: foundry.data.fields.NumberFieldOptions | foundry.data.fields.NumberField;
		max: foundry.data.fields.NumberFieldOptions | foundry.data.fields.NumberField;
	}
}

export interface DotsData {
	value: number;
	max: number;
}
