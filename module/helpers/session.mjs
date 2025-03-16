/**
 * Begin a new Curseborne session, resetting some data on player characters.
 *
 * @param {string[]} [actors] - An array of Actor IDs for which to start a session; defaults to all player characters
 * @param {object} [options] - Additional options for the session
 * @param {boolean} [options.curseDice=true] - Whether to reset the Curse Dice for each player
 * @param {boolean} [options.bonds=true] - Whether to refresh the bond enhancement pools for each player
 * @param {boolean} [options.contacts=true] - Whether to reset the contact invoke counter for each player
 * @returns {Promise<void>} A Promise that resolves once all updates have been made
 */
export function startSession(actors, { curseDice = true, bonds = true, contacts = true } = {}) {
	const actorUpdates = actors.map((id) => {
		const actor = game.actors.get(id);
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
			update._id = actor.id;
			return update;
		}
		return null;
	});
	return foundry.documents.Actor.updateDocuments(actorUpdates.filter((update) => update !== null));
}

/**
 * Begin a new Curseborne scene, resetting some data on the scene.
 *
 * @param {object} [options] - Additional options for the scene
 * @returns {Promise<void>} A Promise that resolves once all updates have been made
 */
export function startScene() {}
