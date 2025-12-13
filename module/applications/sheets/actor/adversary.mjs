import { staticID, systemTemplate } from "@helpers/utils.mjs";
import { CurseborneActorSheet } from "./base.mjs";

export class AdversarySheet extends CurseborneActorSheet {
	/** @inheritDoc */
	static DEFAULT_OPTIONS = {
		classes: ["adversary"],
		actions: {
			roll: this._onRoll,
			setCover: this._onSetCover,
		},
	};

	/** @inheritDoc */
	static PARTS = {
		header: { template: systemTemplate("actor/adversary-header") },
		tabs: { template: "templates/generic/tab-navigation.hbs" },
		main: { template: systemTemplate("actor/adversary-main") },
		biography: { template: systemTemplate("actor/biography") },
		effects: { template: systemTemplate("actor/effects") },
	};

	/** @inheritDoc */
	static TABS = {
		primary: {
			tabs: [
				{ id: "main", icon: "fa-solid fa-list" },
				{ id: "biography", icon: "fa-solid fa-feather" },
				{ id: "effects", icon: "fa-solid fa-person-rays" },
			],
			initial: "main",
		},
	};

	/** @inheritDoc */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.rollData ??= this.actor.getRollData();
		context.drive = await foundry.applications.ux.TextEditor.enrichHTML(this.actor.system.drive, {
			rollData: context.rollData,
			secrets: this.actor.isOwner,
		});

		const advTemplate = this.actor.itemTypes.template[0];
		if (advTemplate) {
			context.template = {
				id: advTemplate.id,
				name: advTemplate.name,
				img: advTemplate.img,
				tooltip: curseborne.tooltips.createPlaceholder({
					uuid: advTemplate.uuid,
				}),
			};
		}

		context.pools = {};
		for (const pool of ["primary", "secondary", "desperation"]) {
			const field = this.actor.system.schema.getField(`pools.${pool}`);
			const categories = context.editable
				? context.source.system.pools[pool].categories
				: await foundry.applications.ux.TextEditor.enrichHTML(
						this.actor.system.pools[pool].categories,
						{
							relativeTo: this.actor,
							secrets: this.actor.isOwner,
							rollData: context.rollData,
						},
					);
			context.pools[pool] = {
				id: pool,
				label: game.i18n.localize(`CURSEBORNE.Actor.Adversary.FIELDS.pools.${pool}.short`),
				value: this.isEditMode
					? context.source.system.pools[pool].value
					: this.actor.system.pools[pool].value,
				field: field.fields.value,
				categories: {
					field: this.actor.system.schema.getField(`pools.${pool}.categories`),
					value: categories,
					dataset: { tooltip: categories },
				},
				dataset: {
					action: "roll",
					pool,
				},
			};
		}

		const { cover, armor, injuries } = await this._prepareInjuries(context);
		Object.assign(context, { cover, armor, injuries });

		context.qualities = await this._prepareQualities(context);
		context.dreadPowers = await this._prepareDreadPowers(context);

		return context;
	}

	/** @inheritDoc */
	async _preparePartContext(partId, context) {
		context = await super._preparePartContext(partId, context);

		if (partId === "effects") {
			// Prepare active effects
			context.effects = this._prepareActiveEffectCategories(this.actor.allApplicableEffects());
			for (const category of Object.values(context.effects)) {
				category.effects = category.effects.filter(
					(effectCtx) =>
						!context.statusEffects.some(
							(status) => staticID(`curse${status.id}`) === effectCtx.effect.id,
						),
				);
			}
		}

		return context;
	}

	async _prepareQualities(_context) {
		const qualities = [];
		await Promise.all(
			this.actor.itemTypes.quality.map(async (quality) => {
				const qualityContext = {
					id: quality.id,
					item: quality,
					system: quality.system,
					img: quality.img,
					name: quality.name,
					tooltip: curseborne.tooltips.createPlaceholder({
						uuid: quality.uuid,
					}),
				};
				qualities.push(qualityContext);
			}),
		);
		qualities.sort((a, b) => a.item.sort - b.item.sort);
		return qualities;
	}

	async _prepareDreadPowers(_context) {
		const dreadPowers = [];
		await Promise.all(
			this.actor.itemTypes.dreadPower.map(async (dreadPower) => {
				const dreadPowerContext = {
					id: dreadPower.id,
					item: dreadPower,
					system: dreadPower.system,
					img: dreadPower.img,
					name: dreadPower.name,
					tooltip: curseborne.tooltips.createPlaceholder({
						uuid: dreadPower.uuid,
						tooltipDirection: foundry.helpers.interaction.TooltipManager.TOOLTIP_DIRECTIONS.RIGHT,
					}),
				};
				dreadPowers.push(dreadPowerContext);
			}),
		);
		dreadPowers.sort((a, b) => a.item.sort - b.item.sort);
		return dreadPowers;
	}

	async _prepareInjuries(_context) {
		const healthContext = {};

		// Cover
		const cover = this.actor.system.cover;
		const coverButtons = Object.entries(curseborne.config.coverTypes).map(
			([id, { label, icon }]) => {
				const isCurrent = cover.current === id;
				return {
					id,
					isCurrent,
					label: game.i18n.localize(label),
					cssClass: isCurrent ? "active" : "",
					icon,
				};
			},
		);
		healthContext.cover = {
			// show cover if a current type is set, or if the max value is greater than 0
			enabled: true,
			max: cover.max,
			label: game.i18n.localize("CURSEBORNE.Actor.base.FIELDS.cover.value.label"),
			field: this.actor.system.schema.fields.cover,
			buttons: coverButtons,
		};

		// Armor
		const armor = this.actor.system.armor;
		healthContext.armor = {
			enabled: armor.max > 0,
			label: game.i18n.localize("CURSEBORNE.Actor.base.FIELDS.armor.value.label"),
			boxes: Array.from({ length: armor.max }, (_, i) => ({
				index: i,
				filled: i >= armor.value,
			})),
		};

		// Injuries
		const injuries = this.actor.system.injuries;
		healthContext.injuries = {
			label: game.i18n.localize("CURSEBORNE.Actor.base.FIELDS.injuries.value.label"),
			boxes: Array.from({ length: injuries.max }, (_, i) => ({
				index: i,
				filled: i >= injuries.value,
			})),
		};
		return healthContext;
	}

	/**
	 * Create a roll from the actor sheet.
	 *
	 * @this {AdversarySheet}
	 * @param {Event} event The originating click event.
	 * @param {HTMLElement} target The clicked element.
	 * @returns {Promise<void>}
	 */
	static async _onRoll(_event, target) {
		const pool = target.dataset.pool;
		return this.actor.system.roll(pool, { token: this.token });
	}
}
