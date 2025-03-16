import { systemTemplate } from "../../helpers/utils.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * An abstract application class for dialogs wrapping a form element.
 *
 * FormDialogs are meant to wrap an object or a {@link foundry.abstract.DataModel} that is live-updated by the form.
 * Once the configuration is complete, the form can be submitted and the updated data is used to resolve the dialog's {@link Promise}.
 *
 * Contrary to {@link foundry.applications.api.DialogV2}, this class is meant to be extended instead of created directly.
 * FormDialogs require PARTS to be defined, determining the contents of the dialog.
 * Buttons can be defined in the `buttons` property of the configuration, which is used to render a footer.
 */
export class FormDialog extends HandlebarsApplicationMixin(ApplicationV2) {
	constructor(options) {
		super(options);
		this.object = options.object;
	}

	/**
	 * @inheritDoc
	 * @type {foundry.applications.types.ApplicationConfiguration}
	 */
	static DEFAULT_OPTIONS = {
		id: "form-dialog-{id}",
		classes: ["application", "dialog", "dialog-form", "form-dialog", "curseborne"],
		tag: "dialog",
		window: {
			minimizable: false,
			contentTag: "form",
			contentClasses: ["dialog-content", "standard-form"],
		},
		form: {
			submitOnChange: true,
			closeOnSubmit: false,
			handler: this.#submitForm,
		},
		actions: {
			submit: FormDialog._onSubmitDialog,
			cancel: FormDialog._onSubmitDialog,
		},
		buttons: [
			{
				action: "cancel",
				icon: "fa-solid fa-times",
				label: "CURSEBORNE.Cancel",
			},
			{
				action: "submit",
				icon: "fa-solid fa-check",
				label: "CURSEBORNE.Submit",
			},
		],
	};

	static PARTS = {
		footer: {
			template: systemTemplate("dialogs/form-footer"),
		},
	};

	/**
	 * The object or model instance which is being configured by the form.
	 *
	 * @type {Record<string, unknown> | foundry.abstract.DataModel}
	 */
	object;

	/**
	 * The Promise that is returned when the dialog is created, and resolved after the form is submitted
	 * and the dialog confirmed.
	 *
	 * @type {Promise<Record<string, unknown> | foundry.abstract.DataModel>}
	 */
	_promise;

	_initializeApplicationOptions(options) {
		options = super._initializeApplicationOptions(options);
		// Ensure that every button besides cancel and submit has an associated action
		if (options.buttons.some((b) => !["cancel", "submit"].includes(b.action) && !b.action)) {
			throw new Error("Every button must have an associated action");
		}

		return options;
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.buttons = this.options.buttons;
		return context;
	}

	/** @inheritDoc */
	_onClose(options) {
		this.constructor._onSubmitDialog.call(this);
	}

	/* -------------------------------------------- */
	/*                 Dialog Submit                */
	/* -------------------------------------------- */

	/**
	 * Create a new FormDialog instance and allow the user to configure the underlying object through the form.
	 * Returns a Promise which resolves to the updated object once the dialog is confirmed.
	 *
	 * @returns {Promise<Record<string, unknown> | foundry.abstract.DataModel>} A Promise which resolves to the updated object
	 */
	static async wait({ ...options } = {}) {
		const { promise, resolve, reject } = Promise.withResolvers();
		const dialog = new this(options);
		dialog._promise = { promise, resolve, reject };
		dialog.render(true);
		return promise;
	}

	/**
	 * Retrieve a Promise that resolves when the dialog is submitted.
	 *
	 * @returns {Promise<typeof this["object"]}
	 */
	async wait() {
		if (this._promise) return this._promise.promise;
		const { promise, resolve, reject } = Promise.withResolvers();
		this._promise = { promise, resolve, reject };
		return promise;
	}

	/**
	 * Handle the overall dialog being submitted/confirmed.
	 *
	 * @this {FormDialog}
	 * @param {Event} event - The submit event
	 * @param {HTMLElement | undefined} target - The submit button
	 */
	static async _onSubmitDialog(event, target) {
		await this.submit();
		const action = target?.dataset?.action ?? "cancel";
		if (action === "cancel") {
			this._promise.reject(new Error("The Dialog was closed without a choice being made."));
		} else {
			this.object._dialogAction = action;
			this._promise.resolve(this.object);
		}
		this.close();
	}

	/* -------------------------------------------- */
	/*                 Form Handling                */
	/* -------------------------------------------- */

	static async #submitForm(event, form, formData) {
		const submitData = this._prepareSubmitData(event, form, formData);
		await this._processSubmitData(event, form, submitData);
		this.render();
	}

	_prepareSubmitData(event, form, formData) {
		const submitData = this._processFormData(event, form, formData);
		if (this.object instanceof foundry.abstract.DataModel)
			this.object.validate({
				changes: submitData,
				clean: true,
				fallback: false,
			});
		return submitData;
	}

	_processFormData(event, form, formData) {
		return foundry.utils.expandObject(formData.object);
	}

	async _processSubmitData(event, form, submitData) {
		if (this.object instanceof foundry.abstract.DataModel) {
			return this.object.updateSource(submitData);
		}
		return foundry.utils.mergeObject(this.object, submitData, {
			inplace: true,
			recursive: true,
		});
	}

	async submit({ updateData } = {}) {
		const form = this.form;
		if (!form) return;
		const event = new Event("submit");
		const formData = new foundry.applications.ux.FormDataExtended(form);
		const submitData = this._prepareSubmitData(event, form, formData);
		foundry.utils.mergeObject(submitData, updateData, { inplace: true });
		await this._processSubmitData(event, form, submitData);
	}

	/** @inheritDoc */
	async _onFirstRender(context, options) {
		await super._onFirstRender(context, options);
		this.element.show();
	}
}
