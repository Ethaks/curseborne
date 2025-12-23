// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { DotsInput } from "../../applications/components/dots-input.mjs";

/** @import { DataFieldOptions, DataFieldContext } from "@common/data/_types.mjs"; */
/** @import { DotsData } from "./dots"; */

/**
 * A field for tracking a value and a maximum value.
 * The maximum value is primarily part of the schema to allow for active effect modifications
 */
export class DotsField extends foundry.data.fields.SchemaField {
	/**
	 * @param {Partial<DotsFieldData>} fields - Inner data fields or option partials for the required inner fields
	 * @param {DataFieldOptions} options - The field options
	 * @param {DataFieldContext} context - The field context
	 */
	constructor(fields, options, context = {}) {
		for (const key of ["min", "value", "max"]) {
			if (!(fields[key] instanceof foundry.data.fields.DataField)) {
				// Pipfields are always integers
				const defaultOptions = {
					required: true,
					nullable: false,
					integer: true,
					min: 0,
				};
				// If the given field is currently a number, use it to set the initial value; fall back to 0 for value and 5 for max
				if (typeof fields[key] === "number") {
					defaultOptions.initial = fields[key];
					defaultOptions.min = fields[key];
					defaultOptions.max = fields[key];
				} else if (typeof fields[key] === "object" && fields[key] !== null) {
					// If it is an object, merge it with the default options
					Object.assign(defaultOptions, fields[key]);
				} else if (fields[key] === undefined) {
					defaultOptions.initial = { min: 0, value: 0, max: 5 }[key];
				}
				fields[key] = new foundry.data.fields.NumberField({
					...defaultOptions,
					...fields[key],
				});
			}
		}
		super(fields, options, context);
	}

	/** @inheritDoc */
	toFormGroup(groupConfig = {}, inputConfig = {}) {
		// HACK: Since DotsField might render min/max fields as form groups, they need the rootId for linking labels
		inputConfig.rootId = groupConfig.rootId;
		return super.toFormGroup(groupConfig, inputConfig);
	}

	/**
	 * @inheritDoc
	 * @param {foundry.data.types.FormInputConfig & DotsFieldInputData} config
	 * @returns {HTMLElement | HTMLCollection}
	 */
	_toInput(config) {
		// Merge `config.value` (which can be a plain number or a full DotsData object) and `config.{min,max}` overrides into a single object
		config.value =
			typeof config.value === "number" ? { value: config.value } : (config.value ?? {});
		config.value.min = config.min ?? config.value.min;
		config.value.max = config.max ?? config.value.max;

		// Ensure `config.fields` is a Set for easier checking; default to just "value"
		if (!config.fields) config.fields = new Set(["value"]);
		else if (Array.isArray(config.fields)) config.fields = new Set(config.fields);
		else if (typeof config.fields === "string")
			config.fields = new Set([...config.fields.split(" ")]);
		if (config.fields.size === 0)
			throw new Error(`Cannot create DotsField input for ${config.name} with no fields requested`);

		const dotsConfig = { ...config, ...config.value, name: `${config.name}.value` };
		const dotsInput =
			config.value.value >= 0
				? DotsInput.create(dotsConfig)
				: this.fields.value.toInput(dotsConfig);

		// If only the value is to be shown, use a simple DotsInput
		if (config.fields.size === 1 && config.fields.has("value")) {
			return dotsInput;
		}

		// Otherwise, show the DotsInput for the value, _and_ inputs for min and/or max, attaching labels and hints as tooltips
		if (config.fields.size > 1) {
			// BUG: Foundry v13 requires a HTMLCollection and _cannot_ handle an array of inputs
			// TODO: Switch to HTMLElement[] once v13 support is dropped
			const div = document.createElement("div");

			// Lead with dots input
			if (config.fields.has("value")) {
				div.appendChild(dotsInput);
			}

			// Then add min/max inputs
			for (const bound of /** @type {const} */ (["min", "max"])) {
				if (config.fields.has(bound)) {
					const field = this.fields[bound];
					const label =
						field.label || { min: "CURSEBORNE.Minimum", max: "CURSEBORNE.Maximum" }[bound];
					const input = field.toFormGroup(
						{
							localize: config.localize ?? true,
							rootId: config.rootId,
							classes: ["label-top"],
							label,
						},
						{
							type: "number",
							...config,
							name: `${config.name}.${bound}`,
							value: config.value?.[bound],
						},
					);

					div.appendChild(input);
				}
			}

			// BUG: Foundry v13 incorrectly calls `entries()` on the returned HTMLCollection, so we need to fake it here
			div.children.entries = function* () {
				for (let i = 0; i < this.length; i++) {
					yield [i, this[i]];
				}
			};
			return div.children;
		}
	}
}
