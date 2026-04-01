// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { toLabelObject } from "@helpers/utils.mjs";
import { CollectionField } from "@models/fields/object.mjs";
import { Complication, Enhancement } from "@models/modifiers.mjs";
import { DotsField } from "../fields/dots.mjs";
import { CurseborneItemBase, LimitedActorTypesItem } from "./base.mjs";

export class Edge extends LimitedActorTypesItem(CurseborneItemBase) {
	/** @inheritDoc */
	static get metadata() {
		return {
			...super.metadata,
			type: "edge",
		};
	}

	/** @inheritDoc */
	static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "CURSEBORNE.Item.Edge"];

	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;

		const schema = super.defineSchema();
		schema.dots = new DotsField(
			{
				min: { initial: 1 },
				max: 3,
				type: new fields.StringField({
					initial: "fixed",
					choices: () => toLabelObject(curseborne.config.trickCostTypes),
					required: true,
				}),
			},
			{ label: "CURSEBORNE.Cost", required: true },
		);
		schema.enhancements = new CollectionField(new fields.EmbeddedDataField(Enhancement));
		schema.complications = new CollectionField(new fields.EmbeddedDataField(Complication));

		return schema;
	}

	/** @inheritDoc */
	static migrateData(source, options, _state) {
		// Derive cost type from min value, assuming that a set value means the edge has a variable cost
		if (source.dots.type == null) {
			if (source.dots?.min === null) source.dots.type = "fixed";
			else if (Number.isInteger(source.dots?.min)) source.dots.type = "variable";
		}
		return super.migrateData(source, options, _state);
	}

	/** @inheritDoc */
	prepareBaseData() {
		super.prepareBaseData();

		// If the Edge is owned by an actor, ensure it has at least as many dots as the minimum
		if (this.item.isEmbedded && this.dots.type === "variable") {
			this.dots.value = Math.max(this.dots.value ?? 0, this.dots.min ?? 0);
		}
	}

	/** @inheritDoc */
	async prepareSheetContext(context) {
		await super.prepareSheetContext(context);
		// Show specific dots if the type is fixed (and the dots thus can be pre-configured),
		// or if the item is embedded (and the Edge should have a specific dot rating for the parent actor).
		context.showDots = this.item.isEmbedded || this.dots.type === "fixed";
	}
}
