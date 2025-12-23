import { DieSourceField } from "@models/fields/die-source.mjs";
import { CurseborneRollDialog } from "../applications/dialogs/roll.mjs";
import { ROLL_TYPE } from "../config/dice.mjs";
import { CurseborneRollContext } from "./data.mjs";

/**
 * The roll class for the Curseborne system, implementing the base SPU behaviour and its specific additions.
 *
 * Each roll consists of a number of d10s, some of which can be Cursed Dice (rolled in a separate pool to track them).
 * When dice are rolled, only results above the target number (default 8) are considered successes (hits);
 * dice above a certain threshold (default 10) count as two hits.
 * Rolls can have enhancements, which are added to the number of hits if there is at least one hit.
 * Rolls have a difficulty, which is the number of hits required to succeed.
 * Rolls can have complications, which can be bought off with hits exceeding the difficulty.
 */
export class CurseborneRoll extends foundry.dice.Roll {
	/**
	 * Break the inheritance, ignoring formula strings passed to the constructor and using the data object instead.
	 *
	 * @param {RollData | string} formula - The data describing the roll; ignored if string.
	 * @param {RollData | object} data - The data or options object
	 */
	constructor(formula, data, options) {
		if (typeof formula === "object") {
			options = data;
			data = formula;
			formula = "";
		}
		super(formula, data, options);
	}

	/** The data model used for this roll's data. */
	static dataModel = CurseborneRollContext;

	/** The application class with which this roll is further configured. */
	static dialogClass = CurseborneRollDialog;

	static DIFFICULTY = {
		ROUTINE: 0,
		STRAIGHTFORWARD: 1,
		MODERATE: 2,
		CHALLENGING: 3,
		EXTREME: 4,
		NEAR_IMPOSSIBLE: 5,
	};

	/** @type {foundry.dice.terms.Die} */
	get normalTerm() {
		return this.terms.find(
			(t) => t instanceof foundry.dice.terms.Die && t.options.type === "normal",
		);
	}
	/** @type {foundry.dice.terms.Die} */
	get curseTerm() {
		return this.terms.find(
			(t) => t instanceof foundry.dice.terms.Die && t.options.type === "curse",
		);
	}
	/** @type {foundry.dice.terms.Die} */
	get injuryTerm() {
		return this.terms.find(
			(t) => t instanceof foundry.dice.terms.Die && t.options.type === "injury",
		);
	}

	/** @type {foundry.dice.terms.NumericTerm} */
	get enhancementsTerm() {
		if (!this._evaluated) return undefined;
		if (!this.data.enhancements || !this.data.momentum) return undefined;
		return this.terms[4];
	}

	/**
	 * Whether this roll is a success, i.e. the number of hits is at least the difficulty.
	 *
	 * @returns {undefined | boolean}
	 */
	get isSuccess() {
		if (!this._evaluated) return undefined;
		if (!this.data.target) return undefined;
		if (this.data.forcedSuccess) return true;
		return this.total >= this.data.difficulty;
	}

	/**
	 * Whether this roll is a failure, i.e. the number of hits is below the difficulty.
	 *
	 * @returns {undefined | boolean}
	 */
	get isFailure() {
		return this.isSuccess === false;
	}

	/**
	 * Whether this roll is a wicked succes, i.e. a success with at least one curse die being a hit.
	 *
	 * @returns {undefined | boolean}
	 */
	get isWickedSuccess() {
		if (!this._evaluated) return undefined;
		return (
			this.isSuccess &&
			this.data.alteredOutcome &&
			this.curseTerm.results.some((r) => r.result >= this.data.target)
		);
	}

	/**
	 * Whether this roll is a cruel failure, i.e. a failure with at least one curse die being a hit.
	 *
	 * @returns {undefined | boolean}
	 */
	get isCruelFailure() {
		if (!this._evaluated) return undefined;
		return (
			this.isFailure &&
			this.data.alteredOutcome &&
			this.curseTerm.results.some((r) => r.result >= this.data.target)
		);
	}

