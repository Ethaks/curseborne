// SPDX-FileCopyrightText: 2026 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { CurseborneActiveEffect } from "@documents/active-effect.mjs";
import { camelize, localize } from "@helpers/utils.mjs";
import { createLink, parseConfig } from "../helpers.mjs";

/**
 * @import { ActiveEffectData } from "@common/documents/_types.mjs";
 * @import { TextEditorEnricher, TextEditorEnricherConfig } from "@client/config.mjs";
 * @import HTMLEnrichedContentElement from "@client/applications/elements/enriched-content.mjs"
 * @import { ParsedConfig } from "../helpers.mjs";
 */

/** @type { TextEditorEnricherConfig["id"] } */
export const id = "curseborne.apply";

/* ---------------------------------------------------------------------------------------------- */

/** @type {TextEditorEnricherConfig["pattern"]} */
export const pattern = /\[\[\/(?<type>apply)(?<config> .*?)?]](?!])(?:{(?<label>[^}]+)})?/gi;

/* ---------------------------------------------------------------------------------------------- */

/**
 * Enricher to apply an active effect.
 *
 * @type {TextEditorEnricher}
 */
export async function enricher(match, options) {
	let { config, label } = match.groups;

	const parsedConfig = parseConfig(config);
	parsedConfig._input = match[0];

	const linkConfig = {};

	if (parsedConfig.status) linkConfig.status = parsedConfig.status;
	if (parsedConfig.uuid) linkConfig.uuid = parsedConfig.uuid;
	if (options.relativeTo) linkConfig.origin = options.relativeTo.uuid;

	const doc = ["Actor", "Item"].includes(options.relativeTo?.documentName)
		? options.relativeTo
		: null;

	for (const val of parsedConfig.values) {
		const camelized = camelize(val);
		// ID, Name, or Identifier
		if (doc) {
			const effect =
				doc.effects.get(val) ||
				doc.effects.getName(val) ||
				doc.effects.find((e) => e.system.identifier === val || e.system.identifier === camelized);
			if (effect) {
				linkConfig.type = "custom";
				linkConfig.uuid = effect.uuid;
				parsedConfig.name ||= effect.name;
				continue;
			}
		}

		// TODO: Duration for scene etc.

		// Status Effect
		const status = CONFIG.statusEffects.find((s) => s.id === camelized);
		if (status) {
			linkConfig.type = "status";
			linkConfig.status = status.id;
			parsedConfig.name ||= localize(status.name);
			continue;
		}

		// Relative UUID
		const uuidInfo = foundry.utils.parseUuid(val, { relative: options.relativeTo });
		if (uuidInfo.type === "ActiveEffect") {
			linkConfig.type = "custom";
			linkConfig.uuid = uuidInfo.uuid;
			const effect = await foundry.utils.fromUuid(uuidInfo.uuid);
			if (effect) parsedConfig.name ||= effect.name;
		}
	}

	if (!linkConfig.type) return null;

	if (parsedConfig.name)
		linkConfig.tooltip = localize("CURSEBORNE.Enrichers.ApplyEffect.LinkTooltip", {
			name: parsedConfig.name,
		});

	label ||= parsedConfig.name;

	return createLink(label, linkConfig, { icon: "fa-person-rays" });
}

/**
 * @param {HTMLEnrichedContentElement} element
 */
export async function onRender(element) {
	const link = element.querySelector("a");
	link.addEventListener("click", onClickAnchor);
	// TODO: Add contextmenu listener to open effect's sheet (for docs) or journal sheet (for status effects)
}

/**
 * Apply an effect to the selected token's actor.
 *
 * @this {HTMLAnchorElement}
 * @returns {Promise<void>}
 */
async function onClickAnchor() {
	const tokens = canvas?.tokens?.controlled ?? [];
	if (!tokens.length) {
		ui.notifications.error("CURSEBORNE.Enrichers.ApplyEffect.NoSelection", { localize: true });
		return;
	}

	const tempEffect =
		this.dataset.type === "custom"
			? (await foundry.utils.fromUuid(this.dataset.uuid)).clone(
					{},
					{ keepdId: true, addSource: true },
				)
			: await CurseborneActiveEffect.fromStatusEffect(this.dataset.status);

	const updates = {
		transfer: true,
		origin: this.dataset.origin,
		system: {},
	};
	tempEffect.updateSource(updates);

	const actors = new Set();

	for (const token of tokens) {
		const actor = token.actor;
		if (!actor) continue;
		else if (actors.has(actor)) continue;
		else actors.add(actor);

		const existing = actor.effects.get(tempEffect.id);
		if (existing?.disabled) await existing.delete();

		actor.createEmbeddedDocuments("ActiveEffect", [tempEffect.toObject()], { keepId: true });

		if (this.dataset.type !== "status") {
			canvas.interface.createScrollingText(
				token.center,
				localize("CURSEBORNE.Enrichers.ApplyEffect.CreateText", { name: tempEffect.name }),
				{ fill: "white", fontSize: 32, stroke: 0x000000, strokeThickness: 4 },
			);
		}
	}
}
