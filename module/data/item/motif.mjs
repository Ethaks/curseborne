// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { IdentifierField } from "@models/fields/identifier.mjs";
import { CurseborneItemBase, LimitedActorTypesItem } from "./base.mjs";

export class Motif extends LimitedActorTypesItem(CurseborneItemBase) {
	/** @inheritDoc */
	static metadata = Object.freeze({
		...super.metadata,
		type: "motif",
	});

	/** @inheritDoc */
	static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "CURSEBORNE.Item.Motif"];

	/** @inheritDoc */
	static defineSchema() {
		return Object.assign(super.defineSchema(), {
			family: new IdentifierField(),
		});
	}

	/** @inheritDoc */
	async _onCreate(data, options, userId) {
		await super._onCreate(data, options, userId);
		this.actor?.system.family?.sheet.render();
	}

	/** @inheritDoc */
	async _onUpdate(changed, options, userId) {
		await super._onUpdate(changed, options, userId);
		this.actor?.system.family?.sheet.render();
	}

	/** @inheritDoc */
	async _onDelete(options, userId) {
		await super._onDelete(options, userId);
		this.actor?.system.family?.sheet.render();
	}
}
