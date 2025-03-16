import { DotsInput } from "../../applications/components/dots-input.mjs";

/**
 * A field for tracking a value and a maximum value.
 * The maximum value is primarily part of the schema to allow for active effect modifications
 */
export class DotsField extends foundry.data.fields.SchemaField {
	/**
	 * @param {PipFieldData} fieldOptions - The field field
	 * @param {foundry.data.DataFieldOptions} options - The field options
	 * @param {foundry.data.fields.DataFieldContext} context - The field context
	 */
	constructor(fields, options, context = {}) {
		for (const key of ["value", "max"]) {
			if (!(fields[key] instanceof foundry.data.fields.DataField)) {
				// Pipfields are always integers
				const defaultOptions = {
					required: false,
					nullable: false,
					integer: true,
					min: 0,
				};
				// If the given field is currently a number, use it to set the initial value; fall back to 0 for value and 5 for max
				if (typeof fields[key] === "number") {
					defaultOptions.initial = fields[key];
					defaultOptions.min = fields[key];
					defaultOptions.max = fields[key];
				} else if (fields[key] === undefined) {
					defaultOptions.initial = key === "value" ? 0 : 5;
				}
				fields[key] = new foundry.data.fields.NumberField({
					...defaultOptions,
					...fields[key],
				});
			}
		}
		super(fields, options, context);
	}

	_toInput(config) {
		if (config.name === this.fieldPath) config.name = `${this.fieldPath}.value`;
		return DotsInput.create(config);
	}
}
