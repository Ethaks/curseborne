import { CurseborneModifiersMixin } from "@applications/common/modifiers.mjs";
import { systemTemplate } from "@helpers/utils.mjs";

export class CurseborneActiveEffectConfig extends CurseborneModifiersMixin.mixin(
	foundry.applications.sheets.ActiveEffectConfig,
) {
	/** @inheritDoc */
	static DEFAULT_OPTIONS = {
		classes: ["curseborne"],
		window: { resizable: true },
	};

	static {
		const { footer, ...parts } = this.PARTS;
		/** @inheritDoc */
		this.PARTS = {
			...parts,
			...CurseborneModifiersMixin.modifierPart,
			footer,
		};
		this.PARTS.duration.template = systemTemplate("effect/duration");
	}

	/** @override */
	static TABS = {
		sheet: {
			tabs: [
				{ id: "details", icon: "fa-solid fa-book" },
				{ id: "duration", icon: "fa-solid fa-clock" },
				{ id: "changes", icon: "fa-solid fa-cogs" },
				CurseborneModifiersMixin.modifierTab,
			],
			initial: "details",
			labelPrefix: "EFFECT.TABS",
		},
	};

	/** @inheritDoc */
	async _preparePartContext(partId, context) {
		context = await super._preparePartContext(partId, context);

		context.systemFields = this.document.system.schema.fields;

		context.formGroupOptions = {
			model: this.document,
			rootId: this.id,
			source: this.document.toObject(),
			isEditMode: true,
			editable: this.isEditable,
			localize: true,
		};

		return context;
	}
}
