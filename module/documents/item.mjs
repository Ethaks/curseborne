// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class CurseborneItem extends foundry.documents.Item {
	/**
	 * Augment the basic Item data model with additional dynamic data.
	 */
	prepareData() {
		// As with the actor class, items are documents that can have their data
		// preparation methods overridden (such as prepareBaseData()).
		super.prepareData();
	}

	/**
	 * Prepare a data object which defines the data schema used by dice roll commands against this Item
	 * @override
	 */
	getRollData() {
		const rollData = this.actor?.getRollData() ?? {};
		rollData.item = { ...this.system };
		return rollData;
	}

	/**
	 * Handle clickable rolls.
	 * @param {Event} event   The originating click event
	 * @private
	 */
	async roll(event) {
		// Initialize chat data.
		const speaker = foundry.documents.ChatMessage.implementation.getSpeaker({
			actor: this.actor,
		});
		const rollMode = game.settings.get("core", "rollMode");
		const label = `[${this.type}] ${this.name}`;

		// If there's no roll data, send a chat message.
		if (!this.system.formula) {
			foundry.documents.ChatMessage.implementation.create({
				speaker: speaker,
				rollMode: rollMode,
				flavor: label,
				content: this.system.description ?? "",
			});
		}
		// Otherwise, create a roll and send a chat message from it.
		else {
			// Retrieve roll data.
			const rollData = this.getRollData();

			// Invoke the roll and submit it to chat.
			const roll = new foundry.dice.Roll(rollData.formula, rollData.actor);
			// If you need to store the value first, uncomment the next line.
			// const result = await roll.evaluate();
			roll.toMessage({
				speaker: speaker,
				rollMode: rollMode,
				flavor: label,
			});
			return roll;
		}
	}
}
