// SPDX-FileCopyrightText: 2026 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { localize, SYSTEM_ID } from "@helpers/utils.mjs";
import { createLink, parseConfig } from "../helpers.mjs";

/**
 * @import { TextEditorEnricher, TextEditorEnricherConfig } from "@client/config.mjs";
 * @import HTMLEnrichedContentElement from "@client/applications/elements/enriched-content.mjs"
 */

/** @type { TextEditorEnricherConfig["id"] } */
export const id = "curseborne.resource";

/**
 * @typedef {typeof types[number]} EnricherType
 */

/**
 * Types of resource management handled by this enricher.
 */
const types = /** @type {const} */ ([
	// Generic markers for multiple types of resources, but determining the multiplier
	"gain",
	"spend", // spend is gain with a negative multiplier, but avoids negative numbers
	// Curse Dice specific markers
	"bleed",
	"hold",
]);

/**
 * Types that can be appended to a formula as shorthand, e.g. `[[/gain 2 momentum]]` instead of `[[/gain 2 type=momentum]]`.
 * If used as prefix, the type is assumed to be "gain" and the resource is set as per the used word.
 */
const resources = /** @type {const} */ ({
	momentum: {
		gain: {
			icon: "fa-gauge-circle-plus",
			label: "CURSEBORNE.Enrichers.resource.momentum.gain.label",
			tooltip: "CURSEBORNE.Enrichers.resource.momentum.gain.tooltip",
		},
		spend: {
			icon: "fa-gauge-circle-minus",
			label: "CURSEBORNE.Enrichers.resource.momentum.spend.label",
			tooltip: "CURSEBORNE.Enrichers.resource.momentum.spend.tooltip",
		},
	},
	curseDice: {
		gain: {
			icon: "fa-hand-sparkles",
			label: "CURSEBORNE.Enrichers.resource.curseDice.gain.label",
			tooltip: "CURSEBORNE.Enrichers.resource.curseDice.gain.tooltip",
		},
		spend: {
			icon: "fa-droplet",
			label: "CURSEBORNE.Enrichers.resource.curseDice.bleed.label",
			tooltip: "CURSEBORNE.Enrichers.resource.curseDice.bleed.tooltip",
		},
		hold: {
			icon: "fa-hand-holding-magic",
			label: "CURSEBORNE.Enrichers.resource.curseDice.hold.label",
			tooltip: "CURSEBORNE.Enrichers.resource.curseDice.hold.tooltip",
		},
	},
});

/**
 * The pattern should match `[[/spend 1 type=curseDice]]`, `[[/gain 1+@entanglement.value type=momentum]]`,
 * `[[/gain 2 momentum]]{Foo Bar}`, or `[[/hold 1 + 1]]`;
 * the first keyword is the trigger, and can define the {@link types}, or can be the {@link resources}.
 *
 * @type {TextEditorEnricherConfig["pattern"]}
 */
export const pattern = new RegExp(
	`\\[\\[/(?<action>${types.concat(Object.keys(resources)).join("|")})(?<config> .*?)?]](?!])(?:{(?<label>[^}]+)})?`,

	"gi",
);

/* ---------------------------------------------------------------------------------------------- */

/**
 * Enrich the text to become a proper link that can adjust the specified resource when clicked.
 *
 * @type {TextEditorEnricher}
 */
