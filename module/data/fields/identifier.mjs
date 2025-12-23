// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { camelize } from "@helpers/utils.mjs";

/** @import { CurseborneTypeDataModel } from "@models/base.mjs"; */

export class IdentifierField extends foundry.data.fields.StringField {
	/** @inheritDoc */
	_validateType(value) {
		// Test whether the value adheres to the camelized identifier format:
		// - Must start with a letter
		// - May contain letters (capitalized and not) and numbers
		const matches = /^[a-zA-Z][a-zA-Z0-9]*$/.test(value);
		const camlized = camelize(value);
		if (value !== camlized || !matches) {
			throw new Error(`The value ${value} is not a valid identifier.`);
		}
		return super._validateType(value);
	}

	/** @inheritDoc */
	static get _defaults() {
		return Object.assign(super._defaults, {
			blank: false,
			nullable: true,
			required: true,
			initial: null,
		});
	}
}

/**
 * Mixes an {@linkcode IdentifierField} into a base schema.
 *
 * @param {typeof CurseborneTypeDataModel} Base - The base class to extend.
 */
export function IdentifierMixin(Base) {
	return class IdentifierModel extends Base {
		/** @inheritDoc */
		static metadata = Object.freeze({ ...super.metadata, hasIdentifier: true });

		/** @inheritDoc */
		static defineSchema() {
			return Object.assign(super.defineSchema(), {
				identifier: new IdentifierField(),
			});
		}

		/**
		 * Whether this model has an identifier stored in its source data.
		 *
		 * @type {boolean}
		 */
		get _hasIdentifier() {
			return !!this._source.identifier;
		}

		/**
		 * Prepare a valid identifier, deriving it from a provided name (falling back to the model's or its parent's name).
		 *
		 * @param {string} [name] - The name from which to derive the identifier
		 * @returns {string} - A valid and unique identifier
		 */
		_prepareIdentifier(name) {
			name ??= this.name ?? this.parent?.name ?? "";
			if (!name) throw new Error("Cannot prepare an identifier without a name");

			/**
			 * The systerm-internal identifier of this model, which can be set independently of its user-entered/facing name.
			 *
			 * @type {string}
			 */
			this.identifier = camelize(name);
			return this.identifier;
		}
	};
}

/**
 * Given an iterable of IdentifierModel instances, prepare their identifiers
 * and ensure that all identifiers are unique.
 * Priority is given to models that have a stored identifier as opposed to those
 * that derive a dynamic one from a user-facing name.
 *
 * @param {Iterable<IdentifierModel>} values - The iterable of models to prepare
 * @returns {Map<string, IdentifierModel>} A map of unique identifiers to their models
 */
export function prepareIdentifiers(values) {
	const models = new Map();
	// Separate models into those with a stored identifier (i.e. one already defined),
	// and those that require deriving one; if the former contain duplicates, handle the later encountered ones
	// as requiring a derived identifier, but with a higher priority than those that never had one to begin with.
	const toDerive = [];
	const duplicates = new Map();
	for (const model of values) {
		if (model._hasIdentifier) {
			if (models.has(model.identifier)) {
				// Create new array for identifier in duplicates map, or push model to existing array
				if (duplicates.has(model.identifier)) duplicates.get(model.identifier).push(model);
				else duplicates.set(model.identifier, [model]);
			} else {
				models.set(model.identifier, model);
			}
		} else toDerive.push(model);
	}

	// Derive (or adjust) identifiers for the remaining models
	for (const model of [...Object.values(duplicates).flat(), ...toDerive]) {
		const base = model._prepareIdentifier();
		let identifier = base;
		let i = 0;
		while (models.has(identifier)) {
			identifier = `${base}${++i}`;
		}
		model.identifier = identifier;
		models.set(identifier, model);
	}

	return models;
}
