# Contributing to the Curseborne Game System

Code contributions to `ethaks/curseborne` are accepted subject to the following conditions and expectations.

## License and Property Rights

Curseborne is not currently offered under an open-source license. Please read the [LICENSE](LICENSE) file carefully before contributing.

By submitting a pull request or other contribution to this repository, you agree that:

1. You grant Ethaks a perpetual, worldwide, irrevocable, royalty-free, transferable, and sublicensable license to use, reproduce, modify, distribute, publicly perform, publicly display, and relicense your contribution, in whole or in part, in any form and for any purpose, including commercial use.
2. This license includes the right to relicense the contribution under different terms in the future.
3. You represent that you have the right to grant this license for your contribution.
4. To the extent permitted by applicable law, you waive any moral rights you may have in your contribution, or agree not to assert them against Ethaks or its licensees.

## Contribution Process

Contributions must follow a defined process.

1. A GitHub issue must be created documenting the proposed change in sufficient detail that it can be reviewed by a member of our team.
2. You may be asked to iterate on the scoping of this issue before it is approved for development. Do not start work on a PR until the issue has been marked as ready for work.
3. Issues which are acceptable to be worked on by a member of the community are assigned the `pr:available` label, indicating that they are available to be worked on by interested contributors.
4. If you begin work on an issue, please leave a comment in that issue mentioning that you are working on it so others know not to duplicate effort.

## Local Development Environment

It is expected that contributors to the Curseborne game system are already minimally familiar with the process for game system development in Foundry Virtual Tabletop. This is not a good choice of project to contribute to as a learning process.

Abbreviated instructions for setting up a local development environment for Curseborne are:

```sh
cd {FOUNDRY_VTT_DATA_DIR}/systems
git clone https://github.com/ethaks/curseborne.git
cd curseborne
bun install
bun run build
```
