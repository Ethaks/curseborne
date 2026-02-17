// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { localize } from "@helpers/utils.mjs";

const { StringField, ObjectField } = foundry.data.fields;

export class DieSourceField extends foundry.data.fields.SchemaField {
	constructor(fields = {}, options = {}, context = {}) {
		fields = {
			id: new StringField({
				initial: foundry.utils.randomID,
				required: true,
			}),
			type: new StringField({ initial: "" }),
			value: new StringField({ initial: "" }),
			choices: new ObjectField({ required: false }),
			label: new StringField({ required: false }),
			...fields,
		};
		super(fields, options, context);
	}

	/**
	 * Get the field label for a given die source.
	 *
	 * @param {DieSource | string} source The die source or type string.
	 * @returns {string} The localized label for the die source.
	 */
	static getLabel(source) {
		source = typeof source === "string" ? { type: source } : source;
		switch (source.type) {
			case "attribute":
			case "skill":
				return `CURSEBORNE.${source.type.capitalize()}`;
			case "injury":
				return "CURSEBORNE.InjuryDice";
			case "pool":
				return "CURSEBORNE.Actor.Adversary.FIELDS.pools.label";
			case "contactPool":
				return "CURSEBORNE.Item.Contact.Pool";
			case "entanglement":
				return "CURSEBORNE.Entanglement";
			default:
				return source.label || localize("CURSEBORNE.DICE.CustomDieSource");
		}
	}

	/**
	 * Get the available choices for a given die source and actor.
	 *
	 * @param {DieSource | string} source The die source or type string.
	 * @param {AccursedActor | AdversaryActor | null} actor The actor to retrieve choices from.
	 * @param {object} _options Additional options.
	 * @returns {{ choices: Array<{ label: string, value: string, group?: string }>, groups: string[] }} The available choices and groups.
	 */
	static getChoices(source, actor, _options = {}) {
		const choices = [];
		const groups = [];

		source = typeof source === "string" ? { type: source } : source;
		const type = source.type;

		if (type === "attribute") {
			choices.push({ label: "", value: "" });
			for (const group of Object.values(curseborne.config.attributeGroups)) {
				groups.push(game.i18n.localize(group.label));
			}
			for (const [id, attribute] of Object.entries(curseborne.config.attributes)) {
				choices.push({
					label: `${game.i18n.localize(attribute.label)} +${actor.system.attributes[id].value}`,
					value: `@attributes.${id}.value`,
					group: game.i18n.localize(curseborne.config.attributeGroups[attribute.group].label),
				});
			}
		} else if (type === "skill") {
			if (!source.choices) choices.push({ label: "", value: "" });
			// Retrieve skills present on actor
			if (actor) {
				for (const skill of actor.itemTypes.skill) {
					if (source.choices && !source.choices[skill.system.identifier]) continue;
					choices.push({
						label: `${skill.name} +${skill.system.dots.value}`,
						value: `@skills.${skill.system.identifier}.dots.value`,
					});
				}
			} else {
				// If no actor is present, show all default skills
				for (const skill of curseborne.config.skills) {
					choices.push({
						label: `${game.i18n.localize(skill.label)} +0`,
						value: skill.id,
					});
				}
			}
		} else if (type === "injury") {
			const level = actor.system.injuries.level;
			const config = curseborne.config.injuryLevels[level];
			choices.push({
				label: `${game.i18n.localize(config.label)} +${actor.system.injuries.dice}`,
				value: "@injuries.dice",
			});
		} else if (type === "pool") {
			for (const pool of ["primary", "secondary", "desperation"]) {
				const dice = actor.system.pools[pool].value;
				const poolLabel = game.i18n.localize(
					`CURSEBORNE.Actor.Adversary.FIELDS.pools.${pool}.label`,
				);
				choices.push({
					label: `${poolLabel} +${dice}`,
					value: `@pools.${pool}.value`,
				});
			}
		} else if (type === "contactPool") {
			choices.push({
				label: `${game.i18n.localize("CURSEBORNE.Item.Contact.Pool")} +8`,
				value: "8",
			});
		} else if (type === "entanglement") {
			choices.push({
				label: `${game.i18n.localize("CURSEBORNE.Entanglement")} +${actor.system.entanglement.value}`,
				value: "@entanglement.value",
			});
		}

		return { choices, groups };
	}

	/** @inheritDoc */
	_toInput(config = {}) {
		// DieSource inputs should always point to the inner value field, not the type/id
		/** @type {DieSource} */
		const value = config.value;
		config.name = `${config.name}.value`;
		config.value = value.value;

		// If no type is set, return a simple number input directed at the `dice` field
		if (value.type === "") {
			return foundry.applications.fields.createTextInput(config);
		}

		return foundry.applications.fields.createSelectInput(config);
	}
}
