import { randomID, systemTemplate } from "@helpers/utils.mjs";

export class CurseborneModifiersMixin {
	static get modifierPart() {
		return {
			modifiers: {
				template: systemTemplate("item/modifiers"),
				templates: ["parts/enhancements", "parts/complications", "parts/difficulties"].map((t) =>
					systemTemplate(t),
				),
			},
		};
	}

	static get modifierTab() {
		return {
			id: "modifiers",
			icon: "fa-solid fa-dice-d10",
			label: "CURSEBORNE.Item.Tabs.modifiers",
		};
	}

	/**
	 * Etxends a document sheet with the ability to display and manage modifiers (enhancements and complications).
	 * The part is defined, the tab position has to be set in the extending class.
	 *
	 * @param {typeof foundry.applications.api.DocumentSheetV2} Base - The base document sheet class to extend.
	 */
	static mixin(Base) {
		return class CurseborneModifiersApplication extends Base {
			/** @inheritDoc */
			static DEFAULT_OPTIONS = {
				actions: {
					addModifier: this._addModifier,
					deleteModifier: this._deleteModifier,
				},
			};

			/* -------------------------------------------- */
			/*  Context Preparation                         */
			/* -------------------------------------------- */

			/** @inheritDoc */
			async _preparePartContext(partId, context) {
				context = await super._preparePartContext(partId, context);
				if (partId !== "modifiers") return context;

				context.formGroupOptions ??= {
					model: this.document,
					rootId: this.id,
					source: this.document.toObject(),
					isEditMode: context.isEditMode ?? true,
					editable: context.editable ?? true,
					localize: true,
				};

				context.enhancements = await this._prepareModifiers(context, "enhancements");
				context.complications = await this._prepareModifiers(context, "complications");
				context.difficulties = await this._prepareModifiers(context, "difficulties");

				return context;
			}

			/**
			 * Prepare modifiers of a given type
			 *
			 * @param {object} context - The rendering context.
			 * @param {"enhancements" | "complications"} type - The type of modifiers to prepare, using the field path.
			 */
			async _prepareModifiers(context, type) {
				if (!this.document.system.schema.fields[type]) return;
				const fields = this.document.system.schema.fields.enhancements.model.model.schema.fields;
				const rollData = context.rollData ?? this.document.getRollData?.() ?? {};
				const modifiers = await Promise.all(
					this.document.system[type].map(async (modifier) => {
						const source = this.isEditMode ? modifier.toObject() : modifier;
						const hint = this.isEditMode
							? modifier.hint
							: await foundry.applications.ux.TextEditor.enrichHTML(modifier.hint, {
									secrets: this.document.isOwner,
									rollData,
								});
						const modifierContext = { id: source.id };
						for (const field of ["value", "label", "stacking", "hint", "selectors"]) {
							if (!fields[field]) continue; // Skip if the field is not defined
							modifierContext[field] = {
								value: field === "hint" ? hint : source[field],
								field: fields[field],
								name: `system.${type}.${source.id}.${field}`,
							};
						}
						if (!this.document.system._source[type]?.[source.id]) {
							// Synthetic modifiers cannot be deleted, only viewed
							modifierContext.disabled = true;
						}
						return modifierContext;
					}),
				);
				return modifiers;
			}

			/* -------------------------------------------- */
			/*  Lifecycle Events                            */
			/* -------------------------------------------- */

			/** @inheritDoc */
			_onRender(context, options) {
				super._onRender(context, options);

				// Add special styling for label-top hints.
				for (const hint of this.element.querySelectorAll(".label-top > p.hint")) {
					const label = hint.parentElement.querySelector(":scope > label");
					if (!label) continue;
					hint.ariaLabel = hint.innerText;
					hint.dataset.tooltip = hint.innerHTML;
					hint.dataset.tooltipDirection ??=
						foundry.helpers.interaction.TooltipManager.TOOLTIP_DIRECTIONS.UP;
					hint.innerHTML = "";
					label.insertAdjacentElement("beforeend", hint);
				}
			}

			/* -------------------------------------------- */
			/*  Event Listeners and Handlers                */
			/* -------------------------------------------- */
			/**
			 * Add a roll modifier to the active effect
			 *
			 * @this {CurseborneModifiersApplication}
			 * @param {Event} _event
			 * @param {HTMLElement} target
			 */
			static async _addModifier(_event, target) {
				const field = target.closest("[data-modifier-field]").dataset.modifierField;
				const cls = this.document.system.schema.getField(field).model.model;
				const id = randomID(foundry.utils.getProperty(this.document.system, field));
				const modifier = new cls({
					id,
					label: this.document.name,
				}).toObject();
				return this.submit({
					updateData: { [`system.${field}.${id}`]: modifier },
				});
			}

			/**
			 * Delete a roll modifier from the active effect
			 *
			 * @this {CurseborneModifiersApplication}
			 * @param {Event} _event
			 * @param {HTMLElement} target
			 */
			static async _deleteModifier(_event, target) {
				await this.submit({ render: false });
				const field = target.closest("[data-modifier-field]").dataset.modifierField;
				const id = target.closest("[data-id]").dataset.id;
				await this.document.update({ [`system.${field}.-=${id}`]: null });
			}
		};
	}
}
