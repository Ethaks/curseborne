// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

/** @import { CurseborneActor } from "@documents/actor.mjs"; */

/**
 * Begin a new Curseborne session, resetting some data on player characters.
 *
 * @param {Array<string, CurseborneActor, foundry.canvas.placeables.Token, foundry.documents.TokenDocument>} [actors] - An array of Actor IDs for which to start a session
 * @param {object} [options] - Additional options for the session
 * @param {boolean} [options.curseDice=true] - Whether to reset the Curse Dice for each player
 * @param {boolean} [options.bonds=true] - Whether to refresh the bond enhancement pools for each player
 * @param {boolean} [options.contacts=true] - Whether to reset the contact invoke counter for each player
 * @returns {Promise<void>} A Promise that resolves once all updates have been made
 */
export async function startSession(
	actors,
	{ curseDice = true, bonds = true, contacts = true } = {},
) {
	actors = getActors(actors);
	const actorUpdates = actors.map(async (actor) => {
		const update = {};
		if (curseDice && actor.system.curseDice.value < 1) update["system.curseDice.value"] = 1;

		if (bonds || contacts) {
			for (const social of actor.itemTypes.social) {
				const itemUpdates = {};
				if (bonds) {
					const { value, max } = social.system.bond.uses;
					if (value < max) {
						itemUpdates["system.bond.uses.value"] = max;
					}
				}
				if (contacts) {
					if (social.system.contact.invokes > 0) {
						itemUpdates["system.contact.invokes"] = 0;
					}
				}
				if (!foundry.utils.isEmpty(itemUpdates)) {
					itemUpdates._id = social.id;
					update.items ??= [];
					update.items.push(itemUpdates);
				}
			}
		}

		if (!foundry.utils.isEmpty(update)) {
			return actor.update(update);
		}
		return null;
	});
	const result = await Promise.all(actorUpdates);
	result.filter((update) => update !== null);
	return result;
}

/**
 * Begin a new Curseborne scene, resetting some data on the scene.
 *
 * @param {Array<string, CurseborneActor | foundry.canvas.placeables.Token | foundry.documents.TokenDocument>} [actors] - An array of Actor or Actor (UU)IDs for which to progress a scene
 * @param {object} [options] - Additional options for the scene
 * @returns {Promise<void>} A Promise that resolves once all updates have been made
 */
export async function startScene(actors, { durations = true } = {}) {
	// TODO: Implement
}

/**
 * Given an array of actors, actor UUIDs, and actor IDs, return an array of Actor instances.
 *
 * @param {Array<string | CurseborneActor | foundry.canvas.placeables.Token | foundry.documents.TokenDocument>} actors - An array of Actor or Actor (UU)IDs
 * @returns {foundry.documents.Actor[]} An array of Actor instances
 */
export function getActors(actors) {
	return actors
		.map((a) => {
			let actor = null;
			if (a instanceof foundry.documents.Actor) actor = a;
			else if (
				a instanceof foundry.documents.TokenDocument ||
				a instanceof foundry.canvas.placeables.Token
			)
				actor = a.actor;
			else if (game.actors.has(a)) actor = game.actors.get(a);
			else actor = foundry.utils.parseUuid(a) ?? null;
			return actor;
		})
		.filter((a) => a !== null);
}
