import { systemTemplate } from "@helpers/utils.mjs";
import { CurseborneItemBase, LimitedActorTypesItem } from "./base.mjs";

export class DreadPower extends LimitedActorTypesItem(CurseborneItemBase, "accursed") {
	/** @inheritDoc */
	static metadata = Object.freeze({
		...super.metadata,
		type: "dreadPower",
		details: systemTemplate("item/details/dread-power"),
	});

	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		const schema = super.defineSchema();

		// TODO: Move to config
		schema.type = new fields.StringField({
			required: true,
		});

		schema.prerequisite = new fields.SetField(new fields.StringField(), {
			required: true,
		});

		return schema;
	}
}
