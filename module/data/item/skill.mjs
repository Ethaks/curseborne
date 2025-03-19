import { camelize } from "@helpers/utils.mjs";
import { IdentifierField } from "@models/fields/identifier.mjs";
import { DotsField } from "../fields/dots.mjs";
import { CurseborneItemBase, LimitedActorTypesItem } from "./base.mjs";
import { Path } from "./path.mjs";

export class Skill extends LimitedActorTypesItem(CurseborneItemBase) {
	/** @inheritDoc */
	static defineSchema() {
		const schema = super.defineSchema();
		const fields = foundry.data.fields;

		schema.identifier = new IdentifierField({ required: true });
		schema.dots = new DotsField({ max: 5 }, { label: "CURSEBORNE.Rank", required: true });

		return schema;
	}

	async roll(options) {
		if (this.actor) options = this.actor.system._prepareCommonRollOptions?.(options);
		return curseborne.dice.CurseborneRoll.createActorRoll({
			...options,
			data: {
				...options.data,
				sources: { skill: { value: `@skills.${this.identifier}.dots.value` } },
			},
			actor: this.actor,
			event,
		});
	}

	/**
	 * Whether this skill is a path skill of the owning actor.
	 *
	 * @type {boolean}
	 */
	get isPathSkill() {
		if (!this.actor) return false;
		return this.actor.items
			.filter((i) => i.system instanceof Path)
			.some((p) => p.system.skills.has(this.identifier));
	}

	prepareBaseData() {
		super.prepareBaseData();

		// The identifier for this skill,
		this.identifier ||= camelize(this.parent.name);

		if (this.actor) {
			this.actor.system.skills[this.identifier] = this;
		}
	}
}
