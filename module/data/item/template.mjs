// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { localize } from "@helpers/utils.mjs";
import { CurseborneItemBase, LimitedActorTypesItem } from "./base.mjs";

export class AdversaryTemplate extends LimitedActorTypesItem(CurseborneItemBase, "accursed") {
	/** @inheritDoc */
	static metadata = Object.freeze({ ...super.metadata, type: "template" });

	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		const schema = super.defineSchema();

		schema.pools = new fields.SchemaField({
			primary: new fields.NumberField({
				required: true,
				initial: 0,
				label: "CURSEBORNE.Actor.Adversary.FIELDS.pools.primary.label",
			}),
			secondary: new fields.NumberField({
				required: true,
				initial: 0,
				label: "CURSEBORNE.Actor.Adversary.FIELDS.pools.secondary.label",
			}),
			desperation: new fields.NumberField({
				required: true,
				initial: 0,
				label: "CURSEBORNE.Actor.Adversary.FIELDS.pools.desperation.label",
			}),
		});
		schema.defense = new fields.NumberField({
			required: true,
			initial: 0,
			label: "CURSEBORNE.Actor.base.FIELDS.defense.label",
		});
		schema.integrity = new fields.NumberField({
			required: true,
			initial: 0,
			label: "CURSEBORNE.Actor.base.FIELDS.integrity.label",
		});
		schema.injuries = new fields.NumberField({
			required: true,
			initial: 0,
			label: "CURSEBORNE.Actor.base.FIELDS.injuries.max.label",
		});
		schema.armor = new fields.NumberField({
			required: true,
			initial: 0,
			label: "CURSEBORNE.Actor.base.FIELDS.armor.max.label",
		});
		schema.initiative = new fields.NumberField({
			required: true,
			initial: 0,
			label: "CURSEBORNE.Actor.base.FIELDS.initiative.label",
		});

		return schema;
	}

	/* --------------------------------------------------------------------------------------------- */
	/*                                       Lifecycle Events                                        */
	/* --------------------------------------------------------------------------------------------- */

	/** @inheritDoc */
	async _preCreate(data, options, user) {
		if ((await super._preCreate(data, options, user)) === false) return false;

		// Prevent creation of template item if the actor already has one
		if (this.item.isEmbedded && this.actor.itemTypes.template.length > 0) {
			ui.notifications.error(
				localize("CURSEBORNE.ERROR.DuplicateItemType", { type: localize("TYPES.Item.template") }),
			);
			return false;
		}
	}

	/* --------------------------------------------------------------------------------------------- */
	/*                                       Data Preparation                                        */
	/* --------------------------------------------------------------------------------------------- */

	/** @inheritDoc */
	prepareBaseData() {
		this.#applyTemplate();
	}

	/**
	 * Apply the adversary template to its actor.
	 */
	#applyTemplate() {
		if (!this.actor) return;

		for (const key of [
			"pools.primary",
			"pools.secondary",
			"pools.desperation",
			"defense",
			"integrity",
			"injuries",
			"armor",
			"initiative",
		]) {
			// Templates only determine maximum injuries and armor
			if (key === "injuries") this.actor.system.injuries.max += this.injuries;
			else if (key === "armor") this.actor.system.armor.max += this.armor;
			else if (key.startsWith("pools.")) {
				const value = foundry.utils.getProperty(this, key);
				const current = foundry.utils.getProperty(this.actor.system, `${key}.value`);
				foundry.utils.setProperty(this.actor.system, `${key}.value`, (current ?? 0) + value);
			} else {
				const value = foundry.utils.getProperty(this, key);
				const current = foundry.utils.getProperty(this.actor.system, key);
				foundry.utils.setProperty(this.actor.system, key, (current ?? 0) + value);
			}
		}
	}

	/* ---------------------------------------------------------------------------------------------- */
	/*                                        Sheet Rendering                                         */
	/* ---------------------------------------------------------------------------------------------- */

	/** @inheritDoc */
	async prepareSheetContext(context) {
		context.pools = ["primary", "secondary", "desperation"].map((poolId) => {
			return {
				field: this.schema.fields.pools.fields[poolId],
				value: this.pools[poolId],
			};
		});
	}
}
