/*
 * cracker.js — the brain. Pure logic, no DOM.
 *
 * buildPlan(input) analyses a password the way a real attacker's tooling would, and
 * returns a staged "attack plan" the animator can play back. The stages shown are real
 * methodology (dictionary -> rules/masks -> brute force); only the *speed* is dramatised,
 * because cracking a password you can see is genuinely instant.
 *
 * Exposed as window.Cracker (plain script, no modules -> works from file://).
 */
(function (global) {
	"use strict";

	var D = global.CrackData;

	// A plausible offline attacker: a single high-end GPU rig against a fast/unsalted hash.
	// This is the "realistic time" yardstick shown on the verdict card.
	var GUESSES_PER_SEC = 1e10;

	// Playback speed of the dramatised animation (kiosk has no on-screen slider).
	// 1 = the baseline hand-tuned pace. Higher = faster, lower = slower.
	//   0.5  → half speed, lingering (good for explaining to a crowd)
	//   1    → baseline
	//   2    → brisk, snappy for walk-up traffic (default)
	//   4    → very fast, almost instant
	var SPEED = 2;

	var SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?/";

	function deleetChar(c) {
		return D.LEET_MAP.hasOwnProperty(c) ? D.LEET_MAP[c] : c;
	}
	function deleetString(s) {
		var out = "";
		for (var i = 0; i < s.length; i++) out += deleetChar(s[i]);
		return out;
	}

	// Take a window of `list` that ends on `hitIndex`, capped to `max` items, so the
	// sweep animation always finishes on the word that matched.
	function sweepWindow(list, hitIndex, max) {
		if (hitIndex < 0) return list.slice(0, Math.min(max, list.length));
		var start = Math.max(0, hitIndex - (max - 1));
		var slice = list.slice(start, hitIndex + 1);
		return slice;
	}

	function charsetForString(s) {
		var size = 0,
			kinds = { lower: false, upper: false, digit: false, symbol: false };
		for (var i = 0; i < s.length; i++) {
			var c = s[i];
			if (c >= "a" && c <= "z") kinds.lower = true;
			else if (c >= "A" && c <= "Z") kinds.upper = true;
			else if (c >= "0" && c <= "9") kinds.digit = true;
			else kinds.symbol = true;
		}
		if (kinds.lower) size += 26;
		if (kinds.upper) size += 26;
		if (kinds.digit) size += 10;
		if (kinds.symbol) size += 32;
		return { size: size || 1, kinds: kinds };
	}

	function entropyBits(input) {
		var cs = charsetForString(input);
		return input.length * (Math.log(cs.size) / Math.log(2));
	}

	// O(1) lookup: base word -> its first position in the list (also dedupes). Built once.
	var BASE_INDEX = null;
	function baseIndex() {
		if (BASE_INDEX) return BASE_INDEX;
		BASE_INDEX = {};
		for (var i = 0; i < D.BASE_WORDS.length; i++) {
			var w = D.BASE_WORDS[i];
			if (!Object.prototype.hasOwnProperty.call(BASE_INDEX, w)) BASE_INDEX[w] = i;
		}
		return BASE_INDEX;
	}

	function isLetter(c) {
		return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z");
	}

	// Detect a "word + affix" password: the whole ALPHABETIC CORE (after stripping the
	// leading/trailing runs of non-letters, but keeping internal leet chars) must be exactly
	// one known base word. This is the guardrail — a bigger dictionary can never mis-catch a
	// fragment of a passphrase/random string, because the entire core has to be a single word.
	//   "123hunter22" -> core "hunter" (start 3)     -> matches
	//   "P@ssw0rd1"   -> core "P@ssw0rd" (deleet ->  "password") -> matches
	//   "correcthorsebatterystaple" -> core is the whole string, not one word -> no match -> brute
	function findBase(input) {
		var start = 0,
			end = input.length;
		while (start < end && !isLetter(input[start])) start++;
		while (end > start && !isLetter(input[end - 1])) end--;
		var core = input.slice(start, end);
		if (core.length < 3) return null;
		var deleetCore = deleetString(core.toLowerCase());
		var idx = baseIndex();
		if (Object.prototype.hasOwnProperty.call(idx, deleetCore)) {
			return { word: deleetCore, at: start, listIndex: idx[deleetCore] };
		}
		return null;
	}

	function humanNumber(n) {
		if (n < 1000) return String(Math.round(n));
		var units = [
			[1e12, "trillion"],
			[1e9, "billion"],
			[1e6, "million"],
			[1e3, "thousand"],
		];
		for (var i = 0; i < units.length; i++) {
			if (n >= units[i][0]) {
				var v = n / units[i][0];
				return (v >= 100 ? Math.round(v) : v.toFixed(1)) + " " + units[i][1];
			}
		}
		return String(Math.round(n));
	}

	function formatDuration(seconds) {
		if (seconds < 1e-4) return "instantly";
		if (seconds < 1)
			return Math.max(1, Math.round(seconds * 1000)) + " milliseconds";
		if (seconds < 60) return seconds.toFixed(1) + " seconds";
		if (seconds < 3600) return Math.round(seconds / 60) + " minutes";
		if (seconds < 86400) return Math.round(seconds / 3600) + " hours";
		if (seconds < 2.63e6) return Math.round(seconds / 86400) + " days";
		if (seconds < 3.156e7) return Math.round(seconds / 2.63e6) + " months";
		var years = seconds / 3.156e7;
		if (years < 1e15) return humanNumber(years) + " years";
		return "longer than the age of the universe";
	}

	function tipFor(crackedBy) {
		switch (crackedBy) {
			case "dictionary":
				return "That's on every insecure-password list on the planet. Hackers try common passwords first.";
			case "leet":
				return "Swapping o→0 or e→3 fools nobody: hacking tools can reverse it automatically.";
			case "pattern":
				return "A word plus a number or a year is the very first pattern hackers try. Length and randomness beat cleverness.";
			case "brute":
				return "Great instinct! Long and random is what actually works. Three random words is best.";
			default:
				return "Longer + more random = exponentially harder to crack.";
		}
	}

	function verdictLabel(seconds) {
		if (seconds < 1) return { label: "TRIVIAL", tone: "critical" };
		if (seconds < 3600) return { label: "VERY WEAK", tone: "critical" };
		if (seconds < 2.63e6) return { label: "WEAK", tone: "warn" };
		if (seconds < 3.156e9) return { label: "MODERATE", tone: "warn" };
		if (seconds < 3.156e13) return { label: "STRONG", tone: "good" };
		return { label: "VERY STRONG", tone: "good" };
	}

	function buildPlan(rawInput) {
		var input = String(rawInput);
		var stages = [];
		var crackedBy = "brute";
		var realGuesses = 1;

		var lower = input.toLowerCase();
		var commonExact = D.COMMON_PASSWORDS.indexOf(lower);

		if (commonExact !== -1) {
			// The whole thing is a top password. Straight dictionary hit.
			var sweep = sweepWindow(D.COMMON_PASSWORDS, commonExact, 24);
			stages.push({
				type: "dictionary",
				label: "Dictionary attack",
				note: "testing the most common passwords first",
				sweep: sweep.map(function (w) {
					return applyShape(w, input);
				}),
				targetIndex: sweep.length - 1,
				hit: input,
			});
			crackedBy = "dictionary";
			realGuesses = commonExact + 1;
		} else {
			var base = findBase(input);
			if (base) {
				// Reconstruct the exact slice of the *typed* password that the base covers,
				// preserving its real case and any leet characters.
				var baseRaw = input.substr(base.at, base.word.length);
				var prefix = input.substr(0, base.at);
				var suffix = input.substr(base.at + base.word.length);

				// Stage 1: sweep the base-word dictionary until it locks onto the root.
				var bSweep = sweepWindow(D.BASE_WORDS, base.listIndex, 20);
				stages.push({
					type: "base",
					label: "Dictionary attack",
					note: "scanning for a known word inside the password",
					sweep: bSweep,
					targetIndex: bSweep.length - 1,
					hit: base.word,
				});
				crackedBy = "dictionary";
				realGuesses = base.listIndex + 1;

				var leetUsed =
					deleetString(baseRaw.toLowerCase()) === base.word &&
					baseRaw.toLowerCase() !== base.word;
				if (leetUsed) {
					stages.push({
						type: "leet",
						label: "Rule: reverse l33t",
						note: "undoing character substitutions",
						from: baseRaw,
						to: base.word,
					});
					crackedBy = "leet";
					realGuesses *= 8;
				}

				var caseUsed = /[A-Z]/.test(prefix + baseRaw);
				if (caseUsed) {
					stages.push({
						type: "case",
						label: "Rule: case permutations",
						note: "trying capitalisation variants",
						from: (prefix + baseRaw).toLowerCase(),
						to: prefix + baseRaw,
					});
					realGuesses *= 4;
				}

				// Stage: append common suffixes/masks to reach the rest of the password.
				if (suffix.length > 0) {
					var fixed = prefix + baseRaw;
					var suffixIndex = D.COMMON_SUFFIXES.indexOf(suffix);
					var attempts, targetIndex;
					if (suffixIndex !== -1) {
						var chosen = D.COMMON_SUFFIXES.slice(0, suffixIndex + 1);
						attempts = chosen.map(function (sfx) {
							return fixed + sfx;
						});
						targetIndex = attempts.length - 1;
						realGuesses *= suffixIndex + 1;
					} else {
						// Uncommon suffix: show a handful of misses, then the rule engine "derives" it.
						attempts = D.COMMON_SUFFIXES.slice(0, 12).map(function (sfx) {
							return fixed + sfx;
						});
						attempts.push(input);
						targetIndex = attempts.length - 1;
						realGuesses *= D.COMMON_SUFFIXES.length + suffix.length * 40;
					}
					stages.push({
						type: "pattern",
						label: "Pattern attack",
						note: "appending common endings to the base word",
						fixed: fixed,
						attempts: attempts,
						targetIndex: targetIndex,
						hit: input,
					});
					crackedBy = "pattern";
				} else if (!leetUsed && !caseUsed) {
					// Base word IS the whole password (e.g. "dragon") but not in the top-passwords list.
					crackedBy = "dictionary";
				}
			} else {
				// No known word: honest brute force across the full keyspace.
				var cs = charsetForString(input);
				var charset = buildCharset(cs.kinds);
				stages.push({
					type: "brute",
					label: "Brute force",
					note: "old-fashioned cracking",
					charset: charset,
					fixedPrefix: "",
					target: input,
				});
				crackedBy = "brute";
				realGuesses = Math.pow(cs.size, input.length) / 2;
			}
		}

		var bits = entropyBits(input);
		var realSeconds = realGuesses / GUESSES_PER_SEC;
		var verdict = verdictLabel(realSeconds);

		return {
			input: input,
			stages: stages,
			crackedBy: crackedBy,
			entropyBits: bits,
			realGuesses: realGuesses,
			realSeconds: realSeconds,
			realTimeText: formatDuration(realSeconds),
			verdict: verdict.label,
			tone: verdict.tone,
			tip: tipFor(crackedBy),
		};
	}

	// Shape a dictionary word to loosely resemble the typed password's case, so the sweep
	// list looks coherent (purely cosmetic — used for the top-password sweep).
	function applyShape(word, input) {
		return word;
	}

	function buildCharset(kinds) {
		var s = "";
		if (kinds.lower) s += "abcdefghijklmnopqrstuvwxyz";
		if (kinds.upper) s += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		if (kinds.digit) s += "0123456789";
		if (kinds.symbol) s += SYMBOLS;
		return s || "abcdefghijklmnopqrstuvwxyz";
	}

	global.Cracker = {
		buildPlan: buildPlan,
		formatDuration: formatDuration,
		entropyBits: entropyBits,
		GUESSES_PER_SEC: GUESSES_PER_SEC,
		SYMBOLS: SYMBOLS,
		SPEED: SPEED,
	};
})(window);
