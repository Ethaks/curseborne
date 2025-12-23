// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { toLabelObject } from "@helpers/utils.mjs";
import { IdentifierField } from "@models/fields/identifier.mjs";
import { CurseborneItemBase, LimitedActorTypesItem } from "./base.mjs";

export class Torment extends LimitedActorTypesItem(CurseborneItemBase) {
	/** @inheritDoc */
	static metadata = Object.freeze({ ...super.metadata, type: "torment" });

	/** @inheritDoc */
	static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "CURSEBORNE.Item.Torment"];

	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		const schema = super.defineSchema();
		return Object.assign(schema, {
			type: new fields.StringField({
				required: true,
				blank: true,
				choices: () => toLabelObject(curseborne.config.tormentTypes),
			}),
			lineage: new IdentifierField(),
		});
	}

	/* --------------------------------------------------------------------------------------------- */
	/*                                       Lifecycle Events                                        */
	/* --------------------------------------------------------------------------------------------- */

	/** @inheritDoc */
	async _preCreate(data, options, user) {
		if ((await super._preCreate(data, options, user)) === false) return false;

		// Prevent creation of a second torment of a given type within an actor
		if (this.item.isEmbedded) {
			const existing = this.actor.itemTypes.torment.find(
				(t) => t.system.type && t.system.type === this.type,
			);
			if (existing) {
				ui.notifications?.error(game.i18n.localize("CURSEBORNE.Item.Torment.DuplicateError"));
				return false;
			}
		}
	}

	/** @inheritDoc */
	async _preUpdate(changes, options, user) {
		if ((await super._preUpdate(changes, options, user)) === false) return false;

		// Prevent updating a second torment of a given type within an actor
		if (this.item.isEmbedded && changes.system?.type) {
			const existing = this.actor.itemTypes.torment.find(
				(t) => t !== this.parent && t.system.type && t.system.type === changes.system.type,
			);
			if (existing) {
				ui.notifications?.error(game.i18n.localize("CURSEBORNE.Item.Torment.DuplicateError"));
				return false;
			}
		}
	}

	/** @inheritDoc */
	async _onCreate(data, options, userId) {
		await super._onCreate(data, options, userId);
		this.actor?.system.lineage?.sheet.render();
	}

	/** @inheritDoc */
	async _onUpdate(changed, options, userId) {
		await super._onUpdate(changed, options, userId);
		this.actor?.system.lineage?.sheet.render();
	}

	/** @inheritDoc */
	async _onDelete(options, userId) {
		await super._onDelete(options, userId);
		this.actor?.system.lineage?.sheet.render();
	}
}
