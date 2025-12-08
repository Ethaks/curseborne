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

## [0.1.0]

### Added

### Changed

- Use `TextEditor` applications for biography tabs

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
