import { TrickSelector } from "@applications/dialogs/trick-selector.mjs";
import { Momentum } from "@applications/momentum.mjs";
import { randomID, systemTemplate } from "@helpers/utils.mjs";

export class CurseborneRollMessage extends foundry.abstract.TypeDataModel {
	/** @inheritDoc */
	static defineSchema() {
		// No extra data; the class exists to provide specialised rendering and action handlers
		return {};
	}

	/**
	 * The CurseborneRoll instance which is being displayed in this message.
	 *
	 * @type {InstanceType<typeof curseborne.dice.CurseborneRoll>}
	 */
	get roll() {
		return this.parent.rolls[0];
	}

	/* -------------------------------------------- */
	/*  Rendering                                   */
	/* -------------------------------------------- */

	/**
	 * Prepare the inner HTML contents of the chat message, displaying the singular roll result.
	 *
	 * @param {object} _data - Additional data to render
	 * @returns {Promise<string>} - The rendered HTML
	 */
	async _prepareHTML(_data) {
		const isGM = game.user.isGM;
		const message = this.parent;
		const isOwner = message.isOwner;
		const isPrivate = message.isContentVisible === false;
		const roll = this.roll;

		// Determine string with which the result is presented
		let resultString = "CURSEBORNE.DICE.Result";
		if (roll.data.target && !isPrivate) {
			if (roll.isWickedSuccess) resultString = "CURSEBORNE.DICE.WickedSuccess";
			else if (roll.isCruelFailure) resultString = "CURSEBORNE.DICE.CruelFailure";
			else if (roll.isSuccess) {
				if (roll.data.complications.some((c) => !c.boughtOff)) {
					resultString = "CURSEBORNE.DICE.SuccessWithConsequence";
				} else {
					// TODO: Should only rolls with complications be able to be extraordinary?
					const hasComplications = roll.data.complications.size;
					const hasDifficulty = roll.data.difficulty !== null;
					const complicationSum = roll.data.complications.reduce((acc, c) => acc + c.value, 0);
					if (
						hasDifficulty &&
						hasComplications &&
						roll.total > roll.data.difficulty + complicationSum
					) {
						resultString = "CURSEBORNE.DICE.ExtraordinarySuccess";
					} else {
						resultString = "CURSEBORNE.DICE.Success";
					}
				}
			} else if (roll.isFailure) {
				if (roll.data.complications.some((c) => c.boughtOff)) {
					resultString = "CURSEBORNE.DICE.Disaster";
				} else {
					resultString = "CURSEBORNE.DICE.Failure";
				}
			}
		} else if (isPrivate) {
			resultString = "???";
		}

		// Gather formula parts for result summary
		// The summary contains (automatic hits), (normal dice), (curse dice), (other bonuses), (difficulty)
		const summary = {
			autoHits: isPrivate ? "" : roll.data.autoHits,
			normalDice: isPrivate ? "?" : (roll.normalTerm?.total ?? 0),
			curseDice: isPrivate ? "?" : (roll.curseTerm?.total ?? 0),
			bonuses: isPrivate
				? ""
				: roll.total -
					(roll.normalTerm?.total ?? 0) -
					(roll.curseTerm?.total ?? 0) -
					(roll.data.autoHits ?? 0),
		};

		const getTermData = (term, _index) => {
			if (term instanceof foundry.dice.terms.ParentheticalTerm) return term.terms.map(getTermData);
			const flavor = term.flavor || term.formula;
			return {
				flavor,
				hint: foundry.utils.cleanHTML(term.options.hint || ""),
				isDie: term instanceof foundry.dice.terms.DiceTerm,
				total: isPrivate ? "?" : term.total,
				reducedBy: term.options.reducedBy,
				originalValue: term.options.originalValue,
				stacking: term.options.stacking,
				dim: term.options.originalValue,
				rolls: term.results?.map((r) => {
					const classes = term.getResultCSS(r);
					// if (r.success === false) classes.push("discarded");
					if (term === roll.curseTerm) classes.push("curse");
					if (r.success === false) classes.push("failure");
					return {
						result: term.getResultLabel(r),
						classes: classes.filterJoin(" "),
					};
				}),
			};
		};

		// Gather complications
		const surplus = roll.surplus;
		const complications = roll.data.complications.map((c) => {
			// Players can buy off the complication if they have enough hits, but not unbuy it
			// GMs can always toggle complications
			const canToggle = isGM || (c.boughtOff ? false : surplus >= c.value);
			return {
				...c,
				max: Math.max(3, c.value),
				canToggle,
				label: c.label || game.i18n.localize(curseborne.config.complications[c.value] || ""),
				tooltip: foundry.utils.cleanHTML(game.i18n.localize(c.tooltip)),
			};
		});

		// Gather difficulty changes
		const difficulties = await Promise.all(
			roll.data.difficulties.map(async (d) => {
				return {
					...d,
					label: d.label ?? game.i18n.localize(curseborne.config.difficulties[d.value]?.label),
					tooltip: foundry.utils.cleanHTML(d.hint),
				};
			}),
		);
		if (difficulties.length > 0) {
			// Add base difficulty at beginning
			difficulties.unshift({
				value: roll.data._source.difficulty,
				label: game.i18n.localize(
					curseborne.config.difficulties[roll.data._source.difficulty]?.label,
				),
				tooltip: game.i18n.localize("CURSEBORNE.DICE.BaseDifficulty"),
				isBase: true,
			});
		}

		// Gather tricks
		const tricks = await Promise.all(
			roll.data.tricks.map(async (t) => {
				// TODO: Rely on index data for roll? Await getAllTricks to retrieve index?
				const item = await foundry.utils.fromUuid(t.uuid);
				// Always disable for plaerys, and disable for GMs if cost is fixed
				const disabled = !isGM || item.system.cost.type === "fixed";
				return {
					...t,
					img: item.img,
					name: item.name,
					tooltip: curseborne.tooltips.createPlaceholder({ uuid: t.uuid }),
					disabled,
					field: item.system.schema.fields.cost,
					value: { value: t.value, max: 3, min: -1 },
					classes: `align-right flexshrink ${item.system.cost.type}`,
					costType: item.system.cost.type,
					allowDelete: item.system.cost.type === "fixed" && isGM,
				};
			}),
		);

		// Available buttons
		// Owners can toggle succeess on, only GMs can toggle it off
		const canBuySuccess = isOwner && roll.isFailure && !roll.data.forcedSuccess;
		const canRemoveSuccess = isGM && roll.data.forcedSuccess;
		const canBuyEnhancement =
			isOwner && roll.total > 0 && roll.data.momentum < 3 && !roll.data.forcedSuccess;
		const canRemoveEnhancement = isGM && roll.data.momentum > 0;
		const canToggleAlteredOutcome = isGM && roll.canBeAlteredOutcome;

		const surplusLabel =
			roll.data.difficulty === null
				? "CURSEBORNE.DICE.Hits"
				: surplus >= 0
					? "CURSEBORNE.DICE.AvailableHits"
					: "CURSEBORNE.DICE.MissingHits";

		const chatData = {
			formula: isPrivate ? "???" : roll._formula,
			summary,
			flavor: isPrivate ? null : roll.flavor,
			user: game.user.id,
			isGM,
			isPrivate,
			total: isPrivate ? "?" : roll.total,
			surplus,
			target: roll.data.target,
			isUnuualTarget: roll.data.target !== roll.data.schema.fields.target.initial,
			isSuccess: roll.isSuccess,
			isFailure: roll.isFailure,
			hits: isPrivate ? "???" : roll.total,
			surplusLabel,
			surplusDisplayValue: Math.abs(surplus),
			difficulty: isPrivate ? "?" : roll.data.difficulty === null ? "?" : roll.data.difficulty,
			difficultyLabel: isPrivate
				? ""
				: (game.i18n.localize(curseborne.config.difficulties[roll.data.difficulty]?.label) ??
					roll.data.difficulty ??
					""),
			difficulties,

			// Can only buy enhancement with momentum up to 3
			canBuySuccess,
			canRemoveSuccess,
			canBuyEnhancement,
			canRemoveEnhancement,

			canToggleAlteredOutcome,
			alteredOutcome: roll.data.alteredOutcome,

			showComplications: game.user.isGM || (complications.length > 0 && !isPrivate),
			canBuyComplications: game.user.isGM,

			// Always show area for GMs, and for owning player unless private; otherwise show only if there are tricks
			showTricks: isGM || (!isPrivate && isOwner) || (!isPrivate && tricks.length > 0),
			canBuyTricks: isOwner,
			complications,
			tricks,
			resultString,
			parts: roll.terms
				.filter((t) => {
					const allowedTerms = [
						foundry.dice.terms.DiceTerm,
						foundry.dice.terms.NumericTerm,
						foundry.dice.terms.ParentheticalTerm,
					];
					if (
						allowedTerms.some(
							(cls) =>
								t instanceof cls && (t.number || t.options?.originalValue || t.options?.reducedBy),
						)
					)
						return true;
					return false;
				})
				.flatMap((term, i) => getTermData(term, i)),
		};

		return foundry.applications.handlebars.renderTemplate(systemTemplate("chat/roll"), chatData);
	}