	/**
	 * The number of hits available to be spent on buying off complications or adding tricks.
	 *
	 * @type {number}
	 */
	get surplus() {
		if (!this._evaluated) return undefined;
		if (this.data.forcedSuccess) return 0;

		let surplus = this.total - this.data.difficulty;
		// Reduce by cost of bought off complications
		const boughtComplicationCost = this.data.complications
			.filter((c) => c.boughtOff)
			.reduce((sum, c) => sum + c.value, 0);
		surplus -= boughtComplicationCost;
		const boughtTrickCost = this.data.tricks.reduce((sum, t) => sum + t.value, 0);
		surplus -= boughtTrickCost;
		return surplus;
	}

	/**
	 * @inheritDoc
	 * @param {object | RollData} data
	 * @returns {RollData}
	 */
	_prepareData(data) {
		const rollData = data.rollData ?? {};
		const context =
			data instanceof this.constructor.dataModel
				? data
				: new this.constructor.dataModel(data, { roll: this });
		context.rollData = rollData;
		return context;
	}

	/**
	 * Parse a data object into a roll; this ignores the given formula in favor of constructing the roll from data.
	 *
	 * @override
	 * @param {CurseborneRollContext} data
	 * @returns {foundry.dice.terms.RollTerm[]}
	 */
	static parse(formula, data) {
		// If a formula was already created, use it
		if (formula) return super.parse(formula, data);

		// Individual string parts making up the roll formula
		const parts = [];
		data = data instanceof this.dataModel ? data : new this.dataModel(data);

		// Determine the number of dice to roll for the normal and curse pool
		const totalDice = data.dice;
		const curseDice = Math.min(totalDice, data.curseDice);
		const normalDice = Math.max(totalDice - curseDice, 0);

		/**
		 * Generate a Curseborne dice pool formula given a number of dice and a label.
		 *
		 * @param {number} dice - The number of dice to roll
		 * @param {string} label - The label for the dice pool
		 * @returns {string} - The dice pool formula
		 */
		const dicePool = (dice, label) =>
			`${dice}d10cs>=${data.target}cd>=${data.double}[${game.i18n.localize(label)}]`;

		parts.push(
			dicePool(normalDice, "CURSEBORNE.Dice"),
			dicePool(curseDice, "CURSEBORNE.CurseDice"),
		);

		// Automatic hits are always applied, regardless of hits on dice
		parts.push(`${data.autoHits}[${game.i18n.localize("CURSEBORNE.DICE.FIELDS.autoHits.label")}]`);

		formula = parts.join(" + ");
		const terms = super.parse(formula, data);

		// Add curse dice/normal dice option to their terms for machine readability
		terms[0].options = { ...terms[0].options, type: "normal" };
		terms[2].options = { ...terms[2].options, type: "curse" };

		return terms;
	}

	/** @inheritDoc */
	static replaceFormulaData(formula, data, { missing, warn = false } = {}) {
		const dataRgx = new RegExp(/@([a-z.0-9_-]+)/gi);
		return formula.replace(dataRgx, (match, term) => {
			// Look up the value of the term in the inner rollData object instead of
			// stricter data model instance
			let value = foundry.utils.getProperty(data?.rollData ?? {}, term);
			if (value == null) {
				if (warn && ui.notifications)
					ui.notifications.warn("DICE.WarnMissingData", { format: { match } });
				return missing !== undefined ? String(missing) : match;
			}
			switch (foundry.utils.getType(value)) {
				case "string":
					return value.trim();
				case "number":
				case "boolean":
					return String(value);
				case "Object":
					if (value.constructor.name !== "Object") return value.toString();
					break;
				case "Set":
					value = Array.from(value);
					break;
				case "Map":
					value = Object.fromEntries(Array.from(value));
					break;
			}
			return `$${JSON.stringify(value)}$`;
		});
	}

	/** @override */
	async evaluate(options) {
		await super.evaluate(options);
		this._applyEnhancements();
		return this;
	}

