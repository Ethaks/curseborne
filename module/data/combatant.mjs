import { CurseborneTypeDataModel } from "./base.mjs";

export class CurseborneCombatant extends CurseborneTypeDataModel {
	/** @inheritDoc */
	static defineSchema() {
		const schema = super.defineSchema();
		const fields = foundry.data.fields;
		// An array of of combatants, where the index is the round for which the combatants is designated to act after this one
		schema.next = new fields.ArrayField(
			new fields.ForeignDocumentField(foundry.documents.BaseCombatant),
		);
		schema.acted = new fields.BooleanField({ required: true, initial: false });
		return schema;
	}

	/** @type {CurseborneCombat} */
	get combat() {
		return this.parent.combat;
	}

	nextInRound(round) {
		let combatantId;
		if (round) combatantId = this.next[round];
		else combatantId = this.next[this.combat.round];

		if (combatantId) return this.combat.combatants.get(combatantId);
		return null;
	}
}
