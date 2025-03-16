import { TabsMixin } from "@applications/common/tabs.mjs";
import { systemTemplate } from "../../helpers/utils.mjs";
import { FormDialog } from "./form.mjs";

export class CurseborneRollDialog extends TabsMixin(FormDialog) {
	/** @inheritDoc */
	static PARTS = {
		tabs: {
			template: "templates/generic/tab-navigation.hbs",
		},
		form: {
			template: systemTemplate("dialogs/roll-form"),
		},
		advanced: { template: systemTemplate("dialogs/roll-form-advanced") },
		...super.PARTS,
	};

	/** @inheritDoc */
	static DEFAULT_OPTIONS = {
		id: "{id}",
		position: {
			width: 500,
			height: "auto",
		},
		window: {
			icon: "fa-solid fa-dice-d10",
		},
		form: { submitOnChange: true },
	};

	static TABS = {
		primary: {
			tabs: [
				{
					id: "form",
					icon: "fa-solid fa-dice-d10",
					label: "CURSEBORNE.DICE.Roll",
					visible: true,
				},
				{
					id: "advanced",
					icon: "fa-solid fa-cogs",
					label: "CURSEBORNE.Advanced",
					visible: true,
				},
			],
		},
	};

	/**
	 * The roll data object configured by this dialog.
	 *
	 * @type {CurseborneRollContext}
	 */
	get rollContext() {
		return this.object;
	}

	/**
	 * The actor making this roll, if any.
	 *
	 * @type {Actor | undefined}
	 */
	get actor() {
		return this.options.actor;
	}

	/** @inheritDoc */
	get title() {
		// TODO: Adjust for type or use roll option?
		return game.i18n.localize("CURSEBORNE.DICE.Roll");
	}

	/** @inheritDoc */
	_initializeApplicationOptions(options) {
		options = super._initializeApplicationOptions(options);
		options.uniqueId = `${this.constructor.name}-${options.actor.uuid}-${options.object.type}`;
		return options;
	}

	/** @inheritDoc */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		this.rollData = this.actor.getRollData();
		context.rollData = this.rollData;
		context.fields = this.object.schema.fields;
		context.data = this.object;
		context.source = this.object.toObject();
		context.maxCurseDice = this.actor?.system.curseDice?.max;
		context.formGroupOptions = {
			model: this.object,
			rootId: this.id,
			source: context.source,
			isEditMode: true,
			editable: true,
			localize: true,
		};
		context.show = Object.keys(context.fields).reduce((show, key) => {
			show[key] = this.options.show?.[key] ?? true;
			return show;
		}, {});
		const dataSourceField = this.rollContext.schema.getField("sources").model;
		const { DieSourceField } = curseborne.models.fields;
		context.sources = this.rollContext.sources.contents
			.sort((a, b) => {
				// Sort by fixed ids first (attribute > skill), then other entries
				if (a.type === b.type) return a.id.localeCompare(b.id);
				if (a.type === "attribute") return -1;
				if (b.type === "attribute") return 1;
				if (a.type === "skill") return -1;
				if (b.type === "skill") return 1;
				return a.id.localeCompare(b.id);
			})
			.map((source) => {
				const { choices, groups } = DieSourceField.getChoices(source, this.actor);
				const sourceContext = {
					...source,
					name: `sources.${source.id}`,
					field: dataSourceField,
					value: source,
					label: DieSourceField.getLabel(source.type),
				};
				if (choices.length) {
					sourceContext.choices = choices;
					sourceContext.groups = groups;
				}
				return sourceContext;
			});

		// Enrich modifier hints once
		if (options.isFirstRender) {
			this.options.modifiers ??= {};
			for (const type of ["enhancements", "complications", "difficulties"]) {
				this.options.modifiers[type] ??= {};
				for (const value of Object.values(this.options.modifiers?.[type] ?? {})) {
					value.hint = await foundry.applications.ux.TextEditor.enrichHTML(value.hint, {
						rollData: this.rollData,
					});
				}
			}
		}

		// Prepare enhancements
		context.enhancements = {
			field: context.fields.enhancements,
			value: this.rollContext.enhancements.map((e) => ({ ...e })),
			input: (field, config) =>
				curseborne.applications.components.ModifierSelectElement.create({
					...config,
					useDeletionKeys: true,
				}),
			choices: this.options.modifiers?.enhancements ?? {},
		};

		// Prepare complications
		context.complications = {
			field: context.fields.complications,
			value: this.rollContext.complications,
			input: (field, config) =>
				curseborne.applications.components.ModifierSelectElement.create({
					...config,
					useDeletionKeys: true,
				}),
			choices: this.options.modifiers?.complications ?? {},
		};

		// Prepare difficulties
		context.difficulties = {
			field: context.fields.difficulties,
			value: this.rollContext.difficulties,
			input: (field, config) =>
				curseborne.applications.components.ModifierSelectElement.create({
					...config,
					useDeletionKeys: true,
				}),
			choices: this.options.modifiers?.difficulties ?? {},
		};
		if (foundry.utils.isEmpty(context.difficulties.choices)) {
			context.show.difficulties = false;
		}

		return context;
	}

	/** @inheritDoc */
	async _onFirstRender(context, options) {
		await super._onFirstRender(context, options);

		if (this.actor) {
			this.actor.apps[this.id] = this;
			this._matchSheetPosition();
		}
	}

	/** @inheritDoc */
	_onClose(options) {
		if (this.actor) delete this.actor.apps[this.id];
		super._onClose(options);
	}

	/**
	 * Adjust the dialog position so that it is centered next to the triggering actor sheet.
	 *
	 * @protected
	 * @returns {foundry.applications.types.ApplicationPosition}
	 */
	_matchSheetPosition() {
		/** @type {AccursedSheet} */
		const actorSheet = this.actor.sheet;
		if (!actorSheet?.rendered) return;
		// HACK: This results in multiple setPosition calls, but determining the desired position requires
		// the dialog to have been resized first.
		this.setPosition();
		const sheetPosition = actorSheet.position;

		// Try to render to the sheet's right, fall back to left if there's not enough space.
		const rightSpace = window.innerWidth - sheetPosition.left - sheetPosition.width;
		const renderRight = rightSpace > this.element.clientWidth;
		const left = renderRight
			? sheetPosition.left + actorSheet.element.clientWidth + 5
			: sheetPosition.left - this.element.clientWidth - 5;

		// Center dialog vertically with the actor sheet.
		const top =
			sheetPosition.top + (actorSheet.element.clientHeight - this.element.clientHeight) / 2;

		return this.setPosition({ left, top });
	}
}
