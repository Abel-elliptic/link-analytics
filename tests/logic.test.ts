import { test } from "node:test";
import assert from "node:assert/strict";
import { hashVisitor, isBot, parseReferrer, parseUA, getGeo } from "../lib/tracking.ts";
import { buildDestination, randomSlug, regionLabel, SLUG_RE } from "../lib/links.ts";

const IPHONE_LINE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/13.0.0";

test("bot detection", () => {
  for (const ua of ["Twitterbot/1.0", "Slackbot-LinkExpanding 1.0", "facebookexternalhit/1.1", "curl/8.0", "Googlebot/2.1", null])
    assert.equal(isBot(ua), true, String(ua));
  assert.equal(isBot(IPHONE_LINE), false, "LINE in-app browser is a real user");
  assert.equal(isBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"), false);
});

test("ua parsing", () => {
  const r = parseUA(IPHONE_LINE);
  assert.equal(r.device_type, "mobile");
  assert.equal(r.os, "iOS");
});

test("utm is appended without overriding existing params", () => {
  const out = new URL(buildDestination({ slug: "abc", destination_url: "https://ex.com/p?utm_source=keep&x=1", utm_source: "flyer", utm_medium: "offline", utm_campaign: null }));
  assert.equal(out.searchParams.get("utm_source"), "keep");
  assert.equal(out.searchParams.get("utm_medium"), "offline");
  assert.equal(out.searchParams.get("utm_content"), "abc");
  assert.equal(out.searchParams.has("utm_campaign"), false);
  assert.equal(out.searchParams.get("x"), "1");
});

test("visitor hash is stable within a day and changes across days", () => {
  process.env.IP_HASH_SECRET = "s";
  const d1 = new Date("2026-11-11T01:00:00Z"), d1b = new Date("2026-11-11T10:00:00Z"), d2 = new Date("2026-11-11T16:00:00Z"); // d2 = 11/12 JST
  assert.equal(hashVisitor("1.2.3.4", "ua", d1), hashVisitor("1.2.3.4", "ua", d1b));
  assert.notEqual(hashVisitor("1.2.3.4", "ua", d1), hashVisitor("1.2.3.4", "ua", d2));
  assert.equal(hashVisitor(null, "ua"), null);
});

test("geo / referrer / misc", () => {
  const h = new Headers({ "x-vercel-ip-country": "JP", "x-vercel-ip-country-region": "13", "x-vercel-ip-city": "Shinjuku%20City" });
  assert.deepEqual(getGeo(h), { country: "JP", region: "13", city: "Shinjuku City" });
  assert.equal(parseReferrer("https://www.instagram.com/x").referrer_host, "www.instagram.com");
  assert.equal(regionLabel("JP-13"), "東京都");
  assert.equal(regionLabel("US-CA"), "US-CA");
  assert.match(randomSlug(), SLUG_RE);
});
