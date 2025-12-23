// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { DragDropMixin } from "@applications/common/drag-drop.mjs";
import { staticID } from "@helpers/utils.mjs";
import { TabsMixin } from "../../common/tabs.mjs";
import { CurseborneDocumentSheetMixin } from "../document-mixin.mjs";

const { api, sheets } = foundry.applications;

export class CurseborneActorSheet extends CurseborneDocumentSheetMixin(
	TabsMixin(DragDropMixin(api.HandlebarsApplicationMixin(sheets.ActorSheetV2))),
) {
	static DEFAULT_OPTIONS = {
		classes: ["actor"],
		position: {
			width: 710,
			height: 860,
		},
		window: {
			resizable: true,
		},

		dragDrop: [{ dragSelector: ".items-list .item" }],

		actions: {
			toggleEffect: this._toggleEffect,
			toggleStatusEffect: this._toggleStatusEffect,
			setTrack: this._onSetTrack,
			addItem: this._onAddItem,
		},
	};

	/** @override */
	_configureRenderOptions(options) {
		super._configureRenderOptions(options);

		// Only show subset of tabs for limited permissions
		if (this.document.limited) options.parts = ["header", "tabs", "biography"];
	}

	/** @inheritDoc */
	_attachFrameListeners() {
		super._attachFrameListeners();

		// Update embedded document from input fields in this sheet
		this.element.addEventListener("change", this._onUpdateEmbedded.bind(this));
	}

	/** @inheritDoc */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.statusEffects = await this._prepareStatusEffects(context, options);
		return context;
	}

	/** @inheritDoc */
	async _preparePartContext(partId, context) {
		context = await super._preparePartContext(partId, context);
		if (partId === "biography") {
			context.enrichedBiography =
				await foundry.applications.ux.TextEditor.implementation.enrichHTML(
					this.actor.system.biography,
					{
						secrets: this.document.isOwner,
						rollData: context.rollData ?? this.actor.getRollData(),
						relativeTo: this.actor,
					},
				);
		}
		return context;
	}

	/**
	 * Prepare the status effects for the actor sheet.
	 *
	 * @param {object} context The rendering context
	 * @param {object} options Additional rendering options
	 * @returns {Promise<object[]>} The prepared status effects
	 */
	async _prepareStatusEffects(context, options) {
		const effects = Object.entries(curseborne.config.STATUS_EFFECTS)
			.map(([id, effect]) => {
				const { name, reference, img: icon, pseudo = false } = effect;
				if (pseudo) return undefined;
				const docId = staticID(`curse${id}`);
				const existingEffect = this.actor.effects.get(docId);
				const { active, img } = existingEffect ?? {};
				return {
					name: game.i18n.localize(name),
					img: img || icon || "icons/svg/mystery-man.svg",
					id: id,
					reference,
					disabled: !active,
					locked: !active && this.actor.statuses.has(id),
					cssClass: active ? "active" : "",
				};
			})
			.filter((effect) => effect)
			.sort((a, b) => a.name.localeCompare(b.name));
		return effects;
	}

	/**
	 * Toggle a Status Effect (as per Curseborne rules) on the actor.
	 *
	 * @this {CurseborneActorSheet}
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise<void>}
	 */
	static async _toggleStatusEffect(event, target) {
		const id = target.closest("[data-status-effect-id]")?.dataset.statusEffectId;
		if (!id) return;
		return this.actor.toggleStatusEffect(id);
	}

	/**
	 * Handle clicks on track boxes.
	 *
	 * @this {AccursedSheet}
	 * @param {Event} event - The triggering event
	 * @param {HTMLElement} target - The target element
	 * @returns {Promise<void>}
	 */
	static async _onSetTrack(event, target) {
		event.preventDefault();
		if (!this.actor.isOwner) return;
		const index = Number(target.dataset.index);
		const field = target.closest("[data-field]").dataset.field;
		const { value, max } = foundry.utils.getProperty(this.actor, field);
		let newValue = value === index ? index + 1 : index;
		if (newValue > max) newValue = max;
		return this.actor.update({ [`${field}.value`]: newValue });
	}

	/**
	 * @this {foundry.applications.api.DocumentSheetV2 & ItemListsSheet}
	 * @param {Event} event
	 * @returns {Promise<void>}
	 */
	async _onUpdateEmbedded(event) {
		const target = event.target;
		const { action, property, dtype } = target.dataset;
		if (action !== "updateEmbedded") return;
		if (!this.isEditable) return;

		event.preventDefault();

		const embedded = await this.getDocument(target);
		let value = target.value;

		if (dtype === "Number") {
			if (["+", "-"].includes(value[0])) {
				// Get first character and rest of string separately
				const [sign, rest] = [value[0], value.slice(1)];
				const previous = Number(foundry.utils.getProperty(embedded, property ?? target.name));
				value = previous + (sign === "+" ? 1 : -1) * Number(rest);
			} else if (value[0] === "=") {
				value = Number(value.slice(1));
			} else {
				value = Number(value);
			}

			if (Number.isNaN(value))
				throw new Error(`Invalid number value ${value} for embedded update ${property}`);

			// min and max, defaulting to negative/positive infinity
			const { min = 0, max = 100 } = target.dataset;
			value = Math.clamp(value, min, max);
		}

		return embedded.update({ [property ?? target.name]: value });
	}

	/** @inheritDoc */
	async _onDropItem(event, data) {
		if (!this.actor.isOwner) return false;
		const item = await foundry.documents.Item.implementation.fromDropData(data);

		// Handle item sorting within the same Actor
		if (this.actor.uuid === item.parent?.uuid) return this._onSortItem(event, item);

		// Create the owned item
		return this._onDropItemCreate(item, event);
	}

	/**
	 * Handle a drop event for an existing embedded Item to sort that Item relative to its siblings
	 * @param {Event} event
	 * @param {Item} item
	 * @private
	 */
	_onSortItem(event, item) {
		// Get the drag source and drop target
		const items = this.document.items;
		const dropTarget = event.target.closest("[data-item-id]");
		if (!dropTarget) return;
		const target = items.get(dropTarget.dataset.itemId);

		// Don't sort on yourself
		if (item.id === target.id) return;

		// Identify sibling items based on adjacent HTML elements
		const siblings = [];
		for (const el of dropTarget.parentElement.children) {
			const siblingId = el.dataset.itemId;
			if (siblingId && siblingId !== item.id) siblings.push(items.get(el.dataset.itemId));
		}

		// Perform the sort
		const sortUpdates = foundry.utils.performIntegerSort(item, {
			target,
			siblings,
		});
		const updateData = sortUpdates.map((u) => {
			const update = u.update;
			update._id = u.target._id;
			return update;
		});

		// Perform the update
		return this.document.updateEmbeddedDocuments("Item", updateData);
	}

	/* -------------------------------------------- */
	/*  Actions                                     */
	/* -------------------------------------------- */
	/**
	 * Determines effect parent to pass to helper
	 *
	 * @this AccursedSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @private
	 */
	static async _toggleEffect(event, target) {
		const effect = await this.getDocument(target);
		await effect.update({ disabled: !effect.disabled });
	}
}
