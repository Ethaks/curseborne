import { ROLL_TYPE } from "@config/dice.mjs";
import { DotsField } from "../fields/dots.mjs";
import { CurseborneActorBase } from "./base.mjs";

/** @import {ActorRollOptions} from "@dice/roll" */

export class Adversary extends CurseborneActorBase {
	/** @inheritDoc */
	static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "CURSEBORNE.Actor.Adversary"];

	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		const requiredInteger = { required: true, nullable: false, integer: true };
		const requiredString = { required: true, nullable: false, initial: "" };
		const schema = super.defineSchema();

		schema.drive = new fields.HTMLField();

		schema.pools = new fields.SchemaField({
			primary: new fields.SchemaField({
				value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
				categories: new fields.StringField({ initial: "" }),
			}),
			secondary: new fields.SchemaField({
				value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
				categories: new fields.StringField({ initial: "" }),
			}),
			desperation: new fields.SchemaField({
				value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
				categories: new fields.StringField({ initial: "" }),
			}),
		});

		schema.enhancements = new fields.SetField(
			new fields.SchemaField({
				action: new fields.StringField({ ...requiredString }),
				value: new fields.NumberField({ ...requiredInteger }),
			}),
		);

		schema.integrity = new fields.NumberField({
			...requiredInteger,
			initial: 0,
		});
		schema.defense = new fields.NumberField({
			...requiredInteger,
			initial: 0,
			min: 0,
		});
		schema.injuries = new DotsField({});
		schema.armor = new DotsField({});
		schema.initiative = new fields.NumberField({
			...requiredInteger,
			initial: 0,
		});
		schema.special = new fields.StringField();

		return schema;
	}

	prepareDerivedData() {
		super.prepareDerivedData();

		this.injuries.value = Math.min(this.injuries.value, this.injuries.max);
		this.armor.value = Math.min(this.armor.value, this.armor.max);
	}

	/**
	 * Create a generic pool roll for this adversary.
	 *
	 * @param {Pool} pool - The pool to roll.
	 * @param {ActorRollOptions} options - Additional options for the roll.
	 * @returns {Promise<ActorRollResult>}
	 */
	async roll(pool, options = {}) {
		this._prepareCommonRollOptions(options);

		options.data ??= {};
		options.data.sources = {
			pool: { type: "pool", value: `@pools.${pool}.value` },
		};

		options.dialogOptions ??= {};
		options.dialogOptions.show ??= {};
		options.dialogOptions.show.curseDice = false;

		return curseborne.dice.CurseborneRoll.createActorRoll({
			type: ROLL_TYPE.POOL,
			...options,
			actor: this.parent,
		});
	}
}
