// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

/**
 * A field that initializes a source object into a {@link foundry.utils.Collection}.
 *
 * Data is expected to be stored as an object where the keys are the `indexField` of the collection.
 * Arrays of data are cast to objects where the `indexField` is the key.
 * Updating individual elements of the collection is possible by updating the specific key, relying on Foundry's usual
 * differential data update behavior.
 */
export class CollectionField extends foundry.data.fields.TypedObjectField {
	/** @override */
	static get _defaults() {
		return foundry.utils.mergeObject(super._defaults, {
			indexField: "id",
		});
	}

	/** @override */
	initialize(value, model, options = {}) {
		const index = this.indexField;
		const collection = new foundry.utils.Collection();
		const initialized = super.initialize(value, model, options);
		for (const [k, v] of Object.entries(initialized)) {
			v[index] = k;
			collection.set(k, v);
		}
		return collection;
	}
}
