// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { CURSEBORNE } from "./_module.mjs";

export type AttributeGroup = keyof typeof CURSEBORNE.attributeGroups;
export type Attribute = keyof typeof CURSEBORNE.attributes;

export type Practice = keyof typeof CURSEBORNE.practices;
export type SpellGroup = (typeof CURSEBORNE.practices)[Practice]["groups"] extends infer G
	? G extends any
		? keyof G
		: never
	: never;