	/* -------------------------------------------- */
	/*  Action Handlers                             */
	/* -------------------------------------------- */

	/**
	 * Action handlers called with the model's instance as this.
	 *
	 * @satisfies {Record<string, (event: Event, target: HTMLElement) => void | Promise<void>>}
	 */
	static actions = {
		addEnhancement: this._onAddEnhancement,
		toggleSuccess: this._onToggleSuccess,
		toggleComplication: this._onToggleComplication,
		setComplicationCost: this._onSetComplicationCost,
		addComplication: this._onAddComplication,
		buyTrick: this._onBuyTrick,
		setTrickCost: this._onSetTrickCost,
		deleteTrick: this._onDeleteTrick,
		toggleAlteredOutcome: this._onToggleAlteredOutcome,
	};

	/**
	 * Add/remove momentum enhancement to the roll contained in the message.
	 *
	 * @this {CurseborneRollMessage}
	 * @param {Event} _event - The originating click event
	 * @param {HTMLElement} target - The target element
	 * @protected
	 */
	static async _onAddEnhancement(_event, target) {
		let { change = "1" } = target.dataset;
		change = Number.parseInt(change, 10);

		// If change is positive, only act when there is momentum
		if (change > 0) {
			const hasMomentum = game.settings.get("curseborne", "momentum") > 0;
			if (!hasMomentum) {
				ui.notifications.warn("CURSEBORNE.WARNING.NoMomentum", {
					localize: true,
				});
				return;
			}

			// Can't add more than 3 enhancements through momentum
			if (this.roll.data.momentum >= 3) {
				ui.notifications.warn("CURSEBORNE.WARNING.MaxEnhancements", {
					localize: true,
				});
				return;
			}

			await Momentum.spend(1);

			// Add momentum enhancement
			this.roll._applyMomentum(this.roll.data.momentum + 1);
			return this.parent.update({ rolls: [this.roll] });
		}

		const hasMomentum = this.roll.data.momentum > 0;
		if (!hasMomentum) {
			ui.notifications.warn("CURSEBORNE.WARNING.NoMomentum", {
				localize: true,
			});
			return;
		}

		await Momentum.spend(-1);
		this.roll._applyMomentum(this.roll.data.momentum - 1);
		return this.parent.update({ rolls: [this.roll] });
	}

