// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { COMPLICATION, DIFFICULTY, ROLL_TYPE } from "@config/dice.mjs";
import { requiredInteger } from "@helpers/utils.mjs";
import { DotsField } from "@models/fields/dots.mjs";
import { CurseborneItemBase } from "./base.mjs";
import { Path } from "./path.mjs";

export class Social extends CurseborneItemBase {
	static LOCALIZATION_PREFIXES = ["CURSEBORNE.SOCIAL"];
	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			...super.defineSchema(),
			type: new fields.StringField({
				default: "bond",
				required: true,
				initial: "bond",
				choices: {
					bond: "CURSEBORNE.SOCIAL.Bond",
					contact: "CURSEBORNE.SOCIAL.Contact",
				},
			}),
			uuid: new fields.DocumentUUIDField({ required: true, nullable: true }),

			bond: new fields.SchemaField({
				dots: new DotsField({ max: 5 }, { required: true }),
				uses: new DotsField({ max: 5 }, { required: true }),
			}),

			contact: new fields.SchemaField({
				dots: new DotsField({ max: 3 }, { required: true }),
				invokes: new fields.NumberField({ ...requiredInteger, initial: 0 }),
				path: new fields.ForeignDocumentField(foundry.documents.Item, {
					required: true,
					nullable: true,
					idOnly: true,
				}),
				tags: new fields.SetField(new fields.StringField({ required: true, blank: false }), {
					required: true,
					initial: [],
				}),
			}),
		};
	}

	/** @inheritDoc */
	async _preCreate(data, options, user) {
		const allowed = await super._preCreate(data, options, user);
		if (allowed === false) return false;

		const updateData = {};
		if (data.system?.uuid) {
			const doc = foundry.utils.fromUuidSync(data.system.uuid);
			if (doc) {
				updateData.name = doc.name;
				if (doc instanceof foundry.documents.Actor) updateData.img = doc.img;
			}
		}
		this.updateSource(updateData);
	}

	/** @inheritDoc */
	async _preUpdate(changes, options, user) {
		const allowed = await super._preUpdate(changes, options, user);
		if (allowed === false) return false;

		if (changes.system?.uuid && changes.system?.uuid !== this.uuid) {
			const doc = foundry.utils.fromUuidSync(changes.system.uuid);
			if (doc) {
				changes.name = doc.name;
				if (doc instanceof foundry.documents.Actor) changes.img = doc.img;
			}
		}
	}

	/** @inheritDoc */
	prepareBaseData() {
		super.prepareBaseData();

		// Prepare bond
		this.bond.uses.max = this.bond.dots.value;
		this.bond.uses.value = Math.min(this.bond.uses.value, this.bond.uses.max);
	}

	async prepareSheetContext(context) {
		if (this.type === "contact") {
			const pathEntries =
				this.actor?.items
					.filter((i) => i.system instanceof Path)
					.map((path) => [path.id, path.name]) ?? [];
			context.pathChoices = Object.fromEntries(pathEntries);
		}
	}

	/**
	 * Create a new roll based on this contact, either by letting the contact roll, or by invoking the contact.
	 *
	 * @param {import("@dice/data.mjs").ActorRollOptions} options - Additional options for the roll
	 * @returns {Promise<import("@dice/data.mjs").ActorRollResult>}
	 */
	async roll(options = {}) {
		// Bond cannot be rolled
		if (this.type === "bond") {
			const errorMsg = game.i18n.format("CURSEBORNE.ERROR.CannotRollItem", {
				type: game.i18n.localize("CURSEBORNE.SOCIAL.Bond"),
			});
			ui.notifications.error(errorMsg);
			throw new Error(errorMsg);
		}

		if (!this.actor) throw new Error("Contact must be owned by an actor to roll");

		options = this.actor.system._prepareCommonRollOptions(options);
		const type = (options.type ?? options.event.shiftKey) ? "roll" : "invoke";

		const addModifier = (type, id, value) => {
			options.data[type] ??= {};
			options.data[type][id] = value;

			options.dialogOptions ??= {};
			options.dialogOptions.modifiers ??= {};
			options.dialogOptions.modifiers[type] ??= {};
			options.dialogOptions.modifiers[type][id] = value;
		};

		addModifier("enhancements", "contact", {
			value: this.contact.dots.value,
			label: game.i18n.localize("CURSEBORNE.DotRating"),
		});
		options.data.difficulty = DIFFICULTY.ROUTINE;

		if (type === "roll" && this.bond?.uses.value > 0) {
			addModifier("enhancements", "bond", {
				value: this.bond.dots.value,
				stacking: true,
				label: game.i18n.localize("CURSEBORNE.Item.Bond.Enhancement"),
			});
		}

		// Add complication for repeat invokes
		if (this.contact.invokes > 0) {
			if (this.contact.invokes === 1) {
				addModifier("complications", "contact", {
					value: COMPLICATION.MINOR,
					label: game.i18n.localize("CURSEBORNE.Item.Contact.Complication"),
				});
			} else {
				addModifier("complications", "contact", {
					value: COMPLICATION.MAJOR,
					label: game.i18n.localize("CURSEBORNE.Item.Contact.Complication"),
				});
			}
		}

		// Contacts rolling for themselves do not use curse dice?
		if (type === "roll") {
			delete options.data.curseDice;
			options.messageData.flavor = game.i18n.format("CURSEBORNE.Item.Contact.RollName", {
				name: this.parent.name,
			});
		}

		// When invoking a contact, the choice of skills is limited to the skills of the path granting the contact
		if (type === "invoke") {
			const path = this.actor.items.get(this.contact.path);
			const skills = Array.from(path?.system.skills ?? []).map(
				(skill) => this.actor.system.skills[skill].parent,
			);
			options.data.sources = {
				skill: {
					type: "skill",
					value: skills.length ? `@skills.${skills[0].system.identifier}.dots.value` : "",
					choices: skills.length
						? Object.fromEntries(skills.map((skill) => [skill.system.identifier, skill]))
						: undefined,
				},
			};
			options.messageData.flavor = game.i18n.format("CURSEBORNE.Item.Contact.InvokeName", {
				name: this.parent.name,
			});
		}

		const roll = await this.actor.system._createRoll(
			type === "invoke" ? ROLL_TYPE.CONTACT_INVOKE : ROLL_TYPE.CONTACT_SELF,
			options,
		);

		const updateData = {};
		if (roll.roll) {
			// Update contact invokes
			if (this.type === "contact") {
				foundry.utils.setProperty(updateData, "system.contact.invokes", this.contact.invokes + 1);
			}

			// If the bond was used, decrease available uses
			if (roll.roll.data.enhancements.get("bond")) {
				foundry.utils.setProperty(updateData, "system.bond.uses.value", this.bond.uses.value - 1);
			}
		}
		if (!foundry.utils.isEmpty(updateData)) await this.parent.update(updateData);

		return roll;
	}

	/** @inheritDoc */
	async _prepareEmbedContext(config, options) {
		const context = await super._prepareEmbedContext(config, options);
		context.subtitle = game.i18n.localize(`CURSEBORNE.SOCIAL.${this.type.capitalize()}`);

		if (this.type === "bond") {
			// Add bonds rating as subtitle for bonds
			context.subtitle += this.schema.fields.bond.fields.dots.toInput({
				value: this.bond.dots.value,
				max: this.bond.dots.max,
				disabled: true,
			}).outerHTML;
		} else if (this.type === "contact") {
			// Add contact rating as subtitle for contacts
			context.subtitle += this.schema.fields.contact.fields.dots.toInput({
				value: this.contact.dots.value,
				max: this.contact.dots.max,
				disabled: true,
			}).outerHTML;
		}

		// Add bond rating as detail for contacts with bonds
		if (this.bond.dots.value && this.type !== "bond") {
			context.details.push({
				label: this.schema.fields.bond.fields.dots.label,
				valueElement: this.schema.fields.bond.fields.dots.toInput({
					value: this.bond.dots.value,
					max: this.bond.dots.max,
					disabled: true,
					classes: "value",
				}).outerHTML,
			});
		}

		// Add bond uses as detail for bonds and contacts
		if (this.bond.dots.value) {
			context.details.push({
				label: game.i18n.localize("CURSEBORNE.SOCIAL.FIELDS.bond.uses.labelLong"),
				valueElement: this.schema.fields.bond.fields.uses.toInput({
					value: this.bond.uses.value,
					max: this.bond.uses.max,
					disabled: true,
					classes: "value",
				}).outerHTML,
			});
		}

		// Add contact invokes tracker for contacts
		if (this.type === "contact") {
			context.details.push({
				label: game.i18n.localize("CURSEBORNE.SOCIAL.FIELDS.contact.invokes.labelLong"),
				// TODO: Add something to warn about complication strength for consecutive invokes
				value: this.contact.invokes,
			});
		}

		// Add tags as detail for contacts
		if (this.type === "contact" && this.contact.tags.size) {
			context.details.push({
				label: this.schema.fields.contact.fields.tags.label,
				value: game.i18n
					.getListFormatter({ type: "conjunction", style: "narrow" })
					.format(this.contact.tags),
			});
		}

		// Add Path and Path Skills if present
		const path = this.actor?.items.get(this.contact.path);
		if (this.type === "contact" && path) {
			context.details.push({
				label: this.schema.fields.contact.fields.path.label,
				value: path.name,
			});
			if (path.system.skills.size) {
				const skills = path.system.skills.map((skill) => this.actor.system.skills[skill].parent);
				context.details.push({
					label: path.system.schema.fields.skills.label,
					value: game.i18n
						.getListFormatter({ type: "conjunction", style: "narrow" })
						.format(skills.map((s) => s.name)),
				});
			}
		}

		return context;
	}
}
