import { requiredInteger, toLabelObject } from "../../helpers/utils.mjs";
import { CurseborneItemBase, LimitedActorTypesItem } from "./base.mjs";

export class Trick extends LimitedActorTypesItem(CurseborneItemBase, ["accursed", "adversary"]) {
	static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "CURSEBORNE.Item.Trick"];
	/** @inheritDoc */
	static defineSchema() {
		const schema = super.defineSchema();
		const fields = foundry.data.fields;

		schema.type = new fields.StringField({
			required: true,
			initial: "general",
			choices: () => toLabelObject(curseborne.config.trickTypes),
		});

		schema.cost = new fields.SchemaField({
			type: new fields.StringField({
				initial: "fixed",
				choices: () => toLabelObject(curseborne.config.trickCostTypes),
				required: true,
			}),
			value: new fields.NumberField({ ...requiredInteger, initial: 1, max: 3 }),
			min: new fields.NumberField({ ...requiredInteger, initial: 1 }),
			max: new fields.NumberField({ ...requiredInteger, initial: 3 }),
		});

		return schema;
	}

	/**
	 * Generate an array containing Trick Items or their index entries.
	 *
	 * @returns {Promise<(Item | { name: string, uuid: string, system: { type: string, cost: number } })[]>}
	 */
	static async getAllTricks() {
		const tricks = [];
		for (const item of game.items) {
			if (item.type === "trick") tricks.push(item);
		}

		// Gather all trick entries from compendium packs containing items
		const packPromises = game.packs
			.filter((pack) => pack.metadata.type === "Item")
			.map(async (pack) => {
				await pack.getIndex({
					fields: ["system.type", "system.cost", "system.description"],
				});
				return pack.index
					.filter((e) => e.type === "trick")
					.map((e) => ({ ...e, uuid: pack.getUuid(e._id) }));
			});
		const indexEntries = await Promise.all(packPromises);

		return tricks.concat(indexEntries.flat());
	}

	/** @inheritDoc */
	async _prepareEmbedContext(config, options) {
		const context = await super._prepareEmbedContext(config, options);

		return context;
	}
}
