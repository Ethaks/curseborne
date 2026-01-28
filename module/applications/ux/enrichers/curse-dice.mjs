// SPDX-FileCopyrightText: 2026 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { CurseborneRoll } from "@dice/roll.mjs";
import { localize } from "@helpers/utils.mjs";
import { createLink, parseConfig } from "../helpers.mjs";

/**
 * @import { TextEditorEnricher, TextEditorEnricherConfig } from "@client/config.mjs";
 * @import HTMLEnrichedContentElement from "@client/applications/elements/enriched-content.mjs"
 */

/**
 * @typedef {"bleed" | "hold" | "gain"} CurseDiceActionType
 */

/** @type { TextEditorEnricherConfig["id"] } */
export const id = "curseborne.curseDice";

/* ---------------------------------------------------------------------------------------------- */

/** @type {TextEditorEnricherConfig["pattern"]} */
// The pattern should match `[[/curseDice 1 type=gain]]`, or `[[/bleed value=2+1]]{Bleed 2 Curse Dice}`, or `[[/hold 3]]` where the trigger is "curseDice".
export const pattern =
	/\[\[\/(?<type>curseDice|bleed|hold|gain)(?<config> .*?)?]](?!])(?:{(?<label>[^}]+)})?/gi;

/* ---------------------------------------------------------------------------------------------- */

/**
 * Enricher to change the number of curse dice
 *
 * @type {TextEditorEnricher}
 */
export async function enricher(match, options) {
	let { config, label, type } = match.groups;

	const parsedConfig = parseConfig(config);
	parsedConfig._input = match[0];

	const linkConfig = {};

	if (parsedConfig.type) type = parsedConfig.type;
	if (!type) return;

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

	/** @type {Record<CurseDiceActionType, string>} */
	const icon = {
		bleed: "fa-droplet",
		hold: "fa-hand-holding-magic",
		gain: "fa-hand-sparkles",
	}[type];
	const defaultLabel = {
		bleed: "CURSEBORNE.Item.Spell.FIELDS.cost.BleedX",
		hold: "CURSEBORNE.Item.Spell.FIELDS.cost.HoldX",
		gain: "CURSEBORNE.Item.Spell.FIELDS.cost.GainX",
	}[type];

	linkConfig.type = "custom";
	linkConfig.action = type;
	linkConfig.tooltip = localize(`CURSEBORNE.Enrichers.CurseDice.${type}.Tooltip`, {
		_count: linkConfig.value,
		value: formula || linkConfig.value,
	});
	label ||= localize(defaultLabel, {
		_count: linkConfig.value,
		value: formula || linkConfig.value,
	});

	return createLink(label, linkConfig, { icon });
}

/* ---------------------------------------------------------------------------------------------- */

/**
 * @param {HTMLEnrichedContentElement} element
 */
export async function onRender(element) {
	const link = element.querySelector("a");
	link.addEventListener("click", (event) => onCurseDiceClick(link, event));
}

/* ---------------------------------------------------------------------------------------------- */

/**
 * Increase or reduce the number of curse dice of a selected token, or emit a warning if there are not enough curse dice held.
 *
 * @param {HTMLAnchorElement} link
 * @param {MouseEvent} event
 */
async function onCurseDiceClick(link, event) {
	/** @type {{value?: string, formula?: string, action: CurseDiceActionType}} */
	let { value, formula, action } = link.dataset;

	if (value === undefined && formula !== undefined) {
		const roll = new foundry.dice.Roll(formula);
		await roll.evaluate({ async: true });
		value = roll.total;
	}

	/** @type {Set<AccursedActor>} */
	const actors = new Set();
	const tokens = canvas?.tokens?.controlled ?? [];
	for (const token of tokens) {
		/** @type {AccursedActor | AdversaryActor} */
		const actor = token.actor;
		if (!actor) continue;
		else if (actors.has(actor)) continue;
		else if (actor.type !== "accursed") continue;
		else actors.add(actor);

		switch (action) {
			case "gain":
			case "bleed": {
				const multiplier = action === "gain" ? 1 : -1;
				value = Number(value) * multiplier;
				const { value: current } = actor.system.curseDice.value;
				if (current + value <= 0) {
					ui.notifications.warn("CURSEBORNE.WARNING.NoCurseDice", {
						localize: true,
					});
					return;
				}
				await actor.modifyTokenAttribute("curseDice.value", value, true, false);
				break;
			}

			case "hold": {
				const current = actor.system.curseDice.value;
				if (current < value) {
					ui.notifications.warn("CURSEBORNE.WARNING.NoCurseDice", {
						localize: true,
					});
				}
				break;
			}
		}
	}
}
