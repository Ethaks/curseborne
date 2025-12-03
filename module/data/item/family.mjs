import { Path } from "./path.mjs";

export class Family extends Path {
	/** @inheritDoc */
	static metadata = Object.freeze({
		...super.metadata,
		type: "family",
		identifierCollectionName: "families",
	});

	/** @inheritDoc */
	static defineSchema() {
		const schema = super.defineSchema();
		const fields = foundry.data.fields;
		// schema.motifs = fields.SetField()
		return schema;
	}
}
