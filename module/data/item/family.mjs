// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { Path } from "./path.mjs";

/** @import { Motif } from "./motif.mjs" */

export class Family extends Path {
	/** @inheritDoc */
	static metadata = Object.freeze({
		...super.metadata,
		type: "family",
		identifierCollectionName: "families",
	});

	/**
	 * The {@linkcode Motif} items in this item's collection that are associated with this family.
	 *
	 * @type {foundry.utils.Collection<string, MotifItem>}
	 */
	get motifs() {
		if (this.isPackItem) return new foundry.utils.Collection();

		return (this.parent.isEmbedded ? this.actor.items : game.items).reduce((collection, item) => {
			if (item.type === "motif" && item.system.family === this.identifier)
				collection.set(item.id, item);
			return collection;
		}, new foundry.utils.Collection());
	}

	/** @inheritDoc */
	async prepareSheetContext(context) {
		await super.prepareSheetContext(context);

		// Prepare motifs so that they can be displayed in their own fieldset
		context.motifs = [];
		for (const motif of this.motifs) {
			context.motifs.push({
				item: motif,
				tooltip: curseborne.tooltips.createPlaceholder({ uuid: motif.uuid }),
			});
		}
	}

	/** @inheritDoc */
	async _prepareEmbedContext(config, options) {
		const context = await super._prepareEmbedContext(config, options);

		// Add motifs with links (if any)
		const motifs = this.motifs;
		if (motifs.size) {
			const motifElements = motifs.map((m) => {
				const tooltip = curseborne.tooltips.createPlaceholder({
					uuid: m.uuid,
					descriptionOnly: true,
				});
				return `<span data-tooltip='${tooltip}'>${m.name}</span>`;
			});
			context.details.push({
				label: game.i18n.localize("CURSEBORNE.Item.Motif.label.other"),
				valueElement: `<span class="value flexrow">${motifElements.join(", ")}</span>`,
			});
		}

		return context;
	}
}
