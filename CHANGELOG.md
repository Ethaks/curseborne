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

## [0.0.4]

### Added

- Add roll modifiers (difficulty/complication) to _Awed_ and _Confused_ status effects
- Inherit sheet mode when viewing/editing items from a character sheet
- Add _Aspirations_ as text fields to Accursed sheets' biography tabs
- Enable manually sorting some item types in actor sheets

### Changed

- Tooltips for socials now always open to the right
- Allow bond uses to be edited in Play Mode
- Sort Skill dice before Attribute dice in roll dialogs

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
