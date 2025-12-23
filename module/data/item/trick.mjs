// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { DotsField } from "@models/fields/dots.mjs";
import { toLabelObject } from "../../helpers/utils.mjs";
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

		schema.cost = new DotsField({
			value: { initial: 1, min: -1 },
			min: { initial: 1 },
			max: { initial: 3 },
			type: new fields.StringField({
				initial: "fixed",
				choices: () => toLabelObject(curseborne.config.trickCostTypes),
				required: true,
			}),
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
}
