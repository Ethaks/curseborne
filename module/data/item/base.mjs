// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { CurseborneChatMessage } from "@documents/chat-message.mjs";
import { camelize, localize, systemTemplate } from "@helpers/utils.mjs";
import { DotsField } from "@models/fields/dots.mjs";
import { IdentifierMixin } from "@models/fields/identifier.mjs";
import { CurseborneTypeDataModel } from "../base.mjs";

/**
 * @import { CurseborneActor } from "@documents/actor.mjs";
 * @import { CurseborneItem } from "@documents/item.mjs";
 */

const { TextEditor } = foundry.applications.ux;

export class CurseborneItemBase extends IdentifierMixin(CurseborneTypeDataModel) {
	/**
	 * Data relating to all instances of this item type model.
	 *
	 * @type {Readonly<ItemTypeMetadata>}
	 */
	static get metadata() {
		return {
			...super.metadata,
			embedTemplate: systemTemplate("item/tooltips/common"),
		};
	}

	/** @inheritDoc */
	static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "CURSEBORNE.Item.Base"];

	/** @inheritDoc */
	static defineSchema() {
		const fields = foundry.data.fields;
		const schema = super.defineSchema();

		schema.description = new fields.HTMLField({ trim: true, textSearch: true });

		return schema;
	}

	/**
	 * Retrieve a Collection of all items of a given type, keyed by their identifier,
	 * ascending in closeness to the user (system > module > world compendium > world item > provided document).
	 *
	 * @param {object} options - Options for retrieving the index
	 * @param {string} [options.type] - The item type to retrieve; defaults to the model type per its {@linkcode metadata}.
	 * @param {string[]} [options.fields] - An array of system field paths to include in the index entries.
	 * @param {CurseborneActor} [options.actor] - An actor whose embedded items should also be considered for the collection.
	 * @returns {Promise<foundry.utils.Collection<object | CurseborneItem>>} A collection of index entries or item documents
	 */
	static async getIndex({ type = "", fields = [], actor = null } = {}) {
		const collection = new foundry.utils.Collection();

		type ||= this.metadata.type;
		if (!type) throw new Error("Item type must be specified in options or defined in metadata.");

		// Always include identifier to allow indexing
		fields.push("system.identifier");

		// Start with compendium packs, from system to module to world
		/** @type {Promise<object[]>[]} */
		const packPromises = [];
		for (const packSource of ["system", "module", "world"]) {
			game.packs
				.filter(
					(p) =>
						p.documentName === "Item" &&
						p.metadata.packageType === packSource &&
						p.index.some((e) => e.type === type),
				)
				.map(async (pack) => {
					await pack.getIndex({ fields });
					return /** @type {object[]} */ (pack.index.filter((e) => e.type === type));
				})
				.forEach((promise) => {
					packPromises.push(promise);
				});
		}
		const packEntries = await Promise.all(packPromises);
		for (const entry of packEntries.flat()) {
			const identifier = entry.system?.identifier ?? camelize(entry.name);
			collection.set(identifier, entry);
		}

		// Then include world items, again overriding any previous items of the same identifier
		for (const item of game.items.filter((i) => i.type === type)) {
			if (item.system?.identifier) collection.set(item.system.identifier, item);
		}

		// If an actor is provided, include their items as well
		if (actor) {
			for (const item of actor.items.filter((i) => i.type === type)) {
				if (item.system?.identifier) collection.set(item.system.identifier, item);
			}
		}

		return collection;
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

	/** @inheritDoc */
	prepareBaseData() {
		super.prepareBaseData();

		// While embedded items get their identifier prepared by the containing actor (ensuring uniqueness within the collection),
		// non-embedded items need to prepare their own identifier.
		// WARN: This results in non-embedded items potentially having non-unique identifiers within their collection.
		if (!this.parent.isEmbedded) this._prepareIdentifier();
	}

	/**
	 * Whether this item is currently active and can affect its parent actor.
	 */
	get isActive() {
		return true;
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
	async prepareSheetContext(context) {
		context.identifier = { value: this._source.identifier ?? "", placeholder: this.identifier };
	}

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
			context.enriched.push({
				label: localize("CURSEBORNE.Item.Tabs.description"),
				classes: "description",
				enriched: await TextEditor.implementation.enrichHTML(this.description, {
					relativeTo: this.parent,
					secrets: this.parent.isOwner,
					rollData: context.rollData,
				}),
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
 * @template {typeof CurseborneItemBase} T
 * @param {T} Base
 * @param {string | string[]} type - Actor types that cannot contain this item; defaults to "adversary".
 */
export function LimitedActorTypesItem(Base, type = "adversary") {
	return class AccursedItem extends Base {
		/** @inheritDoc */
		static get metadata() {
			return {
				...super.metadata,
				invalidActorTypes: [
					...(super.metadata.invalidActorTypes ?? []),
					...(Array.isArray(type) ? type : [type]),
				],
			};
		}
	};
}
