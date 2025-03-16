import { Path } from "./path.mjs";

export class Role extends Path {
	static defineSchema() {
		const schema = super.defineSchema();
		const fields = foundry.data.fields;
		return schema;
	}
}
