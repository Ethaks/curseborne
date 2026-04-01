// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { localize, SYSTEM_ID } from "../helpers/utils.mjs";

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
	 * @param {object} [options]
	 * @param {boolean} [options.requiresConfirmation] - Whether to require GM confirmation for this change
	 * @returns {Promise<void>}
	 * @throws {Error} If the pool does not have enough momentum
	 */
	static async spend(amount, { requiresConfirmation } = {}) {
		if (this.current < amount) {
			throw new Error("Not enough momentum to reduce");
		}
		if (game.user.isGM) {
			return game.settings.set(SYSTEM_ID, "momentum", this.current - amount);
		}

		if (game.users.getDesignatedUser((u) => u.isActiveGM) === null) {
			throw new Error("No active GM to reduce momentum");
		}

		try {
			await curseborne.socket.request(
				"reduceMomentum",
				{ amount, requiresConfirmation },
				{ activeGM: true, timeout: 10_000 },
			);
			return game.settings.get(SYSTEM_ID, "momentum");
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			ui.notifications.error(message);
			throw error;
		}
	}

	/**
	 * Prompt the current user (GM) to confirm a momentum change.
	 *
	 * @param {number} change - The amount of momentum to change (positive to increase, negative to decrease)
	 * @param {string} user - The ID of the user who initiated the change
	 * @returns {Promise<boolean>} Whether the change was confirmed
	 */
	static async confirmChange(change, user) {
		const userName = game.users.get(user)?.name;
		return foundry.applications.api.DialogV2.confirm({
			window: { title: localize("CURSEBORNE.DICE.FIELDS.momentum.Confirmation.Title") },
			rejectClose: false,
			content: localize(
				`CURSEBORNE.DICE.FIELDS.momentum.Confirmation.${change >= 0 ? "increase" : "decrease"}`,
				{ user: userName, amount: Math.abs(change) },
			),
		});
	}

	/* -------------------------------------------- */
	/*  Event Handlers                              */
	/* -------------------------------------------- */

	/** @inheritDoc */
	static async _onSubmitForm(_event, _form, formData) {
		game.settings.set(SYSTEM_ID, "momentum", formData.object.momentum);
	}

	/**
	 * @this {Momentum}
	 */
	static _onIncrease(_event, _target) {
		const current = this.constructor.current;
		game.settings.set(SYSTEM_ID, "momentum", current + 1);
	}

	/**
	 * @this {Momentum}
	 */
	static _onDecrease(_event, _target) {
		const current = this.constructor.current;
		game.settings.set(SYSTEM_ID, "momentum", current - 1);
	}

	/* -------------------------------------------- */
	/*  Rendering                                   */
	/* -------------------------------------------- */

	/** @inheritDoc */
	async _prepareContext(_options) {
		return {
			current: this.constructor.current,
			canEdit: game.user.isGM,
		};
	}

	/** @inheritDoc */
	async _renderHTML(context, _options) {
		const elements = [];
		const label = document.createElement("label");
		label.textContent = game.i18n.localize("CURSEBORNE.DICE.FIELDS.momentum.label");
		elements.push(label);

		if (context.canEdit) {
			const createButton = (label, hint, action) => {
				const button = document.createElement("button");
				button.type = "button";
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
	async _preFirstRender(_context, _options) {
		const uiBottom = document.getElementById("ui-bottom");
		uiBottom.insertAdjacentHTML("afterbegin", `<template id="curseborne-momentum"></template>`);
	}

	/** @inheritDoc */
	_replaceHTML(result, content, _options) {
		content.classList.toggle("editable", game.user.isGM);
		content.replaceChildren(...result);
	}

	/** @inheritDoc */
	async _onFirstRender(_context, _options) {
		await super._onFirstRender(_context, _options);

		// Allow Escape to leave the input field while resetting the value to the current momentum
		this.element.addEventListener("keydown", (event) => {
			if (event.target.name !== "momentum") return;
			if (event.key === "Escape") {
				event.stopPropagation();
				event.target.value = this.constructor.current;
				event.target.blur();
			}
		});
	}
}
