import { staticID, systemTemplate } from "@helpers/utils.mjs";
import { CurseborneActorSheet } from "./base.mjs";

import { SessionSetting } from "@helpers/session-setting.mjs";
import { Flip } from "../../scripts/greensock/esm/Flip.js";

export class AccursedSheet extends CurseborneActorSheet {
	/** @override */
	static DEFAULT_OPTIONS = {
		classes: ["accursed"],
		actions: {
			toggleActorImage: this._onToggleActorImage,
			roll: this._onRoll,
			rollDefense: this._onRollDefense,
			toggleSidebar: this._onToggleSidebar,
			toggleSearch: this._onToggleSearch,
			nextSession: this._onNextSession,
			expandCover: this._onExpandCover,
			setCover: this._onSetCover,
		},
	};

	/** @override */
	static PARTS = {
		header: {
			template: systemTemplate("actor/header"),
		},
		tabs: {
			// Foundry-provided generic template
			template: "templates/generic/tab-navigation.hbs",
		},
		sidebar: {
			template: systemTemplate("actor/sidebar"),
		},
		main: {
			template: systemTemplate("actor/main"),
			scrollable: [""],
		},
		spells: {
			template: systemTemplate("actor/spells"),
			scrollable: [""],
			search: { callback: this._onSpellSearch },
		},
		equipment: {
			template: systemTemplate("actor/equipment"),
			scrollable: [""],
			search: { callback: this._onEquipmentSearch },
		},
		social: {
			template: systemTemplate("actor/social"),
			scrollable: [""],
		},
		biography: {
			template: systemTemplate("actor/biography"),
		},
		effects: {
			template: systemTemplate("actor/effects"),
			scrollable: [""],
		},
	};

	/** @inheritDoc */
	static TABS = {
		primary: {
			tabs: [
				{ id: "main", icon: "fa-solid fa-list" },
				{ id: "spells", icon: "fa-solid fa-hand-sparkles" },
				{ id: "equipment", icon: "fa-solid fa-backpack" },
				{ id: "social", icon: "fa-solid fa-users" },
				{ id: "effects", icon: "fa-solid fa-person-rays" },
				{ id: "biography", icon: "fa-solid fa-feather" },
			],
			initial: "main",
			labelPrefix: "CURSEBORNE.TABS",
		},
	};

