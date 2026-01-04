export class CurseborneCombatant extends foundry.documents.Combatant {
	/** @inheritDoc */
	async rollInitiative(options = {}) {
		if (typeof options === "string") {
			console.warn("CurseborneCombatant#rollInitiative does not accept a formula argument.");
		}

		options = foundry.utils.mergeObject(
			options,
			{ messageData: { system: { combatant: this.uuid } } },
			{ inplace: false },
		);

		const { roll } = await this.actor.system.rollInitiative(options);
		return this.update({ initiative: roll.surplus });
	}
}
