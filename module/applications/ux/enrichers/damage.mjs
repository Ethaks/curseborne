// SPDX-FileCopyrightText: 2026 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { CurseborneRoll } from "@dice/roll.mjs";
import { localize } from "@helpers/utils.mjs";
import { createLink, parseConfig } from "../helpers.mjs";

/**
 * @import { ActiveEffectData } from "@common/documents/_types.mjs";
 * @import { TextEditorEnricher, TextEditorEnricherConfig } from "@client/config.mjs";
 * @import HTMLEnrichedContentElement from "@client/applications/elements/enriched-content.mjs"
 * @import { ParsedConfig } from "../helpers.mjs";
 */

/** @type { TextEditorEnricherConfig["id"] } */
export const id = "curseborne.damage";

/* ---------------------------------------------------------------------------------------------- */

/** @type {TextEditorEnricherConfig["pattern"]} */
// The pattern should match `[[/damage 1+2]]`, or `[[/heal value=5]]{Heal Wounds}`, or `[[/injuries 1+@entanglement`]],
// where the trigger can be "damage", "injury", "injuries", "armor", "healing", or "heal".
export const pattern =
	/\[\[\/(?<type>damage|injury|injuries|armor|heal|healing)(?<config> .*?)?]](?!])(?:{(?<label>[^}]+)})?/gi;

/* ---------------------------------------------------------------------------------------------- */

/**
 * Enricher to apply damage, injury, armor, or healing.
 *
 * @type {TextEditorEnricher}
 */
export async function enricher(match, options) {
	let { config, label, type } = match.groups;

	const parsedConfig = parseConfig(config);
	parsedConfig._input = match[0];

	const linkConfig = {};

	// Aliases for types
	const types = {
		injuries: "injury",
		healing: "heal",
	};
	type = types[type] || type;
	if (!type) return;

	// Determine formula
	const formulaParts = [];
	if (parsedConfig.value !== undefined) {
		formulaParts.push(parsedConfig.value);
	} else {
		formulaParts.push(...parsedConfig.values);
	}
	if (!formulaParts.length) return;

	const formula = CurseborneRoll.replaceFormulaData(
		formulaParts.join(" "),
		options.rollData ?? options.relativeTo?.getRollData?.() ?? {},
	);
	const roll = new foundry.dice.Roll(
		formula,
		options.rollData ?? options.relativeTo?.getRollData?.() ?? {},
	);
	await roll.evaluate();
	if (roll.isDeterministic) linkConfig.value = roll.total;
	linkConfig.formula = formula;

	// Damage goes against armor then injuries, injury ignores armor, armor adds armor, heal removes injuries.
	const icon = {
		damage: "fa-burst",
		injury: "fa-heart-crack",
		armor: "fa-shield-alt",
		heal: "fa-staff-snake",
	}[type];

	linkConfig.type = "custom";
	linkConfig.action = type;
	linkConfig.tooltip = localize(`CURSEBORNE.Enrichers.Damage.Tooltip.${type}`, {
		_count: linkConfig.value,
		value: formula || linkConfig.value,
	});
	label ||= localize(`CURSEBORNE.Enrichers.Damage.Label.${type}`, {
		_count: linkConfig.value,
		value: linkConfig.value || formula,
	});

	return createLink(label, linkConfig, { icon });
}

/**
 * @param {HTMLEnrichedContentElement} element
 */
export async function onRender(element) {
	const link = element.querySelector("a");
	link.addEventListener("click", (event) => onDamageHeal(link, event));
}

/**
 * Apply damage or healing when the link is clicked.
 *
 * @param {HTMLElement} link
 * @param {MouseEvent} _event
 */
async function onDamageHeal(link, _event) {
	let { value, formula, action } = link.dataset;

	// Roll the formula if needed
	if (value === undefined && formula !== undefined) {
		const roll = new foundry.dice.Roll(formula);
		await roll.evaluate();
		value = roll.total;
	}

	const actors = new Set();
	/** @type {TokenDocument[]} */
	const tokens = canvas?.tokens?.controlled ?? [];
	for (const token of tokens) {
		/** @type {AccursedActor | AdversaryActor} */
		const actor = token.actor;
		if (!actor) continue;
		else if (actors.has(actor)) continue;
		else actors.add(actor);

		// Apply result to actors;
		// damage goes against armor first, then injuries
		// injury ignores armor and applies directly to injuries
		// armor adds armor
		// heal removes injuries
		switch (action) {
			case "heal": {
				await actor.modifyTokenAttribute("injuries.value", Number(value), true, false);
				break;
			}

			case "damage": {
				let remainingDamage = Number(value);
				const armor = actor.system.armor.value;
				if (armor > 0) {
					const armorAbsorb = Math.min(armor, remainingDamage);
					await actor.modifyTokenAttribute("armor.value", -armorAbsorb, true, false);
					remainingDamage -= armorAbsorb;
				}
				if (remainingDamage > 0) {
					await actor.modifyTokenAttribute("injuries.value", -remainingDamage, true, false);
				}
				break;
			}

			case "injury": {
				await actor.modifyTokenAttribute("injuries.value", -Number(value), true, false);
				break;
			}
		}

		// TODO: Create chat message?
	}
}
