import { CurseborneTooltips } from "@applications/tooltip.mjs";
import { SocketHandler } from "@helpers/socket.mjs";
import * as applications from "./applications/_module.mjs";
import { CURSEBORNE } from "./config/_module.mjs";
import * as models from "./data/_module.mjs";
import * as dice from "./dice/_module.mjs";
import * as documents from "./documents/_module.mjs";
import { CurseborneHandlebarsHelpers } from "./helpers/handlebars.mjs";
import * as session from "./helpers/session.mjs";
import { registerSystemSheet, systemPath, systemTemplate } from "./helpers/utils.mjs";
import * as settings from "./settings.mjs";

/* ---------------------------------------------------------------------------------------------- */
/*                                           Public API                                           */
/* ---------------------------------------------------------------------------------------------- */
/**
 * The public API of the Curseborne system.
 *
 * This being a global property (and the system being loaded before modules) allows modules
 * to easily extend the system's classes e.g. to `curseborne.documents.CurseborneActor`.
 */
globalThis.curseborne = {
	documents,
	applications,
	models,
	config: CURSEBORNE,
	dice,
	session,
	/** @type {SocketHandler} */
	socket: null,
	/** @type {CurseborneTooltips} */
	tooltips: new CurseborneTooltips(),
};

/* ---------------------------------------------------------------------------------------------- */
/*                                           Init Hook                                            */
/* ---------------------------------------------------------------------------------------------- */

Hooks.once("init", () => {
	// Add custom constants for configuration.
	CONFIG.CURSEBORNE = CURSEBORNE;

	// Define custom Document and DataModel classes
	CONFIG.Actor.documentClass = documents.CurseborneActor;

	// Note that you don't need to declare a DataModel
	// for the base actor/item classes - they are included
	// with the Character/NPC as part of super.defineSchema()
	CONFIG.Actor.dataModels = {
		accursed: models.actor.Accursed,
		adversary: models.actor.Adversary,
	};
	CONFIG.Item.documentClass = documents.CurseborneItem;
	CONFIG.Item.dataModels = {
		// Accursed
		edge: models.item.Edge,
		skill: models.item.Skill,
		lineage: models.item.Lineage,
		family: models.item.Family,
		role: models.item.Role,
		social: models.item.Social,
		spell: models.item.Spell,
		equipment: models.item.Equipment,

		// Adversaries
		template: models.item.AdversaryTemplate,
		quality: models.item.AdversaryQuality,
		dreadPower: models.item.DreadPower,

		// Common
		trick: models.item.Trick,
	};

	// TODO: Remove with v14
	CONFIG.ActiveEffect.legacyTransferral = false;
	CONFIG.ActiveEffect.documentClass = documents.CurseborneActiveEffect;
	CONFIG.ActiveEffect.dataModels.base = models.effect.CurseborneActiveEffectModel;
	foundry.applications.apps.DocumentSheetConfig.unregisterSheet(
		foundry.documents.ActiveEffect,
		"core",
		foundry.applications.sheets.ActiveEffectConfig,
	);
	foundry.applications.apps.DocumentSheetConfig.registerSheet(
		foundry.documents.ActiveEffect,
		"curseborne",
		applications.sheets.CurseborneActiveEffectConfig,
	);
	documents.CurseborneActiveEffect._configureStatusEffects();

	// Register sheet application classes
	foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
	registerSystemSheet(foundry.documents.Actor, applications.sheets.CurseborneActorSheet);
	registerSystemSheet(foundry.documents.Actor, applications.sheets.AccursedSheet, ["accursed"]);
	registerSystemSheet(foundry.documents.Actor, applications.sheets.AdversarySheet, ["adversary"]);

	foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
	foundry.documents.collections.Items.registerSheet(
		"curseborne",
		applications.sheets.CurseborneItemSheet,
		{
			makeDefault: true,
			label: "CURSEBORNE.SheetLabels.Item",
		},
	);

	// Add Dice handling
	CONFIG.Dice.rolls.push(dice.CurseborneRoll);
	dice.registerModifiers();

	CONFIG.ChatMessage.documentClass = documents.CurseborneChatMessage;
	CONFIG.ChatMessage.dataModels = { roll: models.chat.CurseborneRollMessage };
	CONFIG.ChatMessage.template = systemTemplate("chat/message");

	settings.registerSettings();

	curseborne.socket = SocketHandler.initialize();

	CONFIG.fontDefinitions.Jost = {
		editor: true,
		fonts: [
			{
				urls: [systemPath("assets/fonts/Jost.woff2")],
				weight: "100 900",
			},
			{
				urls: [systemPath("assets/fonts/Jost-Italic.woff2")],
				style: "italic",
				weight: "100 900",
			},
		],
	};
	CONFIG.defaultFontFamily = "Jost";

	CONFIG.ui.momentum = applications.Momentum;
});

