export class IdentifierField extends foundry.data.fields.StringField {
	/** @inheritDoc */
	_validateType(value) {
		// Test whether the value adheres to the camlized identifier format:
		// - Must start with a letter
		// - May contain letters (capitalized and not) and numbers
		const matches = /^[a-zA-Z][a-zA-Z0-9]*$/.test(value);
		if (!matches) throw new Error(`The value ${value} is not a valid identifier.`);
	}
}
