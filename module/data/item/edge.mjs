// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { CollectionField } from "@models/fields/object.mjs";
import { Complication, Enhancement } from "@models/modifiers.mjs";
import { DotsField } from "../fields/dots.mjs";
import { CurseborneItemBase, LimitedActorTypesItem } from "./base.mjs";

export class Edge extends LimitedActorTypesItem(CurseborneItemBase) {
	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;

		const schema = super.defineSchema();
		schema.dots = new DotsField(
			{ max: 3, min: { initial: 1 } },
			{ label: "CURSEBORNE.Cost", required: true },
		);
		schema.enhancements = new CollectionField(new fields.EmbeddedDataField(Enhancement));
		schema.complications = new CollectionField(new fields.EmbeddedDataField(Complication));

		return schema;
	}
}