	/**
	 * Forcibly toggle the success state of a roll.
	 * This costs 2 momentum and can only be done by the owning user; a forced success can only be toggled off by the GM.
	 *
	 * @this {CurseborneRollMessage}
	 * @param {Event} _event - The originating click event
	 * @param {HTMLElement} _target - The target element
	 */
	static async _onToggleSuccess(_event, _target) {
		// Only the owning user can toggle the success state
		if (!this.parent.isOwner) return;

		// The success state was not forced, so it is being forced now
		if (!this.roll.data.forcedSuccess) {
			await Momentum.spend(2);
			this.roll.data.updateSource({ forcedSuccess: true });
			return this.parent.update({ rolls: [this.roll] });
		}

		// Only the GM can toggle off a forced success
		if (!game.user.isGM) return;
		await Momentum.spend(-2);
		this.roll.data.updateSource({ forcedSuccess: false });
		return this.parent.update({ rolls: [this.roll] });
	}

	/**
	 * Buy a complication.
	 *
	 * @this {CurseborneRollMessage}
	 * @param {Event} _event - The originating click event
	 * @param {HTMLElement} target - The target element
	 * @protected
	 */
	static async _onToggleComplication(_event, target) {
		const complicationId = target.dataset.complicationId;
		const complication = this.roll.data.complications.find((c) => c.id === complicationId);

		if (complication.boughtOff && !game.user.isGM)
			return ui.notifications.warn("CURSEBORNE.WARNING.ComplicationBoughtOff", {
				localize: true,
			});

		this.roll.data.updateSource({
			[`complications.${complicationId}.boughtOff`]: !complication.boughtOff,
		});
		return this.parent.update({ rolls: [this.roll] });
	}

