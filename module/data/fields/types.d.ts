// SPDX-FileCopyrightText: © 2025 Ethaks <ethaks@pm.me>
//
// SPDX-License-Identifier: LicenseRef-CopyrightEthaks

import { IdentifierMixin } from "./identifier.mjs";

export interface IdentifierModel extends InstanceType<ReturnType<typeof IdentifierMixin>> {}
