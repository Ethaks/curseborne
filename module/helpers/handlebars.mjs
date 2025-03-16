import { DotsField } from "../data/fields/dots.mjs";

/** @import { FormGroupConfig } from "../../foundry/common/data/_types.mjs" */

export class CurseborneHandlebarsHelpers {
	static registerHelpers() {
		Handlebars.registerHelper({
			"curse-formGroup": this.formGroup,
			"curse-formInput": this.formInput,
		});
	}

	/**
	 * Prepare a config object for a form group or input field.
	 *
	 * @param {foundry.data.fields.DataField} field - The field to prepare the options for
	 * @param {FormGroupConfig} defaultOptions - Default options for the form group; can be overriden through options.hash
	 * @param {object} options - Additional options for the form group
	 * @returns {CurseFormGroupConfig} - The prepared options
	 */
	static _prepareOptions(field, defaultOptions, options) {
		// If options are null, they are the second argument
		if (options === null) {
			options = defaultOptions;
			defaultOptions = {};
		}

		/** @type {CurseFormGroupConfig} */
		const config = foundry.utils.mergeObject(
			{ isEditMode: null, source: null, labelColon: false, span: false },
			{ ...defaultOptions, ...options.hash },
			{ inplace: false },
		);

		config.editable ??= config.isEditMode !== false;
		config.disabled ??= !config.editable;

		/**
		 * Retrieve a property for a given path; use the source if the inpurt is editable, or the model to get
		 * a derived valuue when not. Fall back to the other if the preferred source is not available.
		 *
		 * @param {string} path - The path to retrieve the property for
		 * @returns {any} - The property value
		 */
		const getProperty = (path) => {
			const source = config.editable
				? (config.source ?? config.model)
				: (config.model ?? config.source);
			if (!source) return null;
			return foundry.utils.getProperty(source, path);
		};

		// TODO: Still needed?
		if (field instanceof DotsField) {
			config.name = `${field.fieldPath}.value`;
		} else {
			config.name ??= field.fieldPath;
		}

		// If a model is given, retrieve the value from the model
		if (config.model || config.source) {
			if (field instanceof DotsField) {
				// Derive a PipField's max from the model, not the field
				config.max ??= getProperty(`${field.fieldPath}.max`);
			}
			// If edit mode is given and true, and source data is available, use that instead of the derived value
			config.value ??= getProperty(config.name);
		}

		return config;
	}

	/**
	 * Create a form group for a field, expanding on Foundry's provided helper.
	 *
	 * @param {foundry.data.fields.DataField} field - The field to create the form group for
	 * @param {object} defaultOptions - Default options for the form group; can be overriden through options.hash
	 * @param {object} options - Additional options for the form group
	 * @returns {HTMLElement} - The form group element
	 */
	static formGroup(field, defaultOptions = {}, options = null) {
		// If options are null, they are the second argument
		if (options === null) {
			options = defaultOptions;
			defaultOptions = {};
		}

		// Added options
		let {
			img,
			icon,
			isEditMode = null,
			editable,
			model,
			source = null,
			labelColon = false,
			span = false,
		} = { ...defaultOptions, ...options.hash };

		editable ??= isEditMode !== false;

		const { classes, label, hint, rootId, stacked, units, widget, ...inputConfig } = {
			...defaultOptions,
			...options.hash,
		};

		// TODO: Still needed?
		if (field instanceof DotsField) {
			inputConfig.name = `${field.fieldPath}.value`;
		} else {
			inputConfig.name ??= field.fieldPath;
		}

		const groupConfig = {
			label,
			hint,
			rootId,
			stacked,
			widget,
			localize: inputConfig.localize,
			units,
			classes: typeof classes === "string" ? classes.split(" ") : [],
		};

		// Move all options beginning with `data-` into the group's dataset
		for (const [key, value] of Object.entries(inputConfig)) {
			if (key.startsWith("data-")) {
				groupConfig.dataset ??= {};
				groupConfig.dataset[key.slice(5)] = value;
				delete inputConfig[key];
			}
		}

		// If a model is given, retrieve the value from the model
		if (model) {
			if (field instanceof DotsField) {
				// Derive a PipField's max from the model, not the field
				inputConfig.max = foundry.utils.getProperty(model ?? source, `${field.fieldPath}.max`);
			}
			// If edit mode is given and true, and source data is available, use that instead of the derived value
			if (isEditMode === true && source !== null) {
				inputConfig.value ??= foundry.utils.getProperty(source, inputConfig.name);
			} else {
				inputConfig.value ??= foundry.utils.getProperty(model, inputConfig.name);
			}
		}

		// Disable input field completely to avoid submission for non-editable fields
		if (editable === false) inputConfig.disabled = true;

		const group = field.toFormGroup(groupConfig, inputConfig);

		// Insert icon element into label element before text content
		if (icon) {
			const iconEl = document.createElement("i");
			iconEl.classList.add("fa-solid", ...(Array.isArray(icon) ? icon : [icon]));
			group.querySelector("label").prepend(iconEl);
		} else if (img) {
			const imgEl = document.createElement("curse-icon");
			imgEl.src = img;
			group.querySelector("label").prepend(imgEl);
		}

		// Use a span element instead of an input
		if (editable === false && span) {
			const input = group.querySelector(".form-fields > input");
			if (input) {
				const span = document.createElement("span");
				span.innerHTML = input.value;
				input.replaceWith(span);
			}
		}

		// Apply group dataset
		if (groupConfig.dataset) {
			for (const [key, value] of Object.entries(groupConfig.dataset)) {
				group.dataset[key] = value;
			}
		}

		if (labelColon) {
			group.querySelector("label").innerText += ":";
		}

		return new Handlebars.SafeString(group.outerHTML);
	}

	static formInput(field, defaultOptions, options) {
		const config = CurseborneHandlebarsHelpers._prepareOptions(field, defaultOptions, options);

		if (config.dataset?.action === "updateEmbedded") {
			config.name = "";
		}

		let element;

		// Use a span element instead of an input
		if (config.editable === false && config.span) {
			element = document.createElement("span");
			element.innerHTML = config.value;
		} else {
			element = field.toInput(config);
		}

		if (config.dataset) {
			for (const [key, value] of Object.entries(config.dataset)) {
				element.dataset[key] = value;
			}
		}
		if (config.classes) element.classList.add(...config.classes.split(" "));
		if (config.rootId) element.id = `${config.rootId}-${field.fieldPath}`;

		return new Handlebars.SafeString(element.outerHTML);
	}
}
