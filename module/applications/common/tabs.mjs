/**
 * Extend and application to add tabs handling.
 *
 * @param {typeof foundry.applications.api.ApplicationV2} Base - Class to extend, should include HandlebarsMixin
 */
export function TabsMixin(Base) {
	return class TabsApplication extends Base {
		/**
		 * Merge Application options with logic as described by ApplicationV2#_initializeApplicationOptions.
		 * @param {object} options
		 * @param {object} opts
		 */
		static #mergeTabOptions(options, opts) {
			for (const [k, v] of Object.entries(opts)) {
				const v1 = foundry.utils.deepClone(v);
				if (k in options) {
					const v0 = options[k];
					if (Array.isArray(v0))
						options[k].push(...v1); // Concatenate arrays
					else if (foundry.utils.getType(v0) === "Object") {
						// Merge objects
						TabsApplication.#mergeTabOptions(v0, v1);
					} else options[k] = v1; // Replace option
				} else options[k] = v1; // Define option
			}
		}

		static TABS = {
			primary: {
				labelPrefix: "CURSEBORNE.TABS",
			},
		};

		/** @inheritDoc */
		_prepareTabs(group = "primary", parts = []) {
			// Default tab for first time it's rendered this session
			const groupConfigs = [this.constructor.TABS[group]];

			// Merge all tab entries from the inheritance chain
			for (const cls of this.constructor.inheritanceChain()) {
				if (cls.TABS?.[group]) groupConfigs.unshift(cls.TABS[group]);
			}
			const mergedConfig = {};
			for (const config of groupConfigs.filter((c) => c)) {
				TabsApplication.#mergeTabOptions(mergedConfig, config);
			}
			// All values from tabs arrays get merged into a single array according to ids
			/** @type {Map<string, object>} */
			mergedConfig.tabs = mergedConfig.tabs.reduce((tabs, tab) => {
				if (tabs.has(tab.id)) {
					const existing = tabs.get(tab.id);
					tabs.set(tab.id, { ...existing, ...tab });
				} else {
					tabs.set(tab.id, tab);
				}
				return tabs;
			}, new Map());

			const { labelPrefix, initial, tabs = [] } = mergedConfig;
			if (!this.tabGroups[group])
				this.tabGroups[group] = tabs.get(initial)?.id || tabs.keys().next().value;

			let ids = [...parts];
			// If no parts are specified, default to all tabs; otherwise only include tabs matching the parts
			if (!parts.length) ids.push(...tabs.keys());
			ids = [...new Set(ids)]; // Deduplicate

			return ids.reduce((prepared, id) => {
				const tabConfig = tabs.get(id);
				if (!tabConfig) return prepared;

				let label = tabConfig.label;
				if (this.document?.documentName)
					label ??= `CURSEBORNE.${this.document.documentName}.Tabs.${id}`;
				else label ??= `${labelPrefix}.${id}`;

				const tab = {
					cssClass: "",
					group,
					id: tabConfig.id || id,
					icon: "",
					label,
					...tabConfig,
				};

				if (this.tabGroups[group] === tab.id) tab.cssClass = "active";
				prepared[id] = tab;
				return prepared;
			}, {});
		}

		/** @inheritDoc */
		async _prepareContext(options) {
			return {
				...(await super._prepareContext(options)),
				tabs: this._prepareTabs("primary", options.parts),
			};
		}

		/** @inheritDoc */
		async _preparePartContext(partId, context) {
			context = await super._preparePartContext(partId, context);
			// If the partId matches a tab, assume the part is a tab and add the tab data to the part's context
			if (partId in context.tabs) {
				context.tab = context.tabs[partId];
			}
			return context;
		}
	};
}
