export const SYSTEM_ID = "curseborne";

/**
 * Converts a record of objects or a record of strings to a record of strings, localizing the values.
 *
 * @param {Record<string, object> | Record<string, string> | [string, string][] | [string, Record<string, string>][]>} obj - The object to convert
 * @param {object} [options] - Additional options for the conversion
 * @param {boolean} [options.localize=true] - Whether to localize the values
 * @param {string} [options.labelAttribute="label"] - The attribute to use as the label
 * @param {boolean} [options.sort=false] - Whether to sort the object by the label
 * @returns {Recod<string, string>} - The converted object
 */
export function toLabelObject(
	obj,
	{ localize = true, labelAttribute = "label", sort = false } = {},
) {
	let entries;
	if (Array.isArray(obj) && obj.every((entry) => Array.isArray(entry) && entry.length === 2))
		entries = obj;
	else if (foundry.utils.getType(obj) === "Object") entries = Object.entries(obj);

	const result = entries.map(([key, value]) => {
		if (foundry.utils.getType(value) === "string") {
			return [key, localize ? game.i18n.localize(value) : value];
		}
		if (foundry.utils.getType(value) === "Object") {
			return [key, localize ? game.i18n.localize(value[labelAttribute]) : value[labelAttribute]];
		}
		return [];
	});

	if (sort) result.sort((a, b) => a[1].localeCompare(b[1]));
	return Object.fromEntries(result);
}

/**
 * Returns a path to a file within the system's directory.
 *
 * @template {string} T
 * @param {T} path - The path to the file
 * @returns {`systems/${SYSTEM_ID}/${T}`} - The system path
 */
export function systemPath(path) {
	if (!path) throw new Error(`${SYSTEM_ID} | No path provided.`);
	return `systems/${SYSTEM_ID}/${path}`;
}

/**
 * Returns a path to a system template.
 *
 * @template {string} T
 * @param {T} path - The path to the template
 * @returns {`systems/${SYSTEM_ID}/templates/${T}.hbs`} - The system template path
 */
export function systemTemplate(path) {
	if (!path) throw new Error(`${SYSTEM_ID} | No path provided.`);
	return systemPath(`templates/${path}.hbs`);
}

export const requiredInteger = {
	required: true,
	nullable: false,
	integer: true,
};

/**
 * Register a sheet class for a document (+ type).
 *
 * @param {typeof foundry.abstract.Document} documentClass
 * @param {foundry.applications.api.DocumentSheetV2} sheetClass
 * @param {string | string[]} types
 * @param {object} [options]
 * @param {boolean} [options.makeDefault=true]
 * @returns {boolean}
 */
export function registerSystemSheet(documentClass, sheetClass, types = "", options = {}) {
	types = Array.isArray(types) ? types : [types];
	if (types.filter((t) => !!t).length) options.types = types;
	options.makeDefault ??= true;
	return foundry.applications.apps.DocumentSheetConfig.registerSheet(
		documentClass,
		SYSTEM_ID,
		sheetClass,
		options,
	);
}

/**
 * @template T
 * @param {T[]} array
 * @returns {Array<Exclude<T, null | undefined | 0 | "">>}
 */
export function sift(array) {
	return array.filter((item) => !!item);
}

/**
 * Generate a random ID, optionally ensuring it is not already present in a given collection.
 *
 * @see {@link foundry.utils.randomID}
 *
 * @param {number | RandomIDOptions} [options]
 * @param {Omit<RandomIDOptions, "length">} [_options]
 * @returns {string} - The generated ID
 */
export function randomID(options, _options = {}) {
	// Allow the first argument to be the length to maintain core API compatibility
	// If the first argument is a number, use it as the length and the second argument as options; otherwise use the first argument as options
	if (typeof options === "number") options = { length: options, ..._options };
	const { length = 16, collection } = options;
	if (!collection) return foundry.utils.randomID(length);

	const keys = new Set();
	if (collection instanceof foundry.utils.Collection || collection instanceof Map) {
		for (const key of collection.keys()) keys.add(key);
	} else if (Array.isArray(collection)) {
		for (const key of collection) keys.add(key);
	}

	// Generate IDs until one is found that is not in the collection
	let id;
	let i = 0;
	do {
		if (i++ > 999) throw new Error("Could not generate a unique ID.");
		id = foundry.utils.randomID(length);
	} while (keys.has(id));
	return id;
}

/**
 * Converts a string to be ID-safe.
 *
 * @template {string} T
 * @param {T} id - The string to convert
 * @returns {IdSafe<T>} - The converted string
 */
export function staticID(id) {
	if (id.length >= 16) return id.substring(0, 16);
	return id.padEnd(16, "0");
}

/**
 * Slugify a string, replacing spaces with nothing and converting the next word to start with a capital letter.
 *
 * @param {string} str - The string to slugify
 * @returns {string} - The slugified string
 */
export function camelize(str) {
	// Pre-slufigy using Foundry's method
	const slug = str.slugify({ lowercase: false, strict: true });

	// Remove '-' and capitalize the next letter
	const camelized = slug.replace(/-./g, (match) => match.charAt(1).toUpperCase());
	// Lowercase the first letter
	return camelized.charAt(0).toLowerCase() + camelized.slice(1);
}

/**
 * Localize/Format a string, optionally replacing variables.
 * Supports pluralization if the data contains a `_count` property.
 *
 * @param {string} stringId - The string ID to localize, or the base path for pluralization
 * @param {object} [data={}] - The data to replace in the string
 * @param {number} [data._count] - The count for pluralization
 * @param {Intl.PluralRulesOptions} [data._pluralRules] - Options for pluralization rules
 * @returns {string} - The localized/formatted string
 *
 * @see {@linkcode game.i18n.localize}
 * @see {@linkcode game.i18n.format}
 */
export function localize(stringId, { _count: count, _pluralRules: pluralOptions, ...data } = {}) {
	if (count === undefined) return game.i18n.format(stringId, data);

	// If a count is given, the stringId will be used as path to which the pluralization suffix is appended
	const pluralRules = new Intl.PluralRules(game.i18n.lang, pluralOptions);
	const pluralCategory = pluralRules.select(count);
	// Since languages might not have all plural forms, we need to find the first available one
	const possibleCategories = [pluralCategory, "other", "one"];
	const path = possibleCategories.reduce((foundPath, category) => {
		if (foundPath) return foundPath;
		const testPath = `${stringId}.${category}`;
		return game.i18n.has(testPath) ? testPath : null;
	});
	return game.i18n.format(path ?? `${stringId}.${pluralCategory}`, data);
}