/* ---------------------------------------------------------------------------------------------- */
/*                                  Localization Initialization                                   */
/* ---------------------------------------------------------------------------------------------- */
Hooks.on("i18nInit", () => {
	// Localize non-TypeDataModels
	const { RollModifier, Enhancement, Complication } = models.modifier;
	const toLocalize = [dice.CurseborneRollContext, RollModifier, Enhancement, Complication];
	for (const model of toLocalize) {
		if (foundry.utils.isSubclass(model, foundry.abstract.DataModel))
			foundry.helpers.Localization.localizeDataModel(model);
	}
});

/* ---------------------------------------------------------------------------------------------- */
/*                                       Handlebars Helpers                                       */
/* ---------------------------------------------------------------------------------------------- */
CurseborneHandlebarsHelpers.registerHelpers();

/* ---------------------------------------------------------------------------------------------- */
/*                                           Ready Hook                                           */
/* ---------------------------------------------------------------------------------------------- */

Hooks.once("ready", () => {
	// Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
	Hooks.on("hotbarDrop", (_bar, data, slot) => createDocMacro(data, slot));
	ui.momentum.render(true);
	documents.CurseborneChatMessage.activateLogListeners();

	// Activate tooltips
	curseborne.tooltips.observe();
});

Hooks.on("renderChatLog", (_app, html) => {
	html.querySelector(".chat-log.themed.theme-light")?.classList.remove("themed", "theme-light");
});

Hooks.on("hotReload", (data) => {
	if (data.extension === "js") {
		document.location.reload();
		return false;
	}

	if (data.extension === "css") {
		const styles = document.querySelector("head").querySelectorAll("style");
		for (const style of styles) {
			if (style.textContent.includes(data.path)) {
				style.textContent = `@import "${data.path}?${Date.now()}";`;
			}
		}
	}

	if (data.extension === "hbs") {
		for (const message of game.messages) {
			ui.chat.updateMessage(message);
		}
	}
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createDocMacro(data, slot) {
	// First, determine if this is a valid owned item.
	if (data.type !== "Item") return;
	if (!data.uuid.includes("Actor.") && !data.uuid.includes("Token.")) {
		return ui.notifications.warn("You can only create macro buttons for owned Items");
	}
	// If it is, retrieve it based on the uuid.
	const item = await foundry.documents.Item.fromDropData(data);

	// Create the macro command using the uuid.
	const command = `game.curseborne.rollItemMacro("${data.uuid}");`;
	let macro = game.macros.find((m) => m.name === item.name && m.command === command);
	if (!macro) {
		macro = await foundry.documents.Macro.create({
			name: item.name,
			type: "script",
			img: item.img,
			command: command,
			flags: { "curseborne.itemMacro": true },
		});
	}
	game.user.assignHotbarMacro(macro, slot);
	return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function _rollItemMacro(itemUuid) {
	// Reconstruct the drop data so that we can load the item.
	const dropData = {
		type: "Item",
		uuid: itemUuid,
	};
	// Load the item from the uuid.
	foundry.documents.Item.fromDropData(dropData).then((item) => {
		// Determine if the item loaded and if it's an owned item.
		if (!item || !item.parent) {
			const itemName = item?.name ?? itemUuid;
			return ui.notifications.warn(
				`Could not find item ${itemName}. You may need to delete and recreate this macro.`,
			);
		}

		// Trigger the item roll
		item.roll();
	});
}
