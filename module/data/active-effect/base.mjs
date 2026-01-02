// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { toLabelObject } from "@helpers/utils.mjs";
import { CurseborneTypeDataModel } from "@models/base.mjs";
import { CollectionField } from "@models/fields/object.mjs";
import { Complication, DifficultyChange, Enhancement } from "@models/modifiers.mjs";

/**
 * A data model defining additional properties for all active effects, e.g. system-specific duration types.
 */
export class CurseborneActiveEffectModel extends CurseborneTypeDataModel {
	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			// Roll modifiers
			enhancements: new CollectionField(new fields.EmbeddedDataField(Enhancement)),
			complications: new CollectionField(new fields.EmbeddedDataField(Complication)),
			difficulties: new CollectionField(new fields.EmbeddedDataField(DifficultyChange)),

			// Duration
			// TODO: Add passed time as separate field
			duration: new fields.SchemaField({
				value: new fields.NumberField({
					integer: true,
					min: 0,
				}),
				unit: new fields.StringField({
					blank: true,
					nullable: false,
					choices: () => {
						const seconds = {
							group: "CURSEBORNE.DURATION.RealTime",
							label: game.i18n.localize("TIME.Second.other"),
						};
						const durations = toLabelObject(curseborne.config.durations);
						delete durations.turn;
						delete durations.round;
						for (const key in durations) {
							durations[key] = {
								label: durations[key].label,
								group: "CURSEBORNE.DURATION.ActionTime",
							};
						}
						return { seconds, ...durations };
					},
				}),
			}),

			label: new fields.StringField({
				required: false,
				blank: true,
				// TODO: Localize
				choices: { combat: "Combat", social: "Social" },
			}),
		};
	}

	/**
	 * Get the duration label for an active effect with a StorypathUltra duration.
	 *
	 * @type {string}
	 */
	get durationLabel() {
		return game.i18n.localize(curseborne.config.durations[this.duration.unit]?.label) ?? "";
	}

	/**
	 * Prepare the duration data for an active effect with a StorypathUltra duration.
	 */
	_prepareDuration() {
		// If the duration unit is seconds, let Foundry handle it
		if (!this.duration.unit || this.duration.unit === "seconds") return null;

		return {
			type: "curseborne",
			duration: this.duration.value,
			// TODO: Determine how remaining duration should be handled
			remaining: null,
			label: `${this.duration.value} ${this.durationLabel}`,
		};
	}
}
