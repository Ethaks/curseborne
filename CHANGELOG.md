<!--
SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>

SPDX-License-Identifier: LicenseRef-CopyrightEthaks
-->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!--
## Unreleased

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

### Known Issues
-->

## [0.3.0]

### Added

- Enable tricks to be purchased multiple times in the same action
- Add complication severity field to adversary templates
- Indicate status effects provided by custom Active Effects in the effects tabs
- Add rich tooltips to Active Effects
- Add scrolling text for updates to curse dice, armor, and injuries
- Add injury dice and enhancement for Near Death level
- Add integrity rolls to Accursed
- Increase the Defense and Integrity values of Accursed when buying Dodge/Resist tracks for their respective rolls
- Increase and decrease Momentum value when purchasing or adjusting the Bolster trick
- Add clash rolls to Accursed, available from the Spells tab
- Display additional injury boxes granted by an increased maximum number (like Invasive Growth)
- Add text fields for Damnation and Inheritance to Lineages and Families
- Add text enrichers: `/apply`, `/damage`, `/curseDice`

### Changed

- Allow individual enhancements to exceed a value of 3 to account for official content providing such
- Improve styling of document embed headers outside of tooltips

### Fixed

- Fix visual glitches in modifier dropdowns containing complex hints
- Adjust various status effects to match latest published rules: Agony, Awed, Deprived, Drained, Infected, Inspired, Slow-Acting Toxin
- Let custom Active Effects adding statuses provide their respective modifiers
- Make momentum enhancement comply with the usual rules and limits of enhancements
- Preserve expanded state of chat message details across updates
- Allow scrolling for particularly long adversary drive texts
- Use names instead of identifiers for Path Skills in sheets for non-embedded items

## [0.2.1]

### Fixed

- Fix a file reference failing to resolve on The Forge

## [0.2.0]

### Added

- Allow Spells in Accursed sheets to be grouped by Practice/Group or as flat list
- Enable Spell Advances to mark their cost as additional to the advanced Spell's
- Add input fields for system `identifier`s to sheets of relevant Items
- Add labels and hoverable hints to armor and injury fields in edit mode adversary sheets
- Implement initiative rolling for actors

### Changed

- Display no roll difficulty for non-private rolls without a set difficulty
- Prevent creation of adversary templates on actors that already have a template
- Set initial value for attributes to 1 instead of 0

### Fixed

- Fix roll dialogs trying to match the position of minimized sheets
- Allow adversaries' maximum injuries and armor modifiers to be negative
- Display complication hints in chat messages
- Adjust enhancements and complications applied to contact invokes and rolls according to rules

## [0.1.2]

### Fixed

- Fix error preventing Active Effect sheets from opening
- Use translated string for "Seconds" as Real Time unit again

## [0.1.1]

### Fixed

- Resolve Skills in Path sheets again
- Fix detection of already present Paths in Accursed to prevent doubled-up creation

## [0.1.0]

### Added

- Implement Motif Items
- Implement Torment Items
- Add Dread Power Type field
- Add Dread Power Injuries field
- Add Uses field to Dread Powers to track available and maximum uses per scene
- Add button for Storyguides to toggle a roll's Altered Outcome flag (#23)

### Changed

- Use `TextEditor` applications for biography tabs and Adversary Drive

### Fixed

- Renamed _Liar_ Status Effect to _Untrustworthy_
- Determine Altered Outcome according to updates rules (#22)

## [0.0.5]

### Added

- Add Entanglement Requirement field to spells

### Fixed

- Sort Advances of Spells under them again instead of purely based on manual sort order
- Use the configured `FilePicker` for image browsing, allowing users of The Forge to browser their assets
- Resolved an issue where the Trick Selector could not be opened when Tricks were stored in compendium packs

## [0.0.4]

### Added

- Add roll modifiers (difficulty/complication) to _Awed_ and _Confused_ status effects
- Inherit sheet mode when viewing/editing items from a character sheet
- Add _Aspirations_ as text fields to Accursed sheets' biography tabs
- Enable manually sorting some item types in actor sheets
- Make embedded items available in objects in `rollData` using their identifier as key, e.g. `actor.system.skills.technology`
- Derive number of injury dice into accursed system model, allowing effects to change them

### Changed

- Tooltips for socials now always open to the right
- Allow bond uses to be edited in Play Mode
- Sort Skill dice before Attribute dice in roll dialogs
- Rework roll initialisation to make use of common functionality

### Removed

- Remove _Damnation_ and _Inheritance_ item types

### Fixed

- Allow rolls of injured Accursed to proceed even without a chosen skill (#4)
- Enable choosing tricks with a negative cost in the trick selector (#5)
- Prevent dice from injury levels being added twice (#6)
- Allow Active Effects to be dragged from actor sheets (#11)
- Add missing _Mortally Wounded_ and _Drained_ status effect
- Prevent entered values in modifier selection elements to get added twice
- Add missing _Spiritualism_ practice
- Prevent Attribute dots affected by Active Effects from storing the derived value
- Prune unnecessary data from roll chat messages
