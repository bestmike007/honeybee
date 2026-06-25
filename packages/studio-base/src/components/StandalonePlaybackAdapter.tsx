// SPDX-FileCopyrightText: Copyright (C) 2022-2024 Shanghai coScene Information Technology Co., Ltd.<hi@coscene.io>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

import Logger from "@foxglove/log";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import {
  LayoutData,
  useCurrentLayoutActions,
} from "@foxglove/studio-base/context/CurrentLayoutContext";
import { usePlayerSelection } from "@foxglove/studio-base/context/PlayerSelectionContext";
import { useWorkspaceActions } from "@foxglove/studio-base/context/Workspace/useWorkspaceActions";
import { replaceNullWithUndefined } from "@foxglove/studio-base/util/coscene";
import {
  StandalonePlaybackParams,
  windowStandalonePlaybackParams,
} from "@foxglove/studio-base/util/standalonePlayback";

const log = Logger.getLogger(__filename);

const SHARD_MANIFEST_SOURCE_ID = "coscene-shard-manifest";

const selectStartPlayback = (ctx: MessagePipelineContext) => ctx.startPlayback;
// The player only honors a play request once it knows its time bounds, which is
// also when activeData (and thus endTime) first appears.
const selectPlaybackReady = (ctx: MessagePipelineContext) =>
  ctx.playerState.activeData?.endTime != undefined;

/**
 * Fetches a Foxglove layout JSON and returns its {@link LayoutData}.
 *
 * Accepts both a bare layout-data document (the shape `Export layout` writes)
 * and one wrapped as `{ name?, data: {...} }`.
 */
async function fetchLayoutData(layoutUrl: string): Promise<LayoutData> {
  const response = await fetch(layoutUrl);
  if (!response.ok) {
    throw new Error(`failed to fetch layout (${response.status} ${response.statusText})`);
  }
  const parsed: unknown = await response.json();
  if (typeof parsed !== "object" || parsed == undefined) {
    throw new Error("layout is not a JSON object");
  }
  const maybeWrapped = parsed as { data?: unknown };
  const dataSource =
    typeof maybeWrapped.data === "object" && maybeWrapped.data != undefined
      ? maybeWrapped.data
      : parsed;
  return replaceNullWithUndefined(dataSource) as LayoutData;
}

/**
 * StandalonePlaybackAdapter
 *
 * Drives the authless, self-contained playback flow described by the URL
 * fragment (`#manifestUrl=…&layoutUrl=…`). When such params are present it:
 *   1. selects the (hidden, authless) shard-manifest data source from the
 *      manifest URL — no login or consoleApi required, and
 *   2. fetches the layout JSON from `layoutUrl` and applies it in-memory via
 *      `setCurrentLayout` (nothing is persisted to the layout manager).
 *
 * It runs exactly once and renders nothing. The caller is expected to render
 * this *instead of* DeepLinksSyncAdapter when standalone params are present.
 */
export function StandalonePlaybackAdapter({
  params = windowStandalonePlaybackParams(),
}: {
  params?: StandalonePlaybackParams;
}): ReactNull {
  const { selectSource } = usePlayerSelection();
  const { setCurrentLayout } = useCurrentLayoutActions();
  const { sidebarActions, playbackControlActions } = useWorkspaceActions();
  const startPlayback = useMessagePipeline(selectStartPlayback);
  const playbackReady = useMessagePipeline(selectPlaybackReady);

  const processed = useRef(false);
  const autoPlayed = useRef(false);

  useEffect(() => {
    if (processed.current || params == undefined) {
      return;
    }
    processed.current = true;

    log.debug("Initialising standalone playback", params);

    // Shared standalone links open to a clean, layout-first view that loops.
    sidebarActions.left.setOpen(false);
    playbackControlActions.setRepeat(true);

    selectSource(SHARD_MANIFEST_SOURCE_ID, {
      type: "connection",
      params: { url: params.manifestUrl, profile: params.profile },
    });

    if (params.layoutUrl != undefined) {
      const layoutUrl = params.layoutUrl;
      fetchLayoutData(layoutUrl)
        .then((data) => {
          setCurrentLayout({ data, name: "Shared layout" });
        })
        .catch((error: unknown) => {
          log.error("Failed to load standalone layout", error);
          toast.error(`Failed to load layout: ${(error as Error).message}`);
        });
    }
  }, [params, selectSource, setCurrentLayout, sidebarActions, playbackControlActions]);

  // Auto-play once the player is initialized with its time bounds, otherwise the
  // play request is dropped before the player is ready.
  useEffect(() => {
    if (params == undefined || autoPlayed.current || startPlayback == undefined || !playbackReady) {
      return;
    }
    autoPlayed.current = true;
    startPlayback();
  }, [params, startPlayback, playbackReady]);

  return ReactNull;
}
