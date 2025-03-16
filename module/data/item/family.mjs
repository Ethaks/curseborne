import { Path } from "./path.mjs";

export class Family extends Path {
	static defineSchema() {
		const schema = super.defineSchema();
		const fields = foundry.data.fields;
		// schema.motifs = fields.SetField()
		return schema;
	}
}
