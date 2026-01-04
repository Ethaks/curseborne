// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { IdentifierField } from "@models/fields/identifier.mjs";
import { localize, requiredInteger, toLabelObject } from "../../helpers/utils.mjs";
import { CurseborneItemBase } from "./base.mjs";

export class Spell extends CurseborneItemBase {
	/** @inheritDoc */
	static LOCALIZATION_PREFIXES = ["CURSEBORNE.Item.base", "CURSEBORNE.Item.Spell"];

	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		const schema = super.defineSchema();

		schema.type = new fields.StringField({ required: true, initial: "base" });

		schema.advances = new fields.StringField({ required: true, initial: "" });

		schema.cost = new fields.SchemaField({
			type: new fields.StringField({
				required: true,
				blank: false,
				choices: toLabelObject(curseborne.config.spellCostTypes),
				initial: "bleed",
			}),
			value: new fields.NumberField({
				...requiredInteger,
				initial: 0,
			}),
			additional: new fields.BooleanField({ required: true, initial: false }),
		});

		schema.identifier = new IdentifierField({ required: true });

		schema.group = new fields.StringField({
			required: true,
			blank: false,
			initial: "emotionalManipulation",
			choices: () => {
				// Generate a Record<Group, Label>, where group is the key of a practice's group, and label is the localized label for that group.
				const practices = {};
				for (const [practiceId, { label: practiceLabel, groups = {} }] of Object.entries(
					curseborne.config.practices,
				)) {
					for (const [groupId, { label }] of Object.entries(groups)) {
						practices[groupId] = {
							label: game.i18n?.localize(label) ?? label,
							group: game.i18n?.localize(practiceLabel) ?? practiceId,
						};
					}
				}
				return practices;
			},
		});

		schema.entanglement = new fields.NumberField({
			required: true,
			nullable: true,
			initial: null,
			integer: true,
			min: 0,
		});

		schema.attunements = new fields.SetField(
			new fields.StringField({
				required: true,
				blank: false,
				// choices: () => {
				// 	const { base, targeted } = Object.entries(curseborne.config.attunements).reduce(
				// 		(acc, [key, value]) => {
				// 			if (value.targets?.length) acc.targeted[key] = value;
				// 			else acc.base[key] = value;
				// 			return acc;
				// 		},
				// 		{ base: {}, targeted: {} },
				// 	);
				// },
			}),
		);

		return schema;
	}

	/** @inheritDoc */
	static migrateData(source) {
		// Migrate old `practice` field to `group` field
		/** TODO: @deprecated since vNEXT */
		if (source.practice && !source.group) {
			source.group = source.practice;
			delete source.practice;
		}
		return super.migrateData(source);
	}

	/**
	 * The spell's currently active advancements, i.e. advancements in the same collection.
	 *
	 * @type {Collection<string, CurseborneItem> | Promise<Collection<string, CurseborneItem>>}
	 */
	get advancements() {
		if (this.isPackItem) return new foundry.utils.Collection();

		return (this.parent.isEmbedded ? this.actor.items : game.items).reduce((collection, item) => {
			if (item.system.advances === this.identifier) collection.set(item.id, item);
			return collection;
		}, new foundry.utils.Collection());
	}

	/**
	 * Get the complete cost label for this spell.
	 *
	 * @type {string}
	 */
	get costLabel() {
		const { type, value, additional } = this.cost;
		const stringPath =
			type === "hold"
				? additional
					? "HoldXAdditional"
					: "HoldX"
				: additional
					? "BleedXAdditional"
					: "BleedX";
		return localize(`CURSEBORNE.Item.Spell.FIELDS.cost.${stringPath}`, { value, _count: value });
	}

	/**
	 * The overall practice of the spell, i.e. which practice its group belongs to.
	 *
	 * @type {keyof typeof curseborne.config.practices}
	 */
	get practice() {
		return Object.entries(curseborne.config.practices).find(
			([_, practice]) => this.group in practice.groups,
		)?.[0];
	}

	static get practices() {
		// Generate a Record<Group, Label>, where Group is the key of a practice's group, and label is the localized label for that group.
		const practices = {};
		for (const [practiceId, { label: practiceLabel, groups = {} }] of Object.entries(
			curseborne.config.practices,
		)) {
			for (const [groupId, { label }] of Object.entries(groups)) {
				practices[groupId] = {
					label: game.i18n?.localize(label) ?? label,
					group: game.i18n?.localize(practiceLabel) ?? practiceId,
				};
			}
		}
		return practices;
	}

	/** @inheritDoc */
	async prepareSheetContext(context) {
		await super.prepareSheetContext(context);

		context.practice = {
			field: new foundry.data.fields.StringField({
				label: "CURSEBORNE.Item.Spell.FIELDS.practice.label",
				choices: toLabelObject(curseborne.config.practices),
			}),
			value: game.i18n.localize(curseborne.config.practices[this.practice]?.label ?? this.practice),
		};
	}

	/** @inheritDoc */
	async _prepareEmbedContext(config, options) {
		const context = await super._prepareEmbedContext(config, options);

		// Add the spell's practice and group as details
		if (this.group) {
			const { label, group } = this.constructor.practices[this.group];
			const value = [group, label].join(" — ");
			context.details.push({
				label: game.i18n.localize("CURSEBORNE.Item.Spell.FIELDS.practice.label"),
				value,
			});
		}

		// Add cost
		if (this.cost.value) {
			const icon = curseborne.config.spellCostTypes[this.cost.type].icon;
			const valueElement = `<span class="value flexrow"><i class="${icon} flexshrink"></i> ${this.costLabel}</span>`;
			context.details.push({
				label: game.i18n.localize("CURSEBORNE.Item.Spell.FIELDS.cost.type.label"),
				valueElement,
			});
		}

		if (this.attunements.size) {
			context.details.push({
				label: this.schema.fields.attunements.label,
				value: game.i18n.getListFormatter({ type: "conjunction", style: "narrow" }).format(
					this.attunements.map((attunement) => {
						const label = curseborne.config.attunements[attunement]?.label;
						return game.i18n.localize(label) ?? attunement;
					}),
				),
			});
		}

		// Advances
		if (this.advances) {
			const advanceDetail = {
				label: game.i18n.localize("CURSEBORNE.Item.Spell.FIELDS.advances.details.label"),
			};
			const advancedSpell = this.item.collection.find(
				(spell) => spell.system.identifier === this.advances,
			);
			if (advancedSpell) {
				// If a spell is found, we can create a link with embed tooltip for it; otherwise, just show the identifier
				const tooltip = curseborne.tooltips.createPlaceholder({ uuid: advancedSpell.uuid });
				advanceDetail.valueElement = `<span class="value flexrow" data-tooltip-html='${tooltip}'>${advancedSpell.name}</span>`;
			} else {
				advanceDetail.value = this.advances;
			}
			context.details.push(advanceDetail);

			if (this.entanglement !== null) {
				context.details.push({
					label: game.i18n.localize("CURSEBORNE.Entanglement"),
					value: this.entanglement,
				});
			}
		}

		return context;
	}
}
