// SPDX-FileCopyrightText: Copyright (C) 2022-2024 Shanghai coScene Information Technology Co., Ltd.<hi@coscene.io>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Time } from "@foxglove/rostime";
import {
  IterablePlayer,
  WorkerSerializedIterableSource,
} from "@foxglove/studio-base/players/IterablePlayer";
import { Player, PlayerMetricsCollectorInterface } from "@foxglove/studio-base/players/types";

const DEFAULT_READ_AHEAD_DURATION: Time = { sec: 10, nsec: 0 };

/**
 * Builds an {@link IterablePlayer} that reads playback shards directly from a
 * manifest URL. The manifest and its shards are fetched straight from object
 * storage, so this needs no `consoleApi` and works for both the authenticated
 * data-platform fallback and the authless standalone deep-link flow.
 */
export function createShardManifestPlayer(opts: {
  manifestUrl: string;
  sourceId: string;
  profile?: string;
  metricsCollector?: PlayerMetricsCollectorInterface;
  urlParams?: Record<string, string>;
  readAheadDuration?: Time;
}): Player {
  const { manifestUrl, profile } = opts;

  const params: Record<string, string> = { url: manifestUrl };
  if (profile != undefined) {
    params.profile = profile;
  }

  const source = new WorkerSerializedIterableSource({
    initWorker: () => {
      // foxglove-depcheck-used: babel-plugin-transform-import-meta
      return new Worker(
        new URL(
          "@foxglove/studio-base/players/IterablePlayer/coScene-shard-manifest/ShardManifestIterableSource.worker",
          import.meta.url,
        ),
      );
    },
    initArgs: { params },
  });

  return new IterablePlayer({
    metricsCollector: opts.metricsCollector,
    source,
    sourceId: opts.sourceId,
    urlParams: opts.urlParams,
    readAheadDuration: opts.readAheadDuration ?? DEFAULT_READ_AHEAD_DURATION,
    name: profile ? `Shard manifest (${profile})` : "Shard manifest",
  });
}
