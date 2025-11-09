import { CurseborneDocumentSheetMixin } from "@applications/sheets/document-mixin.mjs";
import { SYSTEM_ID } from "@helpers/utils.mjs";

/**
 * A simple application serving to edit a given document's `HTMLField` property.
 */
export class TextEditorApplication extends CurseborneDocumentSheetMixin(
	foundry.applications.api.DocumentSheetV2,
) {
	/** @inheritDoc */
	static DEFAULT_OPTIONS = {
		sheetConfig: false,
		classes: [SYSTEM_ID, "text-editor"],
		position: { width: 600, height: 600 },
		window: { resizable: true },
		form: { submitOnChange: true, closeOnSubmit: false, submitOnClose: false },
	};

	/** @inheritDoc */
	get title() {
		const base = super.title;
		const fieldLabel = game.i18n.localize(this.field.label) || this.fieldPath;
		return `${base} — ${fieldLabel}`;
	}

	/**
	 * The `HTMLField` instance being edited.
	 *
	 * @type {foundry.data.fields.HTMLField}
	 */
	get field() {
		return this.options.field;
	}

	/** @inheritDoc */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.field = this.options.field;
		context.fieldPath = this.options.fieldPath ?? this.field.fieldPath;
		const value = foundry.utils.getProperty(this.document, context.fieldPath);
		context.value = this.isPlayMode
			? await foundry.applications.ux.TextEditor.enrichHTML(value, {
					relativeTo: this.document,
					rollData: context.rollData ?? this.document.getRollData(),
					secrets: this.document.isOwner,
				})
			: value;
		return context;
	}

	/** @inheritDoc */
	async _renderHTML(context, _options) {
		// Simply display enriched HTML in play mode
		if (this.isPlayMode) {
			return foundry.utils.parseHTML(`<div class="enriched scrollable">${context.value}</div>`);
		}

		// Let HTMLField create the prose mirror input
		return this.options.field._toInput({
			name: context.fieldPath,
			value: context.value,
			toggled: false,
			documentUUID: this.document.uuid,
			height: 600,
		});
	}

	/** @inheritDoc */
	async _replaceHTML(result, content, _options) {
		content.replaceChildren(result);
	}
}
