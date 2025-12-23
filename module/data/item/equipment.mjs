// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { randomID, requiredInteger, toLabelObject } from "@helpers/utils.mjs";
import { CollectionField } from "@models/fields/object.mjs";
import { Complication, Enhancement } from "@models/modifiers.mjs";
import { CurseborneItemBase, LimitedActorTypesItem } from "./base.mjs";

export class Equipment extends LimitedActorTypesItem(CurseborneItemBase) {
	/** @inheritDoc */
	static metadata = Object.freeze({
		...super.metadata,
		type: "equipment",
		identifierCollectionName: "equipment",
	});

	/** @inheritDoc */
	static LOCALIZATION_PREFIXES = ["CURSEBORNE.Item.Equipment"];

	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		const schema = super.defineSchema();

		schema.type = new fields.StringField({
			required: true,
			choices: () => toLabelObject(curseborne.config.equipmentTypes),
			initial: () => Object.keys(curseborne.config.equipmentTypes)[0],
		});

		schema.enhancements = new CollectionField(new fields.EmbeddedDataField(Enhancement));
		schema.complications = new CollectionField(new fields.EmbeddedDataField(Complication));

		schema.armor = new fields.NumberField({
			required: true,
			integer: true,
			min: 0,
		});

		schema.enhancement = new fields.NumberField({
			...requiredInteger,
			min: 1,
			initial: 1,
		});

		return schema;
	}

	/** @inheritDoc */
	prepareBaseData() {
		super.prepareBaseData();

		if (this.type !== "armor") {
			this.armor = 0;
		}
	}

	/** @inheritDoc */
	prepareDerivedData() {
		super.prepareDerivedData();

		if (this.type !== "armor" && this.enhancement) {
			const hint = game.i18n.localize(
				`CURSEBORNE.Item.Equipment.FIELDS.enhancement.${this.type.capitalize()}Hint`,
			);
			this.enhancements.set(
				"enhancement",
				new Enhancement(
					{
						id: "enhancement",
						value: this.enhancement,
						label: this.parent.name,
						hint,
					},
					{ parent: this },
				),
			);
		}
	}

	/** @inheritDoc */
	async _prepareEmbedContext(config, options) {
		const context = await super._prepareEmbedContext(config, options);

		if (this.type !== "armor" && this.armor) {
			context.details.push({
				label: game.i18n.localize("CURSEBORNE.Item.Equipment.FIELDS.armor.label"),
				value: this.armor,
			});
		}

		if (this.type !== "armor" && this.enhancement) {
			context.details.push({
				label: game.i18n.localize("CURSEBORNE.Item.Equipment.FIELDS.enhancement.label"),
				value: this.enhancement,
			});
		}

		return context;
	}
}
