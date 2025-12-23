// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { randomID } from "@helpers/utils.mjs";

/**
 * An abstract base model for roll modifiers.
 *
 * @abstract
 */
export class RollModifier extends foundry.abstract.DataModel {
	/** @inheritDoc */
	static LOCALIZATION_PREFIXES = ["CURSEBORNE.DICE.MODIFIER"];

	/**
	 * Data related to all instances of this class.
	 */
	static metadata = Object.freeze({
		field: "",
		name: "",
	});

	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			id: new fields.StringField({ required: true, initial: randomID }),
			label: new fields.StringField({ required: true, initial: "" }),
			hint: new fields.StringField({ required: true, initial: "" }),
			origin: new fields.StringField({ nullable: true }),
		};
	}

	/**
	 * A unique identifier for this modifier.
	 *
	 * @type {string}
	 */
	get uuid() {
		const baseUuid = this.parent.parent.uuid || "";
		return `${baseUuid}.${this.constructor.metadata.name}.${this.id}`;
	}

	/**
	 * A slug version of the UUID that can be used e.g. as key in {@link foundry.utils.Collection}s
	 * without dots leading to nested objects.
	 *
	 * @type {string}
	 */
	get slug() {
		return this.uuid.slugify({ strict: true });
	}

	withOrigin(source = true) {
		const result = this.toObject(source);
		if (this.actor) result.origin = this.actor.uuid;
		else if (this.item) result.origin = this.item.uuid;
		return result;
	}
}

/**
 * A complication modifier for a roll.
 */
export class Complication extends RollModifier {
	/** @inheritDoc */
	static metadata = Object.freeze({
		...super.metadata,
		field: "complications",
		name: "Complication",
	});

	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			...super.defineSchema(),
			value: new fields.NumberField({ required: true, initial: 1 }),
			boughtOff: new fields.BooleanField({ required: true, initial: false }),
		};
	}
}

/**
 * An enhancement modifier for a roll.
 */
export class Enhancement extends RollModifier {
	/** @inheritDoc */
	static metadata = Object.freeze({
		...super.metadata,
		field: "enhancements",
		name: "Enhancement",
	});

	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			...super.defineSchema(),
			value: new fields.StringField({ required: true, initial: "" }),
			label: new fields.StringField({
				required: true,
				initial: () => game.i18n.localize("CURSEBORNE.DICE.Enhancement"),
			}),
			stacking: new fields.BooleanField({ required: true, initial: false }),
		};
	}
}

export class DifficultyChange extends RollModifier {
	/** @inheritDoc */
	static metadata = Object.freeze({
		...super.metadata,
		field: "difficulties",
		name: "DifficultyChange",
	});

	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			...super.defineSchema(),
			value: new fields.NumberField({ required: true, initial: 0 }),
		};
	}
}