export async function enricher(match, options) {
	/** @type {{ type: EnricherType, label?: string, config: string }} */
	let { config, label, action } = match.groups;

	const parsedConfig = parseConfig(config);
	parsedConfig._input = match[0];

	// Determine actual type and resource, both of which should be provided once (through type or shorthand),
	// unless the resource is implied by the type (e.g. "bleed" and "hold" always refer to "curseDice").
	// "spend" is treated as "gain", but should be displayed as "Spend X <resource>" instead of "Gain -X <resource>"
	if (Object.keys(resources).includes(action)) {
		parsedConfig.action = "gain";
		parsedConfig.type = action;
	} else if (action === "bleed" || action === "hold") {
		parsedConfig.type = "curseDice";
		if (action === "bleed") parsedConfig.action = "spend";
		else if (action === "hold") parsedConfig.action = "hold";
	} else {
		parsedConfig.action ??= action;
	}

	// Check for resource shorthand
	if (
		["gain", "spend"].includes(parsedConfig.action) &&
		!parsedConfig.type &&
		parsedConfig.values.length > 1
	) {
		const lastValue = parsedConfig.values.at(-1);
		if (Object.keys(resources).includes(lastValue)) {
			parsedConfig.type = lastValue;
			parsedConfig.values.pop();
		}
	}

	if (!parsedConfig.action || !parsedConfig.type) {
		console.warn(`${SYSTEM_ID} | Resource enricher failed to parse config:`, parsedConfig);
		return null;
	}

	const linkConfig = {
		type: "custom",
		action: parsedConfig.action,
		resource: parsedConfig.type,
		formula: null,
	};
	const rollData = options.rollData ?? options.relativeTo?.getRollData?.() ?? {};

	// If the formula is deterministic, we can set the value for compact display and working pluralisation
	const roll = foundry.dice.Roll.create(parsedConfig.values.join(" "), rollData);
	await roll.evaluate();
	if (roll.isDeterministic) linkConfig.value = `${roll.total}`;
	const value = Number.isNumeric(linkConfig.value) ? Number(linkConfig.value) : null;

	// Set the formula for possibly more detailed display in the tooltip
	linkConfig.formula = roll.formula;

	if (!linkConfig.formula || !linkConfig.resource) return null;

	const icon = resources[linkConfig.resource]?.[linkConfig.action]?.icon;
	linkConfig.tooltip = localize(resources[linkConfig.resource]?.[linkConfig.action]?.tooltip, {
		_count: value,
		value: linkConfig.formula,
	});

	if (label) {
		return createLink(label, linkConfig, { classes: "roll-link", icon });
	}

	label = localize(resources[linkConfig.resource]?.[linkConfig.action]?.label, {
		_count: value,
		value: value || linkConfig.formula,
	});

	return createLink(label, linkConfig, { icon });
}

/* ---------------------------------------------------------------------------------------------- */

/**
 * @param {HTMLEnrichedContentElement} element
 */
export async function onRender(element) {
	const link = element.querySelector("a");
	link?.addEventListener("click", async (event) => onResource(link, event));
}

/* ---------------------------------------------------------------------------------------------- */

/**
 * Adjust the referenced resource according to the clicked link's data.
 *
 * @param {HTMLElement} link
 * @param {MouseEvent} _event
 */
async function onResource(link, _event) {
	const { formula, action, resource } = link.dataset;

	if (!formula || !action || !resource)
		throw new Error("Resource link is missing required data attributes");

	const roll = new foundry.dice.Roll(formula);
	await roll.evaluate();

	// Handle momentum separately, as it is a global resource and not actor-specific
	if (resource === "momentum") {
		switch (action) {
			case "gain": {
				if (game.user.isGM) return curseborne.applications.Momentum.spend(-roll.total);
				try {
					return curseborne.applications.Momentum.spend(-roll.total, {
						requiresConfirmation: true,
					});
				} catch (e) {
					ui.notifications.error(e.message);
					return;
				}
			}
			case "spend": {
				const momentum = game.settings.get(SYSTEM_ID, "momentum");
				if (roll.total > momentum) {
					ui.notifications.error(localize("CURSEBORNE.WARNING.NoMomentum"));
					return;
				}
				return curseborne.applications.Momentum.spend(roll.total);
			}
			default:
				throw new Error(`Unknown action "${action}" for resource "momentum"`);
		}
	}

	/** @type {Set<AccursedActor>} */
	const actors = new Set(
		canvas?.tokens?.controlled?.map((t) => t.actor).filter((a) => a?.type === "accursed"),
	);
	if (actors.size === 0) {
		ui.notifications.warn("CURSEBORNE.WARNING.NoTokenSelected", { localize: true });
		return;
	}

	if (resource === "curseDice") {
		switch (action) {
			case "gain":
			case "spend": {
				const multiplier = action === "gain" ? 1 : -1;
				const value = roll.total * multiplier;
				const abs = Math.abs(value);

				for (const actor of actors) {
					const current = actor.system.curseDice.value;
					if (current + value < 0) {
						ui.notifications.warn(
							localize("CURSEBORNE.Enrichers.resource.curseDice.bleed.warning", {
								_count: abs,
								value: abs,
								name: actor.name,
							}),
						);
						continue;
					}
					await actor.modifyTokenAttribute("curseDice.value", value, true, false);
				}

				return;
			}

			case "hold": {
				// Skip checks if no reasonable number is given
				if (roll.total <= 0) return;

				for (const actor of actors) {
					const current = actor.system.curseDice.value;
					if (current < roll.total) {
						ui.notifications.warn(
							localize("CURSEBORNE.Enrichers.resource.curseDice.hold.warning", {
								_count: roll.total,
								value: roll.total,
								name: actor.name,
							}),
						);
					}
				}
				return;
			}
		}
	}
}
