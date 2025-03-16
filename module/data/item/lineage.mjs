import { Path } from "./path.mjs";

export class Lineage extends Path {
	/* @inheritDoc */
	static defineSchema() {
		const schema = super.defineSchema();
		const fields = foundry.data.fields;
		schema.inheritance = new fields.HTMLField({
			required: true,
			nullable: false,
			initial: "",
		});
		return schema;
	}

	prepareDerivedData() {
		super.prepareDerivedData();
	}
}
