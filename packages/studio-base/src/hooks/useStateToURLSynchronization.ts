// SPDX-FileCopyrightText: Copyright (C) 2022-2024 Shanghai coScene Information Technology Co., Ltd.<hi@coscene.io>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

// import * as _ from "lodash-es";
import { useEffect } from "react";
import { useDebounce } from "use-debounce";

import { Time, toRFC3339String } from "@foxglove/rostime";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import {
  LayoutState,
  useCurrentLayoutSelector,
} from "@foxglove/studio-base/context/CurrentLayoutContext";
import { PlayerCapabilities } from "@foxglove/studio-base/players/types";
import { AppURLState, updateAppURLState } from "@foxglove/studio-base/util/appURLState";
import { isStandalonePlayback } from "@foxglove/studio-base/util/standalonePlayback";

const selectCanSeek = (ctx: MessagePipelineContext) =>
  ctx.playerState.capabilities.includes(PlayerCapabilities.playbackControl);
const selectCurrentTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.currentTime;
const selectLayoutId = (layoutState: LayoutState) => layoutState.selectedLayout?.id;

function updateUrl(newState: AppURLState) {
  const newStateUrl = updateAppURLState(new URL(window.location.href), newState);
  window.history.replaceState(undefined, "", newStateUrl.href);
}

// Standalone playback keeps all of its state in the URL fragment, so the time is
// written there (alongside manifestUrl/layoutUrl/profile) rather than the query
// string. The layout is loaded from layoutUrl, so no layoutId is synced.
function updateStandaloneTime(time: Time | undefined) {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, "").replace(/^\?/, ""));
  if (time) {
    params.set("time", toRFC3339String(time));
  } else {
    params.delete("time");
  }
  const url = new URL(window.location.href);
  url.hash = params.toString();
  window.history.replaceState(undefined, "", url.href);
}

/**
 * Syncs our current player state and time with the URL in the address bar.
 * CoScene do not sync stablePlayerUrlState.parameters
 */
export function useStateToURLSynchronization(): void {
  const canSeek = useMessagePipeline(selectCanSeek);
  const currentTime = useMessagePipeline(selectCurrentTime);
  const [debouncedCurrentTime] = useDebounce(currentTime, 500, { maxWait: 500 });
  const layoutId = useCurrentLayoutSelector(selectLayoutId);
  const standalone = isStandalonePlayback();

  // Sync layoutId with the url. Standalone playback loads its layout from
  // layoutUrl, so we never write a layoutId.
  useEffect(() => {
    if (standalone || layoutId == undefined) {
      return;
    }

    updateUrl({ layoutId });
  }, [layoutId, standalone]);

  // Sync current time with the url.
  useEffect(() => {
    const time = canSeek ? debouncedCurrentTime : undefined;
    if (standalone) {
      updateStandaloneTime(time);
      return;
    }
    updateUrl({ time });
  }, [canSeek, debouncedCurrentTime, standalone]);
}
