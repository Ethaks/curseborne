import { IdentifierField } from "@models/fields/identifier.mjs";
import { camelize, requiredInteger, toLabelObject } from "../../helpers/utils.mjs";
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
		});

		schema.identifier = new IdentifierField({ required: true });

		schema.practice = new fields.StringField({
			required: true,
			blank: false,
			initial: "emotionalManipulation",
			choices: () => {
				// Generate a Record<SubGroup, Label>, where subgroup is the key of a practice's subgroup, and label is the localized label for that subgroup.
				const practices = {};
				for (const [practiceId, { label: practiceLabel, subgroups = {} }] of Object.entries(
					curseborne.config.practices,
				)) {
					for (const [groupId, { label }] of Object.entries(subgroups)) {
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

	static get practices() {
		// Generate a Record<SubGroup, Label>, where subgroup is the key of a practice's subgroup, and label is the localized label for that subgroup.
		const practices = {};
		for (const [practiceId, { label: practiceLabel, subgroups = {} }] of Object.entries(
			curseborne.config.practices,
		)) {
			for (const [groupId, { label }] of Object.entries(subgroups)) {
				practices[groupId] = {
					label: game.i18n?.localize(label) ?? label,
					group: game.i18n?.localize(practiceLabel) ?? practiceId,
				};
			}
		}
		return practices;
	}

	/** @inheritDoc */
	async _prepareEmbedContext(config, options) {
		const context = await super._prepareEmbedContext(config, options);

		// Add the spell's practice and subgroup as details
		if (this.practice) {
			const { label, group } = this.constructor.practices[this.practice];
			const value = [group, label].join(" — ");
			context.details.push({
				label: game.i18n.localize("CURSEBORNE.Item.Spell.FIELDS.practice.label"),
				value,
			});
		}

		// Add cost
		if (this.cost.value) {
			const { type, value } = this.cost;
			const icon = curseborne.config.spellCostTypes[this.cost.type].icon;
			const valueString = game.i18n.format(
				`CURSEBORNE.Item.Spell.FIELDS.cost.${type === "hold" ? "HoldX" : "BleedX"}`,
				{
					value,
					dice: game.i18n.localize(`CURSEBORNE.${value > 1 ? "CurseDice" : "CurseDie"}`),
				},
			);
			const valueElement = `<span class="value flexrow"><i class="${icon} flexshrink"></i> ${valueString}</span>`;
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
