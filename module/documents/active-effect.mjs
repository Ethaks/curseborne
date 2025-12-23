// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { staticID } from "@helpers/utils.mjs";

export class CurseborneActiveEffect extends foundry.documents.ActiveEffect {
	/* -------------------------------------------- */
	/*  Status Effects                              */
	/* -------------------------------------------- */
	/**
	 * Merge Foundry's status effects into the system's conditions where possible,
	 * and set status effects to only contain the system's conditions.
	 *
	 * @see {@link CONFIG.statusEffects}
	 * @see {@link curseborne.config.STATUS_EFFECTS}
	 */
	static _configureStatusEffects() {
		/**
		 * A reducer function for transforming a system's condition into a status effect,
		 * optionally registering it as a special status effect.
		 *
		 * @param {object[]} effects - The array of status effects.
		 * @param {StatusEffectConfigMM3} data - The condition data.
		 * @param {string} [special] - Whether the status effect is a special status effect.
		 */
		const addEffect = (effects, { special, ...data }) => {
			data = foundry.utils.deepClone(data);
			data._id = staticID(`curse${data.id}`);
			data.img ||= "icons/svg/cowled.svg";
			for (const modifierType of ["enhancements", "complications"]) {
				for (const modifier of Object.values(data.system?.[modifierType] ?? {})) {
					modifier.label ||= data.name;
				}
			}
			effects.push(data);
			if (special) CONFIG.specialStatusEffects[special] = data.id;
		};

		CONFIG.statusEffects = Object.entries(curseborne.config.STATUS_EFFECTS).reduce(
			(arr, [id, data]) => {
				const original = CONFIG.statusEffects.find((e) => e.id === id);
				addEffect(
					arr,
					foundry.utils.mergeObject(original ?? {}, { id, ...data }, { inplace: false }),
				);
				return arr;
			},
			[],
		);
	}

	/** @inheritDoc */
	static async _fromStatusEffect(statusId, effectData, options) {
		// Localize modifiers
		for (const modifierType of ["enhancements", "complications", "difficulties"]) {
			for (const modifier of Object.values(effectData.system?.[modifierType] ?? {})) {
				const hasLocalizedLabel = game.i18n.has(modifier.label);
				modifier.label = hasLocalizedLabel ? game.i18n.localize(modifier.label) : effectData.name;
				const hasLocalizedHint = game.i18n.has(modifier.hint);
				modifier.hint = hasLocalizedHint ? game.i18n.localize(modifier.hint) || "" : "";
			}
		}
		return super._fromStatusEffect(statusId, effectData, options);
	}

	/* -------------------------------------------- */
	/*  Pata Preparation                            */
	/* -------------------------------------------- */
	/** @inheritDoc */
	_prepareDuration() {
		return this.system?._prepareDuration?.() ?? super._prepareDuration();
	}
}
