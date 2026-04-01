// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { localize, systemTemplate, toLabelObject } from "@helpers/utils.mjs";
import { CurseborneTypeDataModel } from "@models/base.mjs";
import { CollectionField } from "@models/fields/object.mjs";
import { Complication, DifficultyChange, Enhancement } from "@models/modifiers.mjs";

/**
 * A data model defining additional properties for all active effects, e.g. system-specific duration types.
 */
export class CurseborneActiveEffectModel extends CurseborneTypeDataModel {
	/** @inheritDoc */
	static get metadata() {
		return {
			...super.metadata,
			embedTemplate: systemTemplate("item/tooltips/common"),
		};
	}

	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			// Roll modifiers
			enhancements: new CollectionField(new fields.EmbeddedDataField(Enhancement)),
			complications: new CollectionField(new fields.EmbeddedDataField(Complication)),
			difficulties: new CollectionField(new fields.EmbeddedDataField(DifficultyChange)),

			changes: new fields.ArrayField(
				new fields.SchemaField({
					key: new fields.StringField({ required: true }),
					type: new fields.StringField({
						required: true,
						blank: false,
						initial: "add",
						validate: CurseborneActiveEffectModel.#validateType,
					}),
					value: new fields.AnyField({
						required: true,
						nullable: true,
						serializable: true,
						initial: "",
					}),
					phase: new fields.StringField({ required: true, blank: false, initial: "initial" }),
					priority: new fields.NumberField(),
				}),
			),

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
	 * Validate that an {@link EffectChangeData#type} string is well-formed.
	 *
	 * @param {string} type The string to be validated
	 * @returns {true}
	 * @throws {Error} An error if the type string is malformed
	 */
	static #validateType(type) {
		if (type.length < 3) throw new Error("must be at least three characters long");
		if (!/^custom\.-?\d+$/.test(type) && !type.split(".").every((s) => /^[a-z0-9]+$/i.test(s))) {
			throw new Error(
				"A change type must either be a sequence of dot-delimited, alpha-numeric substrings or of the form" +
					' "custom.{number}"',
			);
		}
		return true;
	}

	/**
	 * Prepare the duration data for an active effect with a StorypathUltra duration.
	 */
	_prepareDuration() {
		// If the duration unit is seconds, let Foundry handle it
		if (!this.duration.unit || this.duration.unit === "seconds") return undefined;

		return {
			type: "curseborne",
			value: this.duration.value,
			// TODO: Determine how remaining duration should be handled
			remaining: null,
			expiry: this.parent.duration.expiry,
			label: `${this.duration.value} ${this.durationLabel}`,
		};
	}

	/** @inheritDoc */
	async _prepareEmbedContext(config, options) {
		const context = await super._prepareEmbedContext(config, options);
		if (this.parent.type === "base") context.subtitle = "";
		context.enriched.push({
			label: localize("CURSEBORNE.Item.Tabs.description"),
			classes: "description",
			enriched: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
				this.parent.description,
				{
					secrets: this.parent.isOwner,
					rollData: context.rollData ?? (this.item ?? this.actor)?.getRollData?.(),
					relativeTo: this.parent,
				},
			),
		});
		return context;
	}
}
