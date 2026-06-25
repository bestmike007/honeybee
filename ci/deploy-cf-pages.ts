// SPDX-FileCopyrightText: Copyright (C) 2022-2024 Shanghai coScene Information Technology Co., Ltd.<hi@coscene.io>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

// Deploys the production web build to Cloudflare Pages as a *temporary*
// (preview) deployment. Intended to be run after `web:build:prod` succeeds
// (see the `web:deploy:cf` package script, which gates this on the build).
//
// The web bundle is built with publicPath `/viz/`, so we stage it under a
// `viz/` subfolder and add a root redirect + an SPA fallback. Standalone
// playback links look like `https://<temp-host>/viz/#manifestUrl=…&layoutUrl=…`;
// because the params live in the URL fragment, every shared link requests the
// exact same `/viz/` document and reuses the cached, content-hashed assets.
//
// Configuration (all optional) via environment:
//   CF_PAGES_PROJECT  Cloudflare Pages project name (default: honeybee-temp)
//   CF_PAGES_BRANCH   Deployment branch; any non-production branch produces a
//                     unique temporary *.pages.dev URL (default: temp)
//
// Authentication is the caller's responsibility: set CLOUDFLARE_API_TOKEN
// (and CLOUDFLARE_ACCOUNT_ID) or run `npx wrangler login` first.

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "..");
const buildDir = path.join(repoRoot, "web", ".webpack");
const stageDir = path.join(repoRoot, "dist", "cf-pages");
const vizDir = path.join(stageDir, "viz");

const projectName = process.env.CF_PAGES_PROJECT ?? "honeybee-temp";
const branch = process.env.CF_PAGES_BRANCH ?? "temp";

function main(): void {
  // Gate on a real build being present.
  if (!fs.existsSync(path.join(buildDir, "index.html"))) {
    throw new Error(
      `web build not found at ${buildDir} (expected index.html). Run \`yarn web:build:prod\` first.`,
    );
  }

  // Stage the bundle under /viz to match the production publicPath.
  fs.rmSync(stageDir, { recursive: true, force: true });
  fs.mkdirSync(vizDir, { recursive: true });
  fs.cpSync(buildDir, vizDir, { recursive: true });

  // Root redirect + SPA fallback so deep links resolve to the app shell.
  // (Cloudflare Pages `_redirects`: first match wins, 200 = rewrite.)
  fs.writeFileSync(
    path.join(stageDir, "_redirects"),
    ["/            /viz/             302", "/viz/*       /viz/index.html   200", ""].join("\n"),
  );

  // Cache-Control for Cloudflare Pages. Content-hashed assets (js/wasm/maps and
  // hashed png/ttf) are immutable and cached for a year. The HTML shell must
  // always revalidate so a new deploy is picked up immediately.
  //
  // Note: Pages *combines* the values of every rule that matches a path (it does
  // not let a later rule override an earlier one), so overlapping rules for the
  // same header must be avoided. `cos-config.js` is the one non-hashed JS, but
  // it is loaded as `cos-config.js?t=<buildTime>` from the (uncached) index.html,
  // so a new build always busts it — letting it fall under the immutable rule is
  // safe. `index.html` is `.html` and matches none of the asset rules.
  const immutable = "Cache-Control: public, max-age=31536000, immutable";
  const revalidate = "Cache-Control: no-cache";
  fs.writeFileSync(
    path.join(stageDir, "_headers"),
    [
      "/viz/*.js",
      `  ${immutable}`,
      "/viz/*.wasm",
      `  ${immutable}`,
      "/viz/*.map",
      `  ${immutable}`,
      "/viz/*.png",
      `  ${immutable}`,
      "/viz/*.ttf",
      `  ${immutable}`,
      "/viz/index.html",
      `  ${revalidate}`,
      "/viz/",
      `  ${revalidate}`,
      "",
    ].join("\n"),
  );

  console.debug(
    `Deploying ${stageDir} to Cloudflare Pages project "${projectName}" (branch "${branch}")`,
  );

  const result = spawnSync(
    "npx",
    [
      "--yes",
      "wrangler@3",
      "pages",
      "deploy",
      stageDir,
      `--project-name=${projectName}`,
      `--branch=${branch}`,
      "--commit-dirty=true",
    ],
    { stdio: "inherit" },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

main();