	/**
	 * Adjust the cost of a complication; GM-only.
	 *
	 * @this {CurseborneRollMessage}
	 * @param {Event} event - The originating click event
	 * @param {HTMLElement} target - The target element
	 */
	static async _onSetComplicationCost(event, target) {
		const complicationId = target.closest("[data-complication-id]").dataset.complicationId;
		// Get the value from the dots-input element
		const cost = event.target.value;
		if (cost === 0) {
			// Delete the complication
			this.roll.data.updateSource(
				{
					[`complications.-=${complicationId}`]: null,
				},
				{ performDeletions: true },
			);
		} else {
			this.roll.data.updateSource({
				[`complications.${complicationId}.value`]: cost,
			});
		}
		return this.parent.update({ rolls: [this.roll] });
	}

	/**
	 * Add a complication to the roll contained in the message; GM-only.
	 *
	 * @this {CurseborneRollMessage}
	 * @param {Event} _event - The originating click event
	 * @param {HTMLElement} _target - The target element
	 */
	static async _onAddComplication(_event, _target) {
		this.roll.data.addComplications({ cost: 1 });
		return this.parent.update({ rolls: [this.roll] });
	}

	/**
	 * Buy a trick.
	 *
	 * @this {CurseborneRollMessage}
	 * @param {Event} _event - The originating click event
	 * @param {HTMLElement} target - The target element
	 */
	static async _onBuyTrick(_event, target) {
		// Open a trick selector and wait for the selection
		const boughtTricks = this.roll.data.tricks.map((t) => t.uuid);

		// Determine position of the button, open the dialog centered to its left
		const rect = target.getBoundingClientRect();
		const dialogPosition = TrickSelector.DEFAULT_OPTIONS.position;
		const position = {
			left: rect.left - dialogPosition.width - 10,
			top: rect.top + rect.height / 2 - dialogPosition.height / 2,
		};

		const trick = await TrickSelector.wait({
			filter: (t) => {
				if (boughtTricks.includes(t.uuid)) return false;
				if (this.roll.curseTerm.total < 1 && t.system.type === "curseDice") return false;
				return true;
			},
			position,
			id: `trick-selector-${this.parent.id}`,
		});
		const trickData = {
			id: randomID({ collection: this.roll.data.tricks }),
			uuid: trick.uuid,
			value: trick.cost,
		};
		this.roll.data.updateSource({ [`tricks.${trickData.id}`]: trickData });
		this.parent.update({ rolls: [this.roll] });
	}

	/**
	 * Adjust the cost of a trick after is has been bought, removing it when setting value to 0; GM-only
	 *
	 * @this {CurseborneRollMessage}
	 * @param {Event} event - The originating click event
	 * @param {HTMLElement} target - The target element
	 */
	static async _onSetTrickCost(event, target) {
		const trickId = target.closest("[data-trick-id]").dataset.trickId;
		// Get the value from the dots-input element
		const cost = event.target.value;
		if (cost === 0) {
			// Delete the trick
			this.roll.data.updateSource({ [`tricks.-=${trickId}`]: null });
		} else {
			this.roll.data.updateSource({
				[`tricks.${trickId}.value`]: cost,
			});
		}
		return this.parent.update({ rolls: [this.roll] });
	}

	/**
	 * Delete a (fixed cost) trick.
	 *
	 * @this {CurseborneRollMessage}
	 * @param {Event} _event - The originating click event
	 * @param {HTMLElement} target - The target element
	 */
	static async _onDeleteTrick(_event, target) {
		const trickId = target.closest("[data-trick-id]").dataset.trickId;
		this.roll.data.updateSource({ [`tricks.-=${trickId}`]: null });
		return this.parent.update({ rolls: [this.roll] });
	}

	/**
	 * Toggle the Altered Outcome state of a roll.
	 *
	 * @this {CurseborneRollMessage}
	 * @param {Event} _event - The originating click event
	 * @param {HTMLElement} _target - The target element
	 */
	static async _onToggleAlteredOutcome(_event, _target) {
		this.roll.data.updateSource({ alteredOutcome: !this.roll.data.alteredOutcome });
		return this.parent.update({ rolls: [this.roll] });
	}
}