	/**
	 * Adds enhancements to the roll if there is at least one hit or the difficulty is 0.
	 *
	 * @returns {this}
	 */
	_applyEnhancements() {
		if (!this._evaluated) return;
		const hasHits = this.total > 0;
		const hasDifficulty = this.data.difficulty !== null && this.data.difficulty > 0;
		if (!hasHits && hasDifficulty) return;

		/** @type {foundry.dice.terms.NumericTerm[]} */
		const enhancements = [];

		const pushEnhancement = (value, options = {}) => {
			enhancements.push(
				new foundry.dice.terms.NumericTerm({
					number: value,
					options,
				}),
			);
		};

		let sum = 0;
		const sortedEnhancements = this.data.enhancements.contents.sort((a, b) => {
			// First non-stacking, then stacking, each sorted by value
			if (a.stacking && !b.stacking) return 1;
			if (!a.stacking && b.stacking) return -1;
			return a.value - b.value;
		});
		for (const enhancement of sortedEnhancements) {
			// Add disabled enhancements with 0 value, storing their original value in their options
			if (!enhancement.enabled) {
				pushEnhancement(0, {
					flavor: enhancement.label,
					hint: enhancement.hint,
					discarded: true,
					originalValue: enhancement.value,
				});
				continue;
			}

			// Individual enhancements cannot have a value higher than 3; if they do, their value is reduced to 3
			// The total sum of enhancements for a roll cannot exceed 5; parts that would exceed this limit are reduced to fit,
			// possibly leading to effectively-0-value enhancements (that are still listed for transparenct)
			// Each enhancement's value can be a number, or a string to be resolved by the roll data
			const enhancementValue =
				typeof enhancement.value === "number"
					? enhancement.value
					: this.constructor.safeEval(
							this.constructor.replaceFormulaData(enhancement.value, this) || 0,
						);
			const label =
				enhancement.label || game.i18n.localize("CURSEBORNE.DICE.FIELDS.enhancements.label");
			// Effective value
			let value = Math.min(enhancementValue, 3);
			const total = sum + value;
			const stacking = enhancement.stacking;

			if (total > 5) {
				const overflow = total - 5;
				value -= overflow;
				// If the value was capped or otherwise reduced, add a note to the label
				pushEnhancement(value, {
					flavor: label,
					hint: enhancement.hint,
					reducedBy: enhancementValue - value,
					stacking,
				});
				sum = 5;
				continue;
			}

			pushEnhancement(value, {
				flavor: label,
				hint: enhancement.hint,
				reducedBy: value < enhancementValue ? enhancementValue - value : undefined,
				stacking,
			});
			sum = total;
		}

		// Sort enhancements:
		//  - Disabled enhancements are listed first
		//  - Then non-stacking enhancements sorted by value
		//  - Then stacking enhancements sorted by value
		enhancements.sort((a, b) => {
			if (a.options.discarded && !b.options.discarded) return -1;
			if (!a.options.discarded && b.options.discarded) return 1;
			if (!a.options.stacking && b.options.stacking) return -1;
			if (a.options.stacking && !b.options.stacking) return 1;
			return a.number - b.number;
		});

		// Advantage ignores normal enhancement limits
		if (this.data.advantage > 0) {
			pushEnhancement(this.data.advantage * 2, {
				flavor: game.i18n.localize("CURSEBORNE.DICE.FIELDS.advantage.label"),
			});
		}

		if (!enhancements.length) return;
		for (const enhancement of enhancements) {
			this.terms.push(new foundry.dice.terms.OperatorTerm({ operator: "+" }));
			this.terms.push(enhancement);
		}
		this.resetFormula();
		this._total = this._evaluateTotal();

		return this;
	}

	/**
	 * Retroactively apply momentum in the form of enhancements to the roll.
	 * To persist the adjusted roll in a chat message, its source data must be fed to a message update.
	 *
	 * @returns {this}
	 */
	_applyMomentum(momentum) {
		if (!this._evaluated) return;

		this.data.updateSource({ momentum });
		let momentumTerm = this.terms.find(
			(t) => t instanceof foundry.dice.terms.NumericTerm && t.options.momentum,
		);
		if (momentumTerm) {
			// Add momentum to existing term
			momentumTerm.number = momentum;
			if (momentumTerm.number === 0) {
				// Remove momentum term and preceeding operator
				this.terms.splice(this.terms.indexOf(momentumTerm) - 1, 2);
			}
		} else {
			momentumTerm = new foundry.dice.terms.NumericTerm({
				number: momentum,
				options: {
					flavor: game.i18n.localize("CURSEBORNE.DICE.FIELDS.momentum.label"),
					momentum: true,
				},
			});
			this.terms.push(new foundry.dice.terms.OperatorTerm({ operator: "+" }), momentumTerm);
		}

		this.resetFormula();
		this._total = this._evaluateTotal();
	}

