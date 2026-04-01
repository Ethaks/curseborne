// SPDX-FileCopyrightText: 2026 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { localize } from "./utils.mjs";

/**
 * A specialised Set subclass for handling sets of strings.
 */
export class StringSet extends Set {
	/**
	 * Create a new StringSet from an input value, which can be a string or an array/Set of strings.
	 *
	 * @param {string | string[] | Set<string>} value - The input value to create the StringSet from
	 * @return {StringSet} The created StringSet instance
	 */
	static create(value, { separator = " " } = {}) {
		if (typeof value === "string") {
			return new this(
				value
					.split(separator)
					.map((s) => s.trim())
					.filter(Boolean),
			);
		} else if (value instanceof Set || Array.isArray(value)) {
			return new this(value.map((s) => `${s}`.trim()).filter(Boolean));
		}

		console.warn(`StringSet.create: Unsupported value type ${typeof value}`, value);
		return new this();
	}

	/** @inheritDoc */
	toString(separator = " ") {
		return [...this].join(separator);
	}

	/**
	 * Format the StringSet as a(n optionally localized) list.
	 *
	 * @param {object} [options] - Formatting options
	 * @param {boolean} [options.localize=true] - Whether to localize the strings in the set before formatting
	 * @param {string} [options.style] - The list style to use (e.g. "long", "short", "narrow")
	 * @param {string} [options.type] - The list type to use (e.g. "conjunction", "disjunction", "unit")
	 * @returns {string} The formatted list string
	 */
	toList({ localize: doLocalize = true, style, type } = {}) {
		const formatter = game.i18n.getListFormatter({ style, type });
		const list = this.map((s) => (doLocalize ? localize(s) : s));
		return formatter.format(list);
	}
}