	/**
	 * Search filters set up for this sheet.
	 *
	 * @type {Record<string, SearchFilter>}
	 */
	_searchFilters = {};
	/**
	 * Search modes for each search.
	 *
	 * @type {SessionSetting<Record<string, "full" | "name">>}
	 */
	#searchModesSetting = new SessionSetting(`${this.id}-searchModes`, {
		schema: new foundry.data.fields.TypedObjectField(
			new foundry.data.fields.StringField({
				choices: () => {
					return {
						[CONST.DIRECTORY_SEARCH_MODES.FULL]: "Sidebar.SearchModeFull",
						[CONST.DIRECTORY_SEARCH_MODES.NAME]: "Sidebar.SearchModeName",
					};
				},
				initial: CONST.DIRECTORY_SEARCH_MODES.NAME,
			}),
			{
				initial: {
					spells: CONST.DIRECTORY_SEARCH_MODES.NAME,
					equipment: CONST.DIRECTORY_SEARCH_MODES.NAME,
				},
			},
		),
	});

	/* -------------------------------------------- */

	/**
	 * @inheritDoc
	 */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		context.sidebar = await this._prepareSidebarContext(context);

		const { armor, injuries, cover } = await this._prepareInjuries(context);
		Object.assign(context, { armor, injuries, cover });

		context.paths = await this._preparePaths(context);
		context.skills = await this._prepareSkills(context);
		context.edges = await this._prepareEdges(context);
		context.attributes = await this._prepareAttributes(context);
		context.practices = await this._prepareSpells(context);
		context.equipment = await this._prepareEquipment(context);

		const { bonds, contacts } = await this._prepareSocials(context);
		Object.assign(context, { bonds, contacts });

		return context;
	}

	/** @override */
	async _preparePartContext(partId, context) {
		context = await super._preparePartContext(partId, context);
		switch (partId) {
			case "effects":
				context.tab = context.tabs[partId];
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
				break;
		}
		return context;
	}

	/**
	 * Whether the cover area is expanded.
	 *
	 * @type {SessionSetting<boolean>}
	 * @private
	 */
	#coverSetting = new SessionSetting(`${this.id}-cover-expanded`, {
		schema: new foundry.data.fields.BooleanField({
			initial: () => {
				const { cover } = this.actor.system;
				return cover.current || cover.max > 0;
			},
		}),
	});

	async _prepareInjuries(context) {
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
			expanded: this.#coverSetting.get(),
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
		let boxCounter = 0;
		const injuryLevels = Object.entries(curseborne.config.injuryLevels)
			.reverse()
			.map(([id, level]) => {
				const boxes = [];
				for (let i = 0; i < level.size; i++) {
					boxes.push({
						filled: boxCounter >= injuries.value,
						index: boxCounter,
					});
					boxCounter++;
				}
				return {
					id,
					label: game.i18n.localize(level.label),
					icon: level.icon,
					boxes,
					active: injuries.level === id,
				};
			});
		healthContext.injuries = {
			label: game.i18n.localize("CURSEBORNE.Actor.base.FIELDS.injuries.value.label"),
			levels: injuryLevels,
		};
		return healthContext;
	}

	async _prepareSidebarContext(context) {
		const sidebar = {};
		sidebar.expanded = this.#sidebarSetting.get();
		// Use either actor image or prototype token, dependent on ui flag
		if (this.actor.system.ui?.showToken) {
			sidebar.showToken = true;
			sidebar.image = this.actor.prototypeToken?.texture.src;
			sidebar.imageLabel = "CURSEBORNE.ShowActorImage";
		} else {
			sidebar.showToken = false;
			sidebar.image = this.actor.img;
			sidebar.imageLabel = "CURSEBORNE.ShowTokenImage";
		}

		return sidebar;
	}

	async _preparePaths(context) {
		const paths = {};
		for (const type of ["lineage", "family", "role"]) {
			const item = this.actor.itemTypes[type][0];
			if (item) {
				paths[type] = {
					name: item.name,
					img: item.img,
					id: item.id,
					tooltip: curseborne.tooltips.createPlaceholder({
						uuid: item.uuid,
						tooltipDirection: foundry.helpers.interaction.TooltipManager.TOOLTIP_DIRECTIONS.DOWN,
					}),
				};
			} else {
				paths[type] = {
					name: "None",
					img: null,
					id: "",
				};
			}
		}
		return paths;
	}

	async _prepareSkills(context) {
		const skills = [];

		const items = this.actor.itemTypes.skill.sort((a, b) => a.name.localeCompare(b.name));
		for (let i = 0; i < items.length; i++) {
			// Determine whether the index is 0/even (left) or 1/odd (right)
			const isLeft = i % 2 === 0;
			const tooltipDirection = isLeft
				? foundry.helpers.interaction.TooltipManager.TOOLTIP_DIRECTIONS.LEFT
				: foundry.helpers.interaction.TooltipManager.TOOLTIP_DIRECTIONS.RIGHT;

			const skill = items[i];
			skills.push({
				id: skill.id,
				uuid: skill.uuid,
				name: skill.name,
				system: skill.system,
				dotField: skill.system.schema.fields.dots,
				formGroupOptions: {
					...context.formGroupOptions,
					rootId: `${context.formGroupOptions.rootId}-skills-${skill.id}`,
				},
				dataset: { action: "updateEmbedded", property: "system.dots.value" },
				tooltip: curseborne.tooltips.createPlaceholder({
					uuid: skill.uuid,
					tooltipDirection,
				}),
			});
		}

		// Ignore sort order, use alphabetical order
		skills.sort((a, b) => a.name.localeCompare(b.name));
		return skills;
	}

	async _prepareEdges(context) {
		const edges = [];

		for (const edge of this.actor.itemTypes.edge) {
			edges.push({
				id: edge.id,
				name: edge.name,
				img: edge.img,
				system: edge.system,
				dotField: edge.system.schema.fields.dots,
				formGroupOptions: {
					...context.formGroupOptions,
					rootId: `${context.formGroupOptions.rootId}-edges-${edge.id}`,
				},
				dataset: { action: "updateEmbedded", property: "system.dots.value" },
				tooltip: curseborne.tooltips.createPlaceholder({
					uuid: edge.uuid,
					tooltipDirection: foundry.helpers.interaction.TooltipManager.TOOLTIP_DIRECTIONS.DOWN,
				}),
			});
		}

		return edges;
	}

	async _prepareAttributes(context) {
		const groups = Object.entries(curseborne.config.attributeGroups).reduce(
			(acc, [id, { label }]) => {
				acc[id] = { label, attributes: [] };
				return acc;
			},
			{},
		);
		for (const [id, attribute] of Object.entries(this.actor.system.attributes)) {
			const attributeConfig = curseborne.config.attributes[id];
			if (!attributeConfig) continue;
			const group = attributeConfig.group;
			if (!groups[group]) continue;
			groups[group].attributes.push({
				id,
				label: game.i18n.localize(attributeConfig.label),
				field: this.actor.system.schema.fields.attributes.fields[id],
				value: attribute.value,
				max: attribute.max,
			});
		}
		return groups;
	}

	async _prepareSpells(context) {
		// The result object for the context;
		const spellsContext = {};

		const prepareSpell = (spell, isAdvance = false) => {
			// The subgroup ID for the spell's practice
			const subgroup = spell.system.practice;
			// Find practice to which subgroup belongs
			const [practice, { label, subgroups }] = Object.entries(curseborne.config.practices).find(
				(p) => p[1].subgroups?.[subgroup],
			);
			spellsContext[practice] ??= {
				label,
				subgroups: {},
			};
			spellsContext[practice].subgroups[subgroup] ??= {
				label: subgroups[subgroup].label,
				spells: [],
			};
			const spellContext = {
				id: spell.id,
				item: spell,
				name: spell.name,
				img: spell.img,
				system: spell.system,
				isAdvance,
				tooltip: curseborne.tooltips.createPlaceholder({ uuid: spell.uuid }),
			};

			// Cost label, consisting of type and value, localized, and with the value in bold, with a die icon before it;
			const { type: costType, value: costValue } = spell.system.cost;
			if (costType && costValue) {
				// TODO: Determine whether dice make sense or just clutter the UI
				// spellContext.cost = `<i class="fa-light fa-dice-d10"></i> ${costValue}`;
				spellContext.cost = spell.system.cost.value;
				spellContext.costIcon = curseborne.config.spellCostTypes[costType].icon;
				spellContext.costLong = game.i18n.format(
					`CURSEBORNE.Item.Spell.FIELDS.cost.${costType.capitalize()}X`,
					{
						value: costValue,
						dice: game.i18n.localize(
							costValue === 1 ? "CURSEBORNE.CurseDie" : "CURSEBORNE.CurseDice",
						),
					},
				);
			}

			if (spell.system.attunements.size) {
				spellContext.attunements = game.i18n
					.getListFormatter({ type: "conjunction", style: "narrow" })
					.format(
						spell.system.attunements.map((a) => {
							// TODO: Allow freeform attunements while developing
							if (curseborne.config.attunements[a]) {
								return game.i18n.localize(curseborne.config.attunements[a].label);
							}
							return a;
						}),
					);
			}

			spellsContext[practice].subgroups[subgroup].spells.push(spellContext);
		};

		const spells = this.actor.itemTypes.spell;
		for (const spell of spells) {
			// Skip spell advancements unless their base spell is missing
			if (
				spell.system.advances &&
				spells.some((s) => s.system.identifier === spell.system.advances)
			)
				continue;
			prepareSpell(spell);

			const advancements = spell.system.advancements;
			for (const advancement of advancements) {
				prepareSpell(advancement, true);
			}
		}
		return spellsContext;
	}

	async _prepareSocials(context) {
		const bonds = [];
		const contacts = [];

		await Promise.all(
			this.actor.itemTypes.social.map(async (social) => {
				const fields = social.system.schema.fields;
				const { TOOLTIP_DIRECTIONS } = foundry.helpers.interaction.TooltipManager;
				const socialContext = {
					// Common data
					...social,
					id: social.id,
					formGroupOptions: {
						...context.formGroupOptions,
						rootId: `${context.formGroupOptions.rootId}-${social.system.type}-${social.id}`,
					},
					description: Handlebars.escapeExpression(
						await foundry.applications.ux.TextEditor.enrichHTML(social.system.description, {
							secrets: this.document.isOwner,
							rollData: social.getRollData(),
						}),
					),
					tooltip: curseborne.tooltips.createPlaceholder({
						uuid: social.uuid,
						tooltipDirection:
							social.system.type === "bond" ? TOOLTIP_DIRECTIONS.RIGHT : TOOLTIP_DIRECTIONS.LEFT,
					}),

					// Bond data
					bond: {
						dots: {
							field: fields.bond.fields.dots,
							dataset: {
								action: "updateEmbedded",
								property: "system.bond.dots.value",
								tooltip: fields.bond.fields.dots.label,
							},
						},
						uses: {
							field: social.system.schema.fields.bond.fields.uses,
							dataset: {
								action: "updateEmbedded",
								property: "system.bond.uses.value",
								tooltip: "CURSEBORNE.SOCIAL.FIELDS.bond.uses.labelLong",
							},
						},
					},
				};

				// Common handling if UUID reference to another document exists
				if (social.system.uuid) {
					const doc = foundry.utils.fromUuidSync(social.system.uuid);
					if (doc) {
						socialContext.name = doc.name;
						socialContext.img = doc.img;
					}
				}

				if (social.system.type === "contact") {
					socialContext.contact = {
						dots: {
							field: fields.contact.fields.dots,
							dataset: {
								action: "updateEmbedded",
								property: "system.contact.dots.value",
								tooltip: fields.contact.fields.dots.label,
							},
						},
					};
				}

				// Push to the appropriate array
				if (social.system.type === "bond") {
					bonds.push(socialContext);
				} else if (social.system.type === "contact") {
					contacts.push(socialContext);
				}
			}),
		);
		return { bonds, contacts };
	}

	async _prepareEquipment(context) {
		const equipmentContext = {};
		const items = this.actor.itemTypes.equipment;

		equipmentContext.sections = Object.fromEntries(
			Object.entries(curseborne.config.equipmentTypes).map(([id, { label }]) => [
				id,
				{ id, label, items: [] },
			]),
		);

		for (const item of items) {
			const type = item.system.type;
			equipmentContext.sections[type]?.items.push({
				item,
				system: item.system,
				id: item.id,
				name: item.name,
				img: item.img,
				tooltip: curseborne.tooltips.createPlaceholder({ uuid: item.uuid }),
			});
		}

		return equipmentContext;
	}

	/** @inheritDoc */
	_onRender(context, options) {
		super._onRender(context, options);

		const isSidebarCollapsed = this.#sidebarSetting.get();
		this.element.classList.toggle("sidebar-collapsed", isSidebarCollapsed);

		// Apply search filters
		for (const [searchPart, { search }] of Object.entries(this.constructor.PARTS).filter(
			(p) => p[1].search,
		)) {
			if (!options.parts.includes(searchPart)) continue;
			this._applySearchMode(searchPart);
			// Create search filter and apply it
			const inputSelector = `search[data-search="${searchPart}"] input[type="search"]`;
			this._searchFilters[searchPart] = new foundry.applications.ux.SearchFilter({
				inputSelector,
				contentSelector: `section.tab.${searchPart}`,
				initial: this.element.querySelector(inputSelector).value,
				callback: search.callback.bind(this),
			});
			// HACK: Override the debounced filter function to allow for immediate filtering
			this._searchFilters[searchPart]._filter = search.callback.bind(this);
			this._searchFilters[searchPart].bind(this.element);
		}
	}

	_preSyncPartState(partId, newElement, priorElement, state) {
		super._preSyncPartState(partId, newElement, priorElement, state);
		if (partId === "spells") {
			state.spellSearch = priorElement.querySelector("input.spell-search")?.value;
		}
	}

	_syncPartState(partId, newElement, priorElement, state) {
		super._syncPartState(partId, newElement, priorElement, state);
		if (partId === "spells" && state.spellSearch) {
			newElement.querySelector("input.spell-search").value = state.spellSearch;
		}
	}

	/** @inheritDoc */
	_getContextMenuOptions() {
		const options = super._getContextMenuOptions();
		options.push({
			name: "CURSEBORNE.Item.Path.SetMajor",
			icon: '<i class="fa-solid fa-crown"></i>',
			group: game.i18n.localize("TYPES.Item.path"),
			condition: (li) => {
				const id = li.closest("[data-item-id]")?.dataset.itemId;
				if (!id) return false;
				const item = this.actor.items.get(id);
				const canBeMajor = item?.type === "lineage" || item?.type === "family";
				const isMajor = this.actor.system.major === item.id;
				return canBeMajor && !isMajor;
			},
			callback: (li) => {
				const id = li.closest("[data-item-id]").dataset.itemId;
				const item = this.actor.items.get(id);
				if (item) return item.system.setMajor();
			},
		});
		return options;
	}

	/* -------------------------------------------- */
	/*  Event Listeners and Handlers                */
	/* -------------------------------------------- */

	/**
	 * Toggle between showing the actor image or the prototype token image in the sidebar.
	 *
	 * @this {AccursedSheet}
	 * @param {Event} event - The triggering event
	 * @param {HTMLElement} _target - The target element
	 */
	static async _onToggleActorImage(event, _target) {
		event.preventDefault();
		if (!this.actor.isOwner) return;
		const showToken = !this.actor.system.ui?.showToken;
		return this.actor.update({ "system.ui.showToken": showToken });
	}

	/**
	 * Create a general roll for the actor.
	 *
	 * @this {AccursedSheet}
	 * @param {Event} event - The triggering event
	 * @param {HTMLElement} target - The target element
	 * @returns {Promise<void>}
	 */
	static async _onRoll(event, target) {
		event.preventDefault();
		if (!this.actor.isOwner) return;

		// Roll item
		const itemElement = target.closest("[data-item-id]");
		if (itemElement) {
			const itemId = itemElement.dataset.itemId;
			const item = this.actor.items.get(itemId);
			if (item) return item.system.roll({ event });
		}

		const attributeId = target.closest("[data-attribute-id]").dataset.attributeId;
		if (attributeId) {
			return this.actor.system.roll(attributeId, { event });
		}
	}

	/**
	 * Roll a defense roll.
	 *
	 * @this {AccursedSheet}
	 * @param {Event} event - The triggering event
	 * @param {HTMLElement} _target - The target element
	 * @returns {Promise<void>}
	 */
	static async _onRollDefense(event, _target) {
		event.preventDefault();
		if (!this.actor.isOwner) return;

		return this.actor.system.rollDefense({ skipDialog: event.shiftKey });
	}

	static async _onNextSession(event, target) {
		event.preventDefault();
		if (!this.actor.isOwner) return;
		return curseborne.session.startSession([this.actor.id]);
	}

	/**
	 * Toggle the expanded state of the cover area.
	 *
	 * @this {AccursedSheet}
	 * @param {Event} event - The triggering event
	 * @param {HTMLElement} target - The target element
	 * @returns {Promise<void>}
	 */
	static async _onExpandCover(event, target) {
		event.preventDefault();
		const coverDetails = this.element.querySelector(".sidebar .cover-details");
		const expanded = coverDetails.classList.contains("expanded");
		const chevron = this.element.querySelector(
			".sidebar .combat .cover [data-action='expandCover'] i",
		);
		chevron.classList.toggle("fa-chevron-down", expanded);
		chevron.classList.toggle("fa-chevron-up", !expanded);
		gsap.fromTo(
			coverDetails,
			{
				height: expanded ? "54px" : 0,
				opacity: expanded ? 1 : 0,
			},
			{
				duration: 0.3,
				height: expanded ? 0 : "54px",
				opacity: expanded ? 0 : 1,
				ease: "power1.inOut",
				// clearProps: true,
				onStart: () => {
					coverDetails.style.display = "grid";
				},
				onComplete: () => {
					coverDetails.style.display = "";
					coverDetails.classList.toggle("expanded", !expanded);
				},
			},
		);

		this.#coverSetting.set(!expanded);
		target.blur();
	}

	/**
	 * Set the type of active cover for the actor.
	 *
	 * @this {AccursedSheet}
	 * @param {Event} event - The triggering event
	 * @param {HTMLElement} target - The target element
	 * @returns {Promise<void>}
	 */
	static async _onSetCover(event, target) {
		event.preventDefault();
		if (!this.actor.isOwner) return;
		const cover = target.dataset.cover;

		if (cover === "reset") {
			this.#coverSetting.set(false);
			return this.actor.update({
				"system.cover": { value: 0, max: 0, current: "" },
			});
		}

		this.#coverSetting.set(true);
		const coverConfig = curseborne.config.coverTypes[cover];
		return this.actor.update({
			"system.cover": {
				value: 10,
				max: coverConfig.damage,
				current: cover,
			},
		});
	}

	/**
	 * Whether the sidebar is collapsed.
	 *
	 * @type {SessionSetting<boolean>}
	 * @private
	 */
	#sidebarSetting = new SessionSetting(`${this.id}-sidebarCollapsed`, {
		schema: new foundry.data.fields.BooleanField({ initial: false }),
	});

	/**
	 * @this {AccursedSheet}
	 * @param {Event} event - The triggering event
	 * @param {HTMLElement} target - The target element
	 */
	static async _onToggleSidebar(event, target) {
		event.preventDefault();
		const isCollapsed = this.element.classList.contains("sidebar-collapsed");
		const state = Flip.getState(
			this.element.querySelectorAll(
				".sidebar, .skills-edges, .skills-edges > fieldset, section.active > *",
			),
			{ props: "padding,padding-right,margin,min-width" },
		);
		this.element.classList.toggle("sidebar-collapsed", !isCollapsed);
		Flip.from(state, {
			absolute: true,
			// stagger: 0.02,
			clearProps: true,
			toggleClass: "flipping",
			nested: true,
			duration: 0.5,
			ease: "power1.inOut",
		});
		this.#sidebarSetting.set(!isCollapsed);
	}

	/**
	 * Filter displayed equipment based on a search query, using equipment type and name.
	 *
	 * @this {AccursedSheet}
	 * @param {Event} event - The triggering event
	 * @param {string} query - The search query
	 * @param {RegExp} rgx - The regular expression used to match the query
	 * @param {HTMLElement} html - The list of equipment
	 */
	static _onEquipmentSearch(event, query, rgx, html) {
		this._searchFilters.equipment._filter = foundry.utils.debounce(
			this._searchFilters.equipment.callback,
			200,
		);
		const searchMode = this.#searchModesSetting.get().equipment;

		// Store state for animation
		let state;
		if (!(event instanceof KeyboardEvent))
			state = Flip.getState("search, section.equipment-type, li.item", {
				props: "padding",
			});

		const types = html.querySelectorAll("section.equipment-type");
		for (const type of types) {
		}
	}

	/**
	 * Filter displayed spells based on a search query, using practice/subgroup/spell name/(optionally, spell description).
	 * When the practice/subgroup is matched, all spells within it are displayed.
	 * Otherwise, only spells whose name (and description) match the query are displayed.
	 *
	 * @this {AccursedSheet}
	 * @param {Event} event - The triggering event
	 * @param {string} query - The search query
	 * @param {RegExp} rgx - The regular expression used to match the query
	 * @param {HTMLElement} html - The list of spells
	 */
	static _onSpellSearch(event, query, rgx, html) {
		// HACK: Reset the filter function previously overridden in the initial render
		this._searchFilters.spells._filter = foundry.utils.debounce(
			this._searchFilters.spells.callback,
			200,
		);
		const searchMode = this.#searchModesSetting.get().spells;

		// Store state for animation
		let state;
		if (!(event instanceof KeyboardEvent))
			state = Flip.getState(
				html.querySelectorAll("search, section.practice, ol.subgroup, li.spell"),
				{ props: "padding" },
			);

		const practices = html.querySelectorAll("section.practice");
		for (const practice of practices) {
			let practiceMatches = false;
			let practiceVisible = false;
			const practiceName = practice.querySelector(".header").textContent;
			if (rgx.test(practiceName)) {
				practiceVisible = practiceMatches = true;
			}
			const subgroups = practice.querySelectorAll("ol.subgroup");
			for (const subgroup of subgroups) {
				let subgroupMatches = false;
				let subgroupVisible = practiceMatches || false;
				const subgroupName = subgroup.querySelector(".subgroup-header").textContent;
				if (rgx.test(subgroupName)) {
					subgroupVisible = subgroupMatches = true;
				}
				const spells = subgroup.querySelectorAll("li.spell");
				for (const spell of spells) {
					const name = spell.querySelector(".item-name").textContent;

					const item = this.actor.items.get(spell.dataset.itemId);
					const description = item.system.description;
					const attunements = spell.querySelector(".spell-attunements")?.textContent ?? "";
					const fullSearchMatches =
						searchMode === CONST.DIRECTORY_SEARCH_MODES.FULL &&
						(rgx.test(attunements) || rgx.test(description));

					const matches = practiceMatches || subgroupMatches || rgx.test(name) || fullSearchMatches;
					spell.style.display = matches || subgroupMatches ? "" : "none";
					if (matches) {
						subgroupVisible = practiceVisible = true;
					}
				}
				subgroup.style.display = subgroupVisible ? "" : "none";
			}
			practice.style.display = practiceVisible ? "" : "none";
		}

		// Animate the changes unless the callback is triggered by a re-render
		if (state) {
			Flip.from(state, {
				duration: 0.3,
				stagger: 0.01,
				absolute: true,
				fade: true,
				ease: "power1.inOut",
				transition: "none",
				clearProps: true,
				paused: globalThis.pausegsap,
				nested: true,
				onEnter: (elements) => gsap.fromTo(elements, { opacity: 0 }, { duration: 0.3, opacity: 1 }),
				onLeave: (elements) => gsap.fromTo(elements, { opacity: 1 }, { duration: 0.3, opacity: 0 }),
			});
		}
	}

	/**
	 * Toggle between filtering spells including their description, and filtering only by practice/group/spell name.
	 *
	 * @this {AccursedSheet}
	 * @param {Event} event - The triggering event
	 * @param {HTMLElement} target - The target
	 */
	static _onToggleSearch(event, target) {
		// Modes: CONST.DIRECTORY_SEARCH_MODES.FULL, CONST.DIRECTORY_SEARCH_MODES.NAME;
		const search = target.closest("search").dataset.search;
		const searchModes = this.#searchModesSetting.get();
		const searchMode = searchModes[search];
		const newMode =
			searchMode === CONST.DIRECTORY_SEARCH_MODES.FULL
				? CONST.DIRECTORY_SEARCH_MODES.NAME
				: CONST.DIRECTORY_SEARCH_MODES.FULL;
		this.#searchModesSetting.set({ ...searchModes, [search]: newMode });
		this._applySearchMode(search, newMode);
		this._searchFilters[search].filter(new Event("input"), this._searchFilters[search].query);
	}

	/**
	 * Applies the current search mode to a search button.
	 *
	 * @param {string} search - The search for which to apply the search mode
	 * @param {string} searchMode - The search mode to apply
	 */
	_applySearchMode(search, searchMode) {
		// Retrieve search mode from session setting, update button accordingly
		const searchModes = this.#searchModesSetting.get();
		searchMode ??= searchModes[search];
		const searchIcon =
			searchMode === CONST.DIRECTORY_SEARCH_MODES.FULL ? "fa-file-magnifying-glass" : "fa-search";
		const searchTooltip =
			searchMode === CONST.DIRECTORY_SEARCH_MODES.NAME
				? "SIDEBAR.SearchModeName"
				: "SIDEBAR.SearchModeFull";
		const searchButton = this.element.querySelector(
			`search[data-search="${search}"] button.toggle-search-mode`,
		);
		searchButton.classList.remove("fa-file-magnifying-glass", "fa-search");
		searchButton.classList.add("fa-solid", searchIcon);
		searchButton.dataset.tooltip = searchTooltip;
		searchButton.ariaLabel = game.i18n.localize(searchTooltip);
	}

	/***************
	 *
	 * Drag and Drop
	 *
	 ***************/

	/********************
	 *
	 * Actor Override Handling
	 *
	 ********************/

	/**
	 * Submit a document update based on the processed form data.
	 * @param {SubmitEvent} event                   The originating form submission event
	 * @param {HTMLFormElement} form                The form element that was submitted
	 * @param {object} submitData                   Processed and validated form data to be used for a document update
	 * @returns {Promise<void>}
	 * @protected
	 * @override
	 */
	async _processSubmitData(event, form, submitData) {
		const overrides = foundry.utils.flattenObject(this.actor.overrides);
		for (const k of Object.keys(overrides)) delete submitData[k];
		await this.document.update(submitData);
	}

	/**
	 * Disables inputs subject to active effects
	 */
	#disableOverrides() {
		const flatOverrides = foundry.utils.flattenObject(this.actor.overrides);
		for (const override of Object.keys(flatOverrides)) {
			const input = this.element.querySelector(`[name="${override}"]`);
			if (input) {
				input.disabled = true;
			}
		}
	}
}
