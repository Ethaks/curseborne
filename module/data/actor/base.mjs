import { ROLL_TYPE } from "@config/dice.mjs";
import { CurseborneRollContext } from "@dice/data.mjs";
import { toLabelObject } from "@helpers/utils.mjs";
import { DieSourceField } from "@models/fields/die-source.mjs";
import { DotsField } from "@models/fields/dots.mjs";
import { prepareIdentifiers } from "@models/fields/identifier.mjs";
import { CurseborneTypeDataModel } from "../base.mjs";

/** @import { RollModifier } from "@models/modifiers.mjs" */
/** @import { CurseborneRoll, ActorRollOptions, ActorRollResult } from "@dice/_module.mjs" */

export class CurseborneActorBase extends CurseborneTypeDataModel {
	/** @inheritDoc */
	static LOCALIZATION_PREFIXES = ["CURSEBORNE.Actor.base"];

	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		const requiredInteger = { required: true, nullable: false, integer: true };
		const schema = {};

		// common fields
		schema.biography = new fields.HTMLField();
		schema.defense = new fields.NumberField({
			...requiredInteger,
			initial: 1,
			min: 1,
		});

		schema.cover = new DotsField({
			current: new fields.StringField({
				required: true,
				blank: true,
				choices: () => toLabelObject(curseborne.config.coverTypes),
			}),
		});
		schema.injuries = new DotsField({ max: 1 });
		schema.armor = new DotsField({ max: 0 });

		return schema;
	}

	/* ---------------------------------------------------------------------------------------------- */
	/*                                       Data Preparation                                        */
	/* --------------------------------------------------------------------------------------------- */

	/** @inheritDoc */
	prepareBaseData() {
		super.prepareBaseData();

		// Prepare identifiers for embedded items and store references in this model
		for (const [itemType, items] of Object.entries(this.parent.itemTypes)) {
			const model = CONFIG.Item.dataModels[itemType];
			if (!model?.metadata?.hasIdentifier) continue;
			const map = prepareIdentifiers(items.map((i) => i.system));
			const path = model.metadata?.identifierCollectionName || `${itemType}s`;
			this[path] = map.entries().reduce((acc, [id, model]) => {
				acc[id] = model;
				return acc;
			}, {});
		}
	}

	/* ---------------------------------------------------------------------------------------------- */
	/*                                             Rolls                                             */
	/* --------------------------------------------------------------------------------------------- */

	/**
	 * The rolls currently in-progress by this actor.
	 *
	 * @type {Record<string, { roll: CurseborneRoll, promise: Promise<ActorRollResult>, resolve: Function, reject: Function }>}
	 */
	#rolls = {};
	/** {@inheritDoc CurseborneActorBase#rolls} */
	get rolls() {
		return this.#rolls;
	}

	/**
	 * Merge provided roll options into common options for rolls made by this actor.
	 *
	 * @param {object} options - The options to merge.
	 */
	_prepareCommonRollOptions(options) {
		options.messageData ??= {};
		options.messageData.speaker ??=
			options.speaker ||
			foundry.documents.ChatMessage.implementation.getSpeaker({
				actor: this.parent,
			});

		options.skipDialog ??= false;
		options.chatMessage ??= true;

		options.data ??= {};
		options.data.rollData ??= this.actor.getRollData();
		options.actor ??= this.actor;

		options.dialogOptions ??= {};
		options.dialogOptions.modifiers ??= {};
		for (const type of ["enhancements", "complications", "difficulties"]) {
			const modifiers = this._getModifierChoices(type);
			options.dialogOptions.modifiers[type] = {
				// Include already added modifiers from context to preserve them as chocies
				...(options.data[type] ?? {}),
				// And add regularly discovered ones
				...modifiers,
			};
		}

		return options;
	}

	/**
	 * Create a roll associated with this actor.
	 *
	 * @param {import("@dice/roll.mjs").ActorRollOptions["type"]} [type=ROLL_TYPE.GENERAL] - The type of roll to create.
	 * @param {import("@dice/roll.mjs").ActorRollOptions} [options={}] - Additional options for the roll.
	 * @returns {Promise<ActorRollResult>} The created roll.
	 */
	async _createRoll(
		type = ROLL_TYPE.GENERAL,
		{
			data = {},
			messageData = {},
			dialogOptions = {},
			message = {},
			skipDialog = false,
			chatMessage = true,
			...options
		} = {},
	) {
		const progressRoll = this.rolls[type];
		if (type in this.rolls && progressRoll) {
			progressRoll.roll.initialize(data);
			progressRoll.roll.renderDialog();
			progressRoll.roll.dialog.bringToFront();
			return progressRoll.promise;
		}

		data.type = type;
		const actor = options.actor || this.actor;
		// data.actor ??= actor;
		const rollData = new CurseborneRollContext(data, { parent: actor });
		const roll = new curseborne.dice.CurseborneRoll(rollData, {
			...options,
		});
		roll.initialize();
		let task = this.rolls[type];

		if (!skipDialog) {
			try {
				task = Promise.withResolvers();
				this.rolls[type] = { roll, ...task };
				roll.dialog = new curseborne.applications.dialogs.CurseborneRollDialog({
					roll,
					object: rollData,
					actor,
					...dialogOptions,
				});
				await roll.dialog.render({ force: true });
				await roll.dialog.wait();
			} catch (error) {
				task.reject(error);
				throw error;
			} finally {
				// Unregister roll once it is configured
				if (actor.system.rolls[type]?.roll === roll) delete actor.system.rolls[type];
			}
		}

		if (chatMessage) {
			messageData.flavor ||= roll.data.sources
				.filter((s) => s.type !== "")
				.map((s) => {
					const choiceData = DieSourceField.getChoices(s.type, actor);
					const label = choiceData.choices.find((c) => c.value === s.value)?.label || "";
					// Replace spaces with non-breaking spaces
					return label.replace(/ /g, "\u00A0");
				})
				.filterJoin(", ");
			const message = await roll.toMessage(messageData);
			const result = { roll: message.rolls[0], message };
			task.resolve({ ...result });
			return { ...result };
		}

		await roll.evaluate();
		task.resolve({ roll });
		return { roll };
	}

	/**
	 * Handle model-specific alterations to an in-progress roll during its initialization.
	 *
	 * @param {CurseborneRoll} roll - The roll being initialized.
	 */
	_onRollInitialize(roll) {}

	/**
	 * Get the available choices for a modifier type.
	 *
	 * @param {"enhancements" | "complications" | "difficulties"} type - The type of modifier to get choices for.
	 * @returns {Record<string, ModifierChoice>}
	 */
	_getModifierChoices(type) {
		const choices = {};
		for (const item of this.actor.items.filter((i) => i.system[type])) {
			for (const modifier of item.system[type]) {
				// const id = `${item.getRelativeUUID(this.actor)}.${modifier.id}`.slugify({ strict: true });
				const id = modifier.slug;
				choices[id] = { ...modifier, id };
			}
		}
		for (const effect of this.actor.allApplicableEffects()) {
			if (effect.disabled) continue;
			for (const modifier of effect.system[type]) {
				// const id = `${effect.getRelativeUUID(this.actor)}.${modifier.id}`.slugify({
				// 	strict: true,
				// });
				const id = modifier.slug;
				choices[id] = { ...modifier, id };
			}
		}

		return choices;
	}
}
