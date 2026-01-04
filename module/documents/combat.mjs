export class CurseborneCombat extends foundry.documents.Combat {
	/**
	 * @inheritDoc
	 * @param {ID | ID[]} ids - A Combatant id or Array of Combatant ids to roll initiative for
	 * @param {object} [options={}] - Additional options passed to the roll
	 * @param {object} [options.messageOptions={}] - Additional options passed to the ChatMessage creation
	 */
	async rollInitiative(ids, { messageOptions = {} } = {}) {
		ids = typeof ids === "string" ? [ids] : ids;

		for (const id of ids) {
			const combatant = this.combatants.get(id);
			if (!combatant?.actor) continue;
			// TODO: messageOptions?
			await combatant.rollInitiative();
		}
	}
}
