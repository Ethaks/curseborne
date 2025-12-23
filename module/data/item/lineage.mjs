// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { Path } from "./path.mjs";

export class Lineage extends Path {
	/** @inheritDoc */
	static metadata = Object.freeze({ ...super.metadata, type: "lineage" });

	static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "CURSEBORNE.Item.Lineage"];

	/** @inheritDoc */
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

	/** @inheritDoc */
	async prepareSheetContext(context) {
		await super.prepareSheetContext(context);

		// Torment
		if (this.item.isEmbedded) {
			const torment = this.actor.itemTypes.torment.find(
				(t) => t.system.type === "lineage" && t.system.lineage === this.identifier,
			);
			if (torment) context.torment = torment;
		}
	}

	/** @inheritDoc */
	async _prepareEmbedContext(config, options) {
		const context = await super._prepareEmbedContext(config, options);

		// Torment
		if (this.item.isEmbedded) {
			const torment = this.actor.itemTypes.torment.find(
				(t) => t.system.type === "lineage" && t.system.lineage === this.identifier,
			);
			if (torment) {
				const tooltip = curseborne.tooltips.createPlaceholder({
					uuid: torment.uuid,
					descriptionOnly: torment.system.description?.trim().length > 0,
				});
				context.details.push({
					label: game.i18n.localize("CURSEBORNE.Item.Torment.label.one"),
					valueElement: `<span class="value" data-tooltip-html='${tooltip}'>${torment.name}</span>`,
				});
			}
		}

		return context;
	}
}
