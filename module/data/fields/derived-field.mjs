// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

/**
 * A Mixin that marks another DataField as derived instead of persistently stored.
 *
 * @template {typeof foundry.data.fields.DataField} T
 * @param {T} Base - The base data field class which should be extended.
 */
export function DerivedFieldMixin(Base) {
	return class DerivedField extends Base {
		constructor(field, options, context) {
			super(field, options, context);
			/**
			 * A function which derives the value of this field from the parent data object.
			 *
			 * @type {(model: foundry.abstract.DataModel) => void}
			 */
			this._deriver = options.deriver;
		}

		/** @inheritDoc */
		_cast(value) {
			return undefined;
		}

		/** @inheritDoc */
		toObject(value) {
			return undefined;
		}

		initialize(value, model, options) {
			return () => this._deriver(model);
		}
	};
}
