import { systemTemplate, toLabelObject } from "@helpers/utils.mjs";
import { DotsField } from "@models/fields/dots.mjs";
import { CurseborneItemBase, LimitedActorTypesItem } from "./base.mjs";

export class DreadPower extends LimitedActorTypesItem(CurseborneItemBase, "accursed") {
	/** @inheritDoc */
	static metadata = Object.freeze({
		...super.metadata,
		type: "dreadPower",
		details: systemTemplate("item/details/dread-power"),
	});

	/** @inheritDoc */
	static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "CURSEBORNE.Item.DreadPower"];

	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		const schema = super.defineSchema();

		schema.type = new fields.SchemaField({
			value: new fields.StringField({
				required: true,
				initial: () => Object.keys(curseborne.config.dreadPowerTypes)[0],
				choices: () => toLabelObject(curseborne.config.dreadPowerTypes),
			}),
			custom: new fields.StringField({ required: true, nullable: false }),
		});

		schema.injuries = new fields.StringField({
			blank: true,
			choices: () => toLabelObject(curseborne.config.dreadPowerInjuries),
		});

		schema.uses = new DotsField({
			min: 1,
			value: { initial: 1 },
			max: { initial: 1 },
		});

		return schema;
	}

	/* --------------------------------------------------------------------------------------------- */
	/*                                       Embed Preparation                                       */
	/* --------------------------------------------------------------------------------------------- */

	/** @inheritDoc */
	async _prepareEmbedContext(config, options) {
		const context = await super._prepareEmbedContext(config, options);

		// Add dread power group to subtitle
		if (this.type.value !== "custom") {
			const typeGroup = game.i18n.localize(
				curseborne.config.dreadPowerTypes[this.type.value].group,
			);
			context.subtitle += ` — ${typeGroup}`;
		}
		// Add full (possibly longer) type label to details
		const typeLabel =
			this.type.value === "custom"
				? this.type.custom
				: game.i18n.localize(curseborne.config.dreadPowerTypes[this.type.value].label);
		context.details.push({
			label: game.i18n.localize("CURSEBORNE.Item.DreadPower.FIELDS.type.value.label"),
			value: typeLabel,
		});

		// Required Injuries level
		if (this.injuries) {
			context.details.push({
				label: game.i18n.localize("CURSEBORNE.Item.DreadPower.FIELDS.injuries.label"),
				value: game.i18n.localize(curseborne.config.dreadPowerInjuries[this.injuries].label),
			});
		}

		// Add uses dots if number of maximum uses is defined
		if (this.uses.max > 0) {
			context.details.push({
				label: game.i18n.localize("CURSEBORNE.Item.DreadPower.FIELDS.uses.label"),
				valueElement: this.schema.fields.uses.toInput({
					value: this.uses,
					max: this.uses.max,
					classes: "value",
					disabled: true,
				}).outerHTML,
			});
		}

		return context;
	}
}
