// SPDX-FileCopyrightText: Copyright (C) 2022-2024 Shanghai coScene Information Technology Co., Ltd.<hi@coscene.io>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { parseStandalonePlaybackParams } from "./standalonePlayback";

describe("parseStandalonePlaybackParams", () => {
  it("returns undefined when there is no manifestUrl", () => {
    expect(parseStandalonePlaybackParams("")).toBeUndefined();
    expect(parseStandalonePlaybackParams("#")).toBeUndefined();
    expect(parseStandalonePlaybackParams("#layoutUrl=https://example.com/l.json")).toBeUndefined();
  });

  it("parses manifestUrl from the fragment", () => {
    const result = parseStandalonePlaybackParams("#manifestUrl=https://oss/m.json");
    expect(result).toEqual({
      manifestUrl: "https://oss/m.json",
      layoutUrl: undefined,
      profile: undefined,
      time: undefined,
    });
  });

  it("tolerates a leading '#?'", () => {
    const result = parseStandalonePlaybackParams("#?manifestUrl=https://oss/m.json");
    expect(result?.manifestUrl).toBe("https://oss/m.json");
  });

  it("parses layoutUrl, profile and time", () => {
    const result = parseStandalonePlaybackParams(
      "#manifestUrl=https%3A%2F%2Foss%2Fm.json&layoutUrl=https%3A%2F%2Foss%2Fl.json&profile=raw&time=2024-01-01T00%3A00%3A00.000Z",
    );
    expect(result?.manifestUrl).toBe("https://oss/m.json");
    expect(result?.layoutUrl).toBe("https://oss/l.json");
    expect(result?.profile).toBe("raw");
    expect(result?.time).toEqual({ sec: 1704067200, nsec: 0 });
  });
});
