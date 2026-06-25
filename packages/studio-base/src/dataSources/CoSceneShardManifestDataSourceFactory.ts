// SPDX-FileCopyrightText: Copyright (C) 2022-2024 Shanghai coScene Information Technology Co., Ltd.<hi@coscene.io>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { t } from "i18next";

import {
  IDataSourceFactory,
  DataSourceFactoryInitializeArgs,
} from "@foxglove/studio-base/context/PlayerSelectionContext";
import { createShardManifestPlayer } from "@foxglove/studio-base/players/IterablePlayer/coScene-shard-manifest/createShardManifestPlayer";
import { Player } from "@foxglove/studio-base/players/types";

/**
 * Authless data source that plays a shard manifest straight from a URL.
 *
 * Unlike {@link CoSceneDataPlatformDataSourceFactory}, this does not need a
 * logged-in user or a `consoleApi`: the manifest and its shards are fetched
 * directly from object storage. It powers the standalone deep-link flow
 * (`#manifestUrl=…`) and is hidden from the data-source picker.
 */
class CoSceneShardManifestDataSourceFactory implements IDataSourceFactory {
  public id = "coscene-shard-manifest";
  public type: IDataSourceFactory["type"] = "connection";
  public displayName = t("openDialog:coSceneDataPlatform");
  public iconName: IDataSourceFactory["iconName"] = "FileASPX";
  public hidden = true;
  public needLogin = false;

  public initialize(args: DataSourceFactoryInitializeArgs): Player | undefined {
    const manifestUrl = args.params?.url;
    if (!manifestUrl) {
      console.error("coscene-shard-manifest initialize: params.url is required");
      return undefined;
    }

    return createShardManifestPlayer({
      manifestUrl,
      sourceId: this.id,
      profile: args.params?.profile,
      metricsCollector: args.metricsCollector,
    });
  }
}

export default CoSceneShardManifestDataSourceFactory;
