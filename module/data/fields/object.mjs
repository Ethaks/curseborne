// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

export class ValidatedObjectField extends foundry.data.fields.ObjectField {
	constructor(model, options, context = {}) {
		if (!(model instanceof foundry.data.fields.DataField)) {
			throw new Error("ValidatedObjectField must have a DataField as its contained element");
		}
		super(options, context);

		/**
		 * The embedded DataField definition which is contained in this field.
		 * @type {DataField}
		 */
		this.model = model;
		model.parent = this;
		model.name = this.name;
	}

	/** @inheritdoc */
	_cleanType(value, options) {
		for (const [k, v] of Object.entries(value)) {
			if (options.partial && k.startsWith("-=")) value[k] = null;
			else value[k] = this.model.clean(v, options);
		}
		return value;
	}

	/** @override */
	_validateType(value, options = {}) {
		if (foundry.utils.getType(value) !== "Object") throw new Error("must be an Object");
		const errors = this._validateValues(value, options);
		if (!foundry.utils.isEmpty(errors))
			throw new foundry.data.validation.ModelValidationError(errors);
	}

	/**
	 * Validate each value of the object.
	 * @param {object} value     The object to validate.
	 * @param {object} options   Validation options.
	 * @returns {Object<Error>}  An object of value-specific errors by key.
	 */
	_validateValues(value, options) {
		const errors = {};
		for (const [k, v] of Object.entries(value)) {
			if (options.partial && k.startsWith("-=")) continue;
			const error = this.model.validate(v, options);
			if (error) errors[k] = error;
		}
		return errors;
	}

	/** @inheritdoc */
	_getField(path) {
		if (path.length === 0) return this;
		if (path.length === 1) return this.model;
		path.shift();
		return this.model._getField(path);
	}
}

/**
 * A field that initializes a source object into a {@link foundry.utils.Collection}.
 *
 * Data is expected to be stored as an object where the keys are the `indexField` of the collection.
 * Arrays of data are cast to objects where the `indexField` is the key.
 * Updating individual elements of the collection is possible by updating the specific key, relying on Foundry's usual
 * differential data update behavior.
 */
export class CollectionField extends ValidatedObjectField {
	/** @override */
	static get _defaults() {
		return foundry.utils.mergeObject(super._defaults, {
			indexField: "id",
		});
	}

	/** @inheritDoc */
	constructor(model, options = {}, context = {}) {
		if (!model.fields[options.indexField || CollectionField._defaults.indexField]) {
			throw new Error("CollectionField must have an indexField that is a field of the model");
		}
		super(model, options, context);
	}

	/** @inheritDoc */
	_validateType(value, options = {}) {
		const isObject = foundry.utils.getType(value) === "Object";
		const isArray = Array.isArray(value);
		if (!isObject && !isArray) throw new Error("must be an Object or Array");
		const errors = this._validateValues(value, options);
		if (!foundry.utils.isEmpty(errors))
			throw new foundry.data.validation.DataModelValidationError(errors);
	}

	/** @override */
	_cast(value) {
		const getIndex = (v, k) => {
			// If k begins with -=, this is a deletion operation and the value should be null
			if (k?.startsWith("-=")) return k;
			// If no index/ID is present, generate one from the initial value or the key
			if (!v[this.indexField]) {
				if (k) v[this.indexField] = k;
				else v[this.indexField] = this.model.getField(this.indexField).initial?.();
			}
			return v[this.indexField].slugify({ strict: true, lowercase: false });
		};
		if (Array.isArray(value))
			return Object.fromEntries(Object.entries(value).map(([k, v]) => [getIndex(v, k), v]));
		if (value instanceof foundry.utils.Collection)
			return Object.fromEntries(value.map((v) => [getIndex(v), v]));
		if (foundry.utils.getType(value) === "Object")
			return Object.fromEntries(Object.entries(value).map(([k, v]) => [getIndex(v, k), v]));
		return super._cast(value);
	}

	/** @override */
	initialize(value, model, options = {}) {
		const index = this.indexField;
		const collection = new foundry.utils.Collection();
		for (const v of Object.values(value)) {
			collection.set(v[index], this.model.initialize(v, model, options));
		}
		return collection;
	}
}
