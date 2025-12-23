// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { CurseborneItemBase } from "./base.mjs";

export class Gear extends CurseborneItemBase {
	/** @inheritDoc */
	static LOCALIZATION_PREFIXES = ["CURSEBORNE.Item.base", "CURSEBORNE.Item.Gear"];

	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		const schema = super.defineSchema();

		return schema;
	}
}
