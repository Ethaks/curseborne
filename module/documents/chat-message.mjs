import { SessionSetting } from "@helpers/session-setting.mjs";
import { ValidatedObjectField } from "@models/fields/object.mjs";

export class CurseborneChatMessage extends foundry.documents.ChatMessage {
	/**
	 * Activate listeners applying to the ChatLog instead of individual messages.
	 */
	static activateLogListeners() {
		window.addEventListener("keydown", this.toggleModifiers, { passive: true });
		window.addEventListener("keyup", this.toggleModifiers, { passive: true });
		window.addEventListener("blur", (event) => this.toggleModifiers(event, { releaseAll: true }), {
			passive: true,
		});
	}

	/**
	 * Toggle modifier CSS classes on the chat log when modifier keys are pressed.
	 *
	 * @param {KeyboardEvent} _event - The originating keydown or keyup event
	 * @param {object} [options={}] - Additional options
	 * @param {boolean} [options.releaseAll=false] - Release all modifiers
	 */
	static toggleModifiers(_event, { releaseAll = false } = {}) {
		for (const chatlog of document.querySelectorAll("#chat ol.chat-log")) {
			for (const key of Object.values(foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS)) {
				if (game.keyboard.isModifierActive(key) && !releaseAll)
					chatlog.dataset[`modifier${key}`] = "";
				else delete chatlog.dataset[`modifier${key}`];
			}
		}
	}

	/* --------------------------------------------------------------------------------------------- */
	/*                                           Rendering                                           */
	/* --------------------------------------------------------------------------------------------- */

	/**
	 * Prepare the data context used to {@linkcode renderHTML} the HTML for this chat message.
	 *
	 * @param {object} options         Options passed to the render call
	 * @param {boolean} [options.canDelete]   Does the current user have permission to delete this message?
	 * @param {boolean} [options.canClose]    Does the current user have permission to close this message?
	 * @returns {Promise<object>}     The prepared data context
	 * @protected
	 */
	async _prepareHTML(options) {
		options.canDelete ??= game.user.isGM; // By default, GM users have the trash-bin icon in the chat log itself

		let actor;
		if (this.speaker.scene && this.speaker.token) {
			const scene = game.scenes.get(this.speaker.scene);
			const token = scene?.tokens.get(this.speaker.token);
			if (token) actor = token.actor;
		} else actor = game.actors.get(this.speaker.actor);

		// Determine some metadata
		const data = this.toObject(false);
		data.content =
			this.system._prepareHTML instanceof Function
				? await this.system._prepareHTML(data)
				: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.content, {
						relativeTo: actor,
						rollData: this.getRollData(),
					});

		const avatar =
			(this.isContentVisible
				? (actor?.token?.texture.src ?? actor?.prototypeToken?.texture.src)
				: this.author.avatar) || foundry.documents.Actor.implementation.getDefaultArtwork({}).img;
		const tokenUuid = actor?.uuid;

		const isWhisper = this.whisper.length;
		const whisperTo = this.whisper
			.map((u) => {
				const user = game.users.get(u);
				return user ? user.name : null;
			})
			.filterJoin(", ");
		let subtitle = this.whisper.length ? whisperTo : this.author.name;
		if (subtitle === this.alias) subtitle = "";

		// Construct message data
		const messageData = {
			canDelete: options.canDelete,
			canClose: options.canClose,
			message: data,
			user: game.user,
			author: this.author,
			alias: this.alias,
			avatar,
			tokenUuid,
			subtitle,
			cssClass: [
				this.style === CONST.CHAT_MESSAGE_STYLES.IC ? "ic" : null,
				this.style === CONST.CHAT_MESSAGE_STYLES.EMOTE ? "emote" : null,
				isWhisper ? "whisper" : null,
				this.blind ? "blind" : null,
			].filterJoin(" "),
			isWhisper,
			whisperTo,
		};

		// Render message data specifically for ROLL type messages
		if (this.isRoll) await this.#renderRollContent(messageData);

		// Define a border color
		if (this.style === CONST.CHAT_MESSAGE_STYLES.OOC)
			messageData.borderColor = this.author?.color.css;

