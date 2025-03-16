import { SYSTEM_ID } from "../helpers/utils.mjs";

const { ApplicationV2 } = foundry.applications.api;

export class Momentum extends ApplicationV2 {
	/** @inheritDoc */
	static DEFAULT_OPTIONS = {
		id: "curseborne-momentum",
		tag: "form",
		classes: ["faded-ui", "curseborne", "caps"],
		window: { frame: false, positioned: false, minimizable: false },
		actions: { increase: this._onIncrease, decrease: this._onDecrease },
		form: {
			submitOnChange: true,
			closeOnSubmit: false,
			handler: this._onSubmitForm,
		},
	};

	/**
	 * The current momentum value.
	 *
	 * @type {number}
	 */
	static get current() {
		return game.settings.get("curseborne", "momentum");
	}

	/* -------------------------------------------- */
	/* Static Utility Methods                       */
	/* -------------------------------------------- */

	/**
	 * Spend momentum (i.e. attempt to reduce it while ensuring the pool has enough).
	 * If the user is not a GM, a socket request is sent to the GM to reduce the momentum.
	 *
	 * @param {number} amount - The amount of momentum to spend
	 * @returns {Promise<void>}
	 * @throws {Error} If the pool does not have enough momentum
	 */
	static async spend(amount) {
		if (this.current < amount) {
			throw new Error("Not enough momentum to reduce");
		}
		if (game.user.isGM) {
			return game.settings.set(SYSTEM_ID, "momentum", this.current - amount);
		}

		if (game.users.getDesignatedUser((u) => u.isActiveGM) === null) {
			throw new Error("No active GM to reduce momentum");
		}

		return curseborne.socket.request("reduceMomentum", { amount }, { activeGM: true });
	}

	/* -------------------------------------------- */
	/*  Event Handlers                              */
	/* -------------------------------------------- */

	/** @inheritDoc */
	static async _onSubmitForm(event, form, formData) {
		game.settings.set(SYSTEM_ID, "momentum", formData.object.momentum);
	}

	/**
	 * @this {Momentum}
	 */
	static _onIncrease(event, target) {
		const current = this.constructor.current;
		game.settings.set(SYSTEM_ID, "momentum", current + 1);
	}

	/**
	 * @this {Momentum}
	 */
	static _onDecrease(event, target) {
		const current = this.constructor.current;
		game.settings.set(SYSTEM_ID, "momentum", current - 1);
	}

	/** @inheritDoc */
	async _prepareContext(options) {
		return {
			current: this.constructor.current,
			canEdit: game.user.isGM,
		};
	}

	/* -------------------------------------------- */
	/*  Rendering                                   */
	/* -------------------------------------------- */

	/** @inheritDoc */
	async _renderHTML(context, options) {
		const elements = [];
		const label = document.createElement("label");
		label.textContent = game.i18n.localize("CURSEBORNE.DICE.FIELDS.momentum.label");
		elements.push(label);

		if (context.canEdit) {
			const createButton = (label, hint, action) => {
				const button = document.createElement("button");
				button.textContent = label;
				button.dataset.tooltip = hint;
				button.dataset.action = action;
				return button;
			};

			const input = document.createElement("input");
			input.type = "number";
			input.value = context.current;
			input.min = 0;
			input.step = 1;
			input.name = "momentum";

			const increase = createButton("+", "CURSEBORNE.DICE.FIELDS.momentum.increase", "increase");
			const decrease = createButton("-", "CURSEBORNE.DICE.FIELDS.momentum.decrease", "decrease");

			elements.push(decrease, input, increase);
		} else {
			const span = document.createElement("span");
			span.textContent = context.current;
			span.classList.add("momentum", "value");
			elements.push(span);
		}

		return elements;
	}

	/** @inheritDoc */
	async _preFirstRender(context, options) {
		const uiBottom = document.getElementById("ui-bottom");
		uiBottom.insertAdjacentHTML("afterbegin", `<template id="curseborne-momentum"></template>`);
	}

	/** @inheritDoc */
	_replaceHTML(result, content, options) {
		content.classList.toggle("editable", game.user.isGM);
		content.replaceChildren(...result);
	}
}
