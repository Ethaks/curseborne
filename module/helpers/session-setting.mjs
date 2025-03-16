import { SYSTEM_ID } from "./utils.mjs";

/**
 * A utility class that abstracts away `sessionStorage`, allowing storing serializable data
 * and deserializing its JSON into a given schema.
 *
 * @template T - The type of the value to store.
 */
export class SessionSetting {
	/**
	 * @param {string} key - The key used store/retrieve values in `sessionStorage`.
	 * @param {object} options - Additional options for the setting.
	 * @param {foundry.data.fields.DataField} [options.schema] - The schema with which values will be parsed.
	 */
	constructor(key, { schema } = {}) {
		this.#key = key;
		this.#schema = schema;
	}

	/** @type {string} */
	#key;
	/** @type {foundry.data.fields.DataField | undefined} */
	#schema;

	/**
	 * The namespace used by this class to store data in `sessionStorage`.
	 *
	 * @satisfies {string}
	 */
	static namespace = SYSTEM_ID;

	/**
	 * Retrieve a value from `sessionStorage` and optionally parse it into a schema.
	 *
	 * @param {string} key - The key to retrieve from `sessionStorage`.
	 * @param {SimpleSchema} [schema] - The schema to parse the value into.
	 * @returns {T} - The value stored in `sessionStorage` under the given key.
	 */
	static get(key, { schema } = {}) {
		const value = sessionStorage.getItem(this.#assertKey(key));
		const parsed = value ? JSON.parse(value) : null;

		// If no schema is provided, return the parsed value as is
		if (!schema) return parsed;

		// If a schema is given, clean the parsed value and return it
		return schema.clean(parsed);
	}

	/**
	 * Set a value in `sessionStorage`, optionally parsing it into a schema.
	 *
	 * @param {string} key - The key to store in `sessionStorage`.
	 * @param {any} value - The value to store in `sessionStorage`.
	 */
	static set(key, value, { schema } = {}) {
		if (schema) value = schema.clean(value);
		sessionStorage.setItem(this.#assertKey(key), JSON.stringify(value));
	}

	/**
	 * Namespaces a given key using {@link SessionSetting.namespace}.
	 *
	 * @returns {string} - The namespaced key.
	 */
	static #assertKey(key) {
		if (!key) throw new Error("A key must be provided");
		key = `${this.namespace}.${key}`;
		return key;
	}

	/**
	 * Retrieve the value belonging to a previously configured session setting.
	 *
	 * @returns {T} - The value stored in `sessionStorage` under the key of this setting.
	 */
	get() {
		return SessionSetting.get(this.#key, { schema: this.#schema });
	}

	/**
	 * Set the value belonging to a previously configured session setting.
	 *
	 * @param {T} value - The value to store in `sessionStorage` under the key of this setting.
	 */
	set(value) {
		SessionSetting.set(this.#key, value, { schema: this.#schema });
	}
}