	/** @inheritDoc */
	toJSON() {
		const data = super.toJSON();
		// Include data object in serialised data
		data.data = this.data.toObject();

		// Delete inner rollData object to avoid it taking up space
		if ("rollData" in data.data) delete data.data.rollData;
		if ("actor" in data.options && data.options.actor && typeof data.options.actor !== "string")
			data.options.actor = data.options.actor.uuid;
		if ("token" in data.options && data.options.token && typeof data.options.token !== "string")
			data.options.token = data.options.token.uuid;
		return data;
	}

	/** @inheritDoc */
	async toMessage(messageData = {}, options = {}) {
		options.rollMode ||= this.data.rollMode;
		messageData.content ||= "";
		messageData.type ||= "roll";
		// this.#addDiceSoNiceEffects();
		return super.toMessage(messageData, options);
	}

	/**
	 * Add options to adjust 3D dice rendering in the Dice So Nice module.
	 */
	#addDiceSoNiceEffects() {
		this.curseTerm.options.sfx = {
			specialEffect: "PlayAnimationDark",
			options: { muteSound: true },
		};
	}

	renderDialog(options) {
		this.dialog?.render(options);
	}

	/** @inheritDoc */
	initialize(data) {
		if (data instanceof this.constructor.dataModel) data = data.toObject();
		this.data.updateSource(data);
		this.options?.actor?.system._onRollInitialize?.(this);
		this.terms = this.constructor.parse("", this.data);
		this._formula = this.constructor.getFormula(this.terms);
	}

	/**
	 * An object containing a Promise and its resolve and reject functions, populated when a roll is in progress.
	 *
	 * @type {{ promise: Promise<{ roll: this, message?: ChatMessage }>, resolve: Function, reject: Function }}
	 */
	#promise;

	/**
	 * A Promise that resolves when the roll is completed (and the chat message is created).
	 *
	 * @type {Promise<{ roll: this, message?: ChatMessage }>}}
	 */
	get promise() {
		return this.#promise.promise;
	}

	/**
	 * Factory method to create and configure a new CureborneRoll
	 *
	 * @param {ActorRollOptions} options - The options for the roll.
	 * @returns {Promise<ActorRollResult>} An object containing a roll and a message, if any.
	 */
	static async createActorRoll({
		type = ROLL_TYPE.GENERAL,
		actor,
		data = {},
		messageData = {},
		dialogOptions = {},
		message = {},
		skipDialog = false,
		chatMessage = true,
		...options
	} = {}) {
		/** @type {CurseborneRoll} */
		const progressRoll = actor.system.rolls[type];
		// If a roll of this type is already in progress, update its re-render its dialog, and return that roll
		if (!skipDialog && progressRoll) {
			progressRoll.initialize(data);
			progressRoll.renderDialog();
			progressRoll.dialog.bringToFront();
			return progressRoll.#promise.promise;
		}

		data.type = type;

		// If no roll of this type is in progress, create a new roll and render its dialog
		data.actor ??= actor.uuid;
		const rollData = new CurseborneRollContext(data, { parent: actor });
		const roll = new this(rollData, options);

		// If the roll is to be configured, store it as in-progress
		if (!skipDialog) {
			try {
				actor.system.rolls[type] = roll;
				roll.#promise = Promise.withResolvers();
				roll.dialog = new curseborne.applications.dialogs.CurseborneRollDialog({
					object: rollData,
					actor,
					...dialogOptions,
				});
				await roll.dialog.render(true);
				await roll.dialog.wait();
				roll.initialize();
			} catch (error) {
				roll.#promise.reject(error);
				throw error;
			} finally {
				// Unregister roll once it is configured
				if (actor.system.rolls[type] === roll) delete actor.system.rolls[type];
			}
		}

		// Evaluate roll and create message
		if (chatMessage) {
			messageData.flavor ||= roll.data.sources
				.filter((s) => s.type !== "")
				.map((s) => {
					const choiceData = DieSourceField.getChoices(s.type, actor);
					const label = choiceData.choices.find((c) => c.value === s.value)?.label || "";
					// Replace spaces with non-breaking spaces
					return label.replace(/ /g, "\u00A0");
				})
				.filterJoin(", ");
			const message = await roll.toMessage(messageData);
			const result = { roll: message.rolls[0], message };
			roll.#promise.resolve({ ...result });
			return { ...result };
		}

		await roll.evaluate();
		roll.promise.resolve({ roll });
		return { roll };
	}
}