		return messageData;
	}

	/* --------------------------------------------------------------------------------------------- */

	/** @inheritDoc */
	async renderHTML({ canDelete, canClose } = {}) {
		const context = await this._prepareHTML({ canDelete, canClose });
		// Render the chat message
		const htmlString = await foundry.applications.handlebars.renderTemplate(
			CONFIG.ChatMessage.template,
			context,
		);
		/** @type {HTMLElement} */
		const html = foundry.utils.parseHTML(htmlString);

		// Flag expanded state of dice rolls
		Hooks.call("renderChatMessageHTML", this, html, context);

		/** @deprecated since v13 */
		if ("renderChatMessage" in Hooks.events) {
			foundry.utils.logCompatibilityWarning(
				"The renderChatMessage hook is deprecated. Please use " +
					"renderChatMessageHTML instead, which now passes an HTMLElement argument instead of jQuery.",
				{ since: 13, until: 15, once: true },
			);
			Hooks.call("renderChatMessage", this, $(html), context);
		}

		html.addEventListener("click", (event) => {
			const target = event.target.closest("[data-action]");
			const { action, expand } = target?.dataset ?? {};
			if (action === "expand") {
				return this._onExpandContent(event, expand);
			}

			if (action === "contextMenu") {
				event.preventDefault();
				event.stopImmediatePropagation();

				return html.dispatchEvent(
					new PointerEvent("contextmenu", {
						view: window,
						bubbles: true,
						cancelable: true,
					}),
				);
			}

			if (this.system?.constructor?.actions?.[action] instanceof Function) {
				return this.system.constructor.actions[action].call(this.system, event, target);
			}
		});
		html.addEventListener("change", (event) => {
			const target = event.target;
			const { action } = target.dataset;
			if (this.system?.constructor?.actions?.[action] instanceof Function) {
				return this.system.constructor.actions[action].call(this.system, event, target);
			}
		});

		return html;
	}

	/* --------------------------------------------------------------------------------------------- */
	/*                                        Roll Rendering                                         */
	/* --------------------------------------------------------------------------------------------- */

	/**
	 * Render the inner HTML content for ROLL type messages.
	 * @param {object} messageData      The chat message data used to render the message HTML
	 * @returns {Promise<void>}
	 */
	async #renderRollContent(messageData) {
		const data = messageData.message;
		const renderRolls = async (isPrivate) => {
			let html = "";
			for (const r of this.rolls) {
				html += await r.render({ isPrivate });
			}
			return html;
		};

		// Suppress the "to:" whisper flavor for private rolls
		if (this.blind || this.whisper.length) messageData.isWhisper = false;

		// Display standard Roll HTML content
		if (this.isContentVisible) {
			const el = document.createElement("div");
			el.innerHTML = data.content; // Ensure the content does not already contain custom HTML
			if (!el.childElementCount && this.rolls.length)
				data.content = await this.#renderRollHTML(false);
		}

		// Otherwise, show "rolled privately" messages for Roll content
		else {
			const name = this.author?.name ?? game.i18n.localize("CHAT.UnknownUser");
			data.flavor = game.i18n.format("CHAT.PrivateRollContent", {
				user: foundry.utils.escapeHTML(name),
			});
			data.content = await renderRolls(true);
			messageData.alias = name;
		}
	}

	/* -------------------------------------------- */

	/**
	 * Render HTML for the array of Roll objects included in this message.
	 * @param {boolean} isPrivate   Is the chat message private?
	 * @returns {Promise<string>}   The rendered HTML string
	 */
	async #renderRollHTML(isPrivate) {
		let html = "";
		for (const roll of this.rolls) {
			html += await roll.render({ isPrivate });
		}
		return html;
	}

	/* --------------------------------------------------------------------------------------------- */
	/*                                        Expand Handling                                        */
	/* --------------------------------------------------------------------------------------------- */

	/** @type {SessionSetting<Record<string, boolean>>} */
	#expanded = new SessionSetting(`${this.uuid}.expanded`, {
		schema: new ValidatedObjectField(
			new foundry.data.fields.BooleanField({ required: true, initial: false }),
		),
	});

	/**
	 * Expand or collapse the content of a chat message.
	 *
	 * @param {MouseEvent} event - The originating click event
	 * @param {string} [expandId="all"] - The type of content to expand or collapse
	 * @protected
	 */
	_onExpandContent(event, expandId = "all") {
		event.preventDefault();
		const expandSetting = this.#expanded.get();

		// Get all expand elements matching the expand type; if type is all, get all unset expand elements
		/** @type {HTMLElement} */
		const messageElement = event.target.closest(".chat-message");
		const isExpanded = messageElement
			.querySelector(`[data-expand-id="${expandId}"]`)
			.classList.contains("expanded");
		/** @type {Iterable<HTMLElement>} */
		let expandElements;
		if (expandId === "all") {
			expandElements = [...messageElement.querySelectorAll("[data-expand-id]")].filter(
				(e) => !e.dataset.expandId,
			);
		} else expandElements = messageElement.querySelectorAll(`[data-expand-id="${expandId}"]`);

		for (const el of expandElements) {
			// Toggle expanded state
			if (isExpanded) {
				gsap.to(el, {
					duration: 0.3,
					height: 0,
					paddingTop: 0,
					paddingBottom: 0,
					ease: "power1.out",
					clearProps: "all",
					onComplete: () => el.classList.remove("expanded"),
				});
			} else {
				el.classList.add("expanded");
				el.style.height = 0;
				gsap.to(el, {
					duration: 0.3,
					height: "auto",
					ease: "power1.out",
					padding: "",
					clearProps: "all",
				});
			}
		}

		this.#expanded.set({ ...expandSetting, [expandId]: !isExpanded });
	}
}
