import { CurseborneChatMessage } from "@documents/chat-message.mjs";
import { systemTemplate } from "@helpers/utils.mjs";
import { DotsField } from "@models/fields/dots.mjs";
import { IdentifierMixin } from "@models/fields/identifier.mjs";
import { CurseborneTypeDataModel } from "../base.mjs";

const { TextEditor } = foundry.applications.ux;

export class CurseborneItemBase extends IdentifierMixin(CurseborneTypeDataModel) {
	/**
	 * Data relating to all instances of this item type model.
	 *
	 * @type {Readonly<ItemTypeMetadata>}
	 */
	static metadata = Object.freeze({
		...super.metadata,
		embedTemplate: systemTemplate("item/tooltips/common"),
	});

	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		const schema = {};

		schema.description = new fields.HTMLField({ trim: true });

		return schema;
	}

	/**
	 * Whether this item is a non-embedded item in a compendium.
	 *
	 * @type {boolean}
	 */
	get isPackItem() {
		return this.parent.pack && !this.isEmbedded;
	}

	/** @inheritDoc */
	async _preCreate(data, options, user) {
		const allowed = await super._preCreate(data, options, user);
		if (allowed === false) return false;

		// Prevent creation of item if they would be embedded in an invalid actor type
		if (
			this.parent.isEmbedded &&
			this.constructor.metadata?.invalidActorTypes?.includes(this.parent.parent.type)
		) {
			return false;
		}
	}

	/* -------------------------------------------- */
	/*  Sheet Rendering                             */
	/* -------------------------------------------- */

	/**
	 * Prepare item type specific data for the sheet rendering context.
	 *
	 * @param {object} context - The rendering context to be mutated
	 * @returns {Promise<void>}
	 */
	async prepareSheetContext(context) {}

	/* -------------------------------------------- */
	/* Embed Preparation                            */
	/* -------------------------------------------- */

	/**
	 * Prepare the data object used to render the tooltip/embed for this item.
	 *
	 * @param {object} config - The configuration object for the tooltip
	 * @param {object} options - Additional options for the tooltip
	 * @returns {Promise<object>}
	 */
	async _prepareEmbedContext(config, options) {
		const context = await super._prepareEmbedContext(config, options);

		// Fall back to description as common tooltip content
		if (typeof this.description === "string" && this.description.length > 0) {
			context.description = await TextEditor.implementation.enrichHTML(this.description, {
				relativeTo: this.parent,
				secrets: this.parent.isOwner,
				rollData: context.rollData ?? this.parent.getRollData(),
			});
		}

		// Add dots input as subtitle, if dots are present
		if (this.schema.fields.dots instanceof DotsField) {
			context.subtitle += this.schema.fields.dots.toInput({
				value: this.dots.value,
				max: this.dots.max,
				disabled: true,
			}).outerHTML;
		}

		return context;
	}

	/* -------------------------------------------- */
	/*  Chat Display                                */
	/* -------------------------------------------- */

	/**
	 * Display the item card in chat.
	 *
	 * @param {object} [messageData={}] - Additional data for the created message
	 * @returns {Promise<CurseborneChatMessage>} The created message
	 */
	async displayCard(messageData = {}) {
		const actor = this.actor;
		messageData.speaker ??= CurseborneChatMessage.implementation.getSpeaker({
			actor,
		});
		messageData.content = `@Embed[${this.parent.uuid} caption=false inline=true]`;
		return CurseborneChatMessage.implementation.create(messageData);
	}
}

/**
 * Limit the actor types that can contain this item.
 *
 * @param {typeof CurseborneItemBase} Base
 * @param {string | string[]} type - Actor types that cannot contain this item; defaults to "adversary".
 */
export function LimitedActorTypesItem(Base, type = "adversary") {
	return class AccursedItem extends Base {
		static {
			type = Array.isArray(type) ? type : [type];
			this.metadata = Object.freeze({
				...super.metadata,
				invalidActorTypes: [...(super.metadata.invalidActorTypes ?? []), ...type],
			});
		}
	};
}
