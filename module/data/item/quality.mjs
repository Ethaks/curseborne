import { CollectionField } from "@models/fields/object.mjs";
import { CurseborneItemBase } from "./base.mjs";
import { Complication, Enhancement } from "@models/modifiers.mjs";

export class AdversaryQuality extends CurseborneItemBase {
	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		const schema = super.defineSchema();
		schema.enhancements = new CollectionField(new fields.EmbeddedDataField(Enhancement));
		schema.complications = new CollectionField(new fields.EmbeddedDataField(Complication));
		return schema;
	}
}
