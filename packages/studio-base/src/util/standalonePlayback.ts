// SPDX-FileCopyrightText: Copyright (C) 2022-2024 Shanghai coScene Information Technology Co., Ltd.<hi@coscene.io>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { fromRFC3339String, Time } from "@foxglove/rostime";

/**
 * Parameters for a fully self-contained ("standalone") playback session that
 * reads a shard manifest and a layout directly from URLs, without going through
 * the data-platform / login flow.
 */
export type StandalonePlaybackParams = {
  /** URL of the shard manifest (manifest.json) to play back. Required. */
  manifestUrl: string;
  /** URL of a Foxglove layout JSON to fetch and apply. Optional. */
  layoutUrl?: string;
  /** Preferred manifest profile id. Optional. */
  profile?: string;
  /** Playback time to seek to on load. Optional. */
  time?: Time;
};

/**
 * Standalone params are carried in the URL *fragment* (`#…`) rather than the
 * query string. The fragment is never sent to the server, so the requested
 * document path stays constant (e.g. `/viz/`) no matter what manifest/layout is
 * being shared. That keeps the static asset cache — the content-hashed bundle
 * and the cached `index.html` — valid across links instead of being busted by a
 * varying query string.
 *
 * Accepts either `#manifestUrl=…&layoutUrl=…` or a leading `?` (`#?manifestUrl=…`).
 *
 * @param hash The location hash, with or without the leading `#`.
 * @returns Parsed params, or undefined when no `manifestUrl` is present.
 */
export function parseStandalonePlaybackParams(hash: string): StandalonePlaybackParams | undefined {
  const raw = hash.replace(/^#/, "").replace(/^\?/, "");
  if (raw.length === 0) {
    return undefined;
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(raw);
  } catch {
    return undefined;
  }

  const manifestUrl = params.get("manifestUrl") ?? undefined;
  if (manifestUrl == undefined || manifestUrl.length === 0) {
    return undefined;
  }

  const layoutUrl = params.get("layoutUrl") ?? undefined;
  const profile = params.get("profile") ?? undefined;
  const timeString = params.get("time") ?? undefined;
  const time = timeString != undefined ? fromRFC3339String(timeString) : undefined;

  return {
    manifestUrl,
    layoutUrl: layoutUrl && layoutUrl.length > 0 ? layoutUrl : undefined,
    profile: profile && profile.length > 0 ? profile : undefined,
    time,
  };
}

/**
 * Parse standalone playback params from the current window location's fragment.
 */
export function windowStandalonePlaybackParams(): StandalonePlaybackParams | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return parseStandalonePlaybackParams(window.location.hash);
}

/**
 * True when the current window location requests standalone playback. Cheap
 * enough to call from hot paths (e.g. the auth interceptor).
 */
export function isStandalonePlayback(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return /[#&?]manifestUrl=/.test(window.location.hash);
}
