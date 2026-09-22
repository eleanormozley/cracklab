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
	var SPEED = 1;

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

	function log2(n) {
		return Math.log(n) / Math.LN2;
	}

	function kindCount(kinds) {
		return (
			(kinds.lower ? 1 : 0) +
			(kinds.upper ? 1 : 0) +
			(kinds.digit ? 1 : 0) +
			(kinds.symbol ? 1 : 0)
		);
	}

	// Naive keyspace entropy — assumes every character is independently random. Kept only as a
	// ceiling; realistic strength comes from strengthBits()/analyseUnknown() below, which
	// discount the ways real passwords are NOT random.
	function entropyBits(input) {
		var cs = charsetForString(input);
		return input.length * log2(cs.size);
	}

	// Short function words are the giveaway that a long string is a *sentence* (predictable),
	// not a set of unrelated words (a strong passphrase). Also used to segment jammed phrases.
	// prettier-ignore
	var FUNCTION_WORDS = [
    "the","and","for","are","but","not","you","all","any","can","had","her","was","one",
    "our","out","day","get","has","him","his","how","man","new","now","old","see","two",
    "way","who","boy","did","its","let","put","say","she","too","use","that","this","with",
    "have","from","they","will","would","there","their","what","about","which","when","make",
    "like","time","just","know","take","into","your","some","them","then","than","look",
    "only","come","over","also","back","after","want","because","going","password","forever",
    "guesser","am","an","as","at","be","by","do","go","he","if","in","is","it","me","my","no",
    "of","on","or","so","to","up","us","we"
  ];

	var WORD_SET = null,
		FUNC_SET = null,
		MAX_WORD = 15;
	function buildWordSets() {
		if (WORD_SET) return;
		WORD_SET = Object.create(null);
		FUNC_SET = Object.create(null);
		var i, w;
		for (i = 0; i < D.BASE_WORDS.length; i++) {
			w = D.BASE_WORDS[i];
			if (w.length >= 2) WORD_SET[w] = 1;
		}
		for (i = 0; i < FUNCTION_WORDS.length; i++) {
			w = FUNCTION_WORDS[i];
			WORD_SET[w] = 1;
			FUNC_SET[w] = 1;
		}
	}

	// Greedy longest-match segmentation of a lowercase string into known words. Reports how much
	// of it is dictionary words, how many words, and whether any is a function word (=> sentence).
	function segment(s) {
		buildWordSets();
		var i = 0,
			n = s.length,
			words = 0,
			covered = 0,
			hasFn = false;
		while (i < n) {
			var matched = 0,
				mw = null;
			var maxL = Math.min(MAX_WORD, n - i);
			for (var L = maxL; L >= 1; L--) {
				if (L === 1) {
					if (s[i] === "a" || s[i] === "i") {
						matched = 1;
						mw = s[i];
					}
					continue;
				}
				var sub = s.substr(i, L);
				if (WORD_SET[sub]) {
					matched = L;
					mw = sub;
					break;
				}
			}
			if (matched) {
				words++;
				covered += matched;
				if (FUNC_SET[mw]) hasFn = true;
				i += matched;
			} else {
				i++;
			}
		}
		return {
			words: words,
			coverage: n ? covered / n : 0,
			hasFunctionWord: hasFn,
		};
	}

	var PHRASE_WORD_BITS = 4.5; // a word inside a human sentence is very predictable

	// Realistic strength for a password with no single dictionary base word: discount sequences
	// (abc, 12345, qwerty runs), repeats, and natural-language sentences, none of which are the
	// "random keyspace" the naive model assumes. Returns { bits, guesses, reason }.
	function analyseUnknown(input, cs) {
		var perChar = log2(cs.size);

		// Effective length: a char that merely continues a run/sequence carries little entropy.
		var units = 0;
		for (var i = 0; i < input.length; i++) {
			if (i === 0) {
				units += 1;
				continue;
			}
			var d = input.charCodeAt(i) - input.charCodeAt(i - 1);
			if (d === 0)
				units += 0.12; // repeated character
			else if (d === 1 || d === -1)
				units += 0.18; // ascending / descending sequence
			else units += 1; // genuinely novel
		}
		var patBits = units * perChar;
		var seqHeavy = input.length >= 6 && units <= input.length * 0.55;

		var seg = segment(input.toLowerCase());
		var isPhrase = seg.words >= 4 && seg.coverage >= 0.8 && seg.hasFunctionWord;

		var bits, reason;
		if (isPhrase) {
			bits = Math.min(patBits, seg.words * PHRASE_WORD_BITS);
			reason = "phrase";
		} else if (seqHeavy) {
			bits = patBits;
			reason = "sequence";
		} else if (input.length < 8 || kindCount(cs.kinds) <= 1) {
			bits = patBits;
			reason = "lowvariety";
		} else {
			bits = patBits;
			reason = "random";
		}

		var guesses = Math.pow(2, bits) / 2;
		if (!isFinite(guesses)) guesses = Number.MAX_VALUE;
		return { bits: bits, guesses: guesses, reason: reason };
	}

	// Guess-count for a "known word + affixes" password. Mirrors the numbers buildPlan derives
	// while it assembles the animation stages — factored out so the live meter agrees exactly.
	function affixGuesses(input, base) {
		var baseRaw = input.substr(base.at, base.word.length);
		var prefix = input.substr(0, base.at);
		var suffix = input.substr(base.at + base.word.length);
		var g = base.listIndex + 1;
		if (
			deleetString(baseRaw.toLowerCase()) === base.word &&
			baseRaw.toLowerCase() !== base.word
		)
			g *= 8; // leet
		if (/[A-Z]/.test(prefix + baseRaw)) g *= 4; // case
		if (suffix.length > 0) {
			var si = D.COMMON_SUFFIXES.indexOf(suffix);
			g *= si !== -1 ? si + 1 : D.COMMON_SUFFIXES.length + suffix.length * 40;
		}
		return g;
	}

	// Single source of truth for "how guessable is this?", shared by the live meter and (for the
	// unknown-word path) buildPlan. Returns bits of realistic entropy.
	function strengthBits(input) {
		if (!input) return 0;
		var lower = input.toLowerCase();
		var ci = D.COMMON_PASSWORDS.indexOf(lower);
		if (ci !== -1) return log2(2 * (ci + 1));
		var base = findBase(input);
		if (base) return log2(2 * affixGuesses(input, base));
		return analyseUnknown(input, charsetForString(input)).bits;
	}

	// O(1) lookup: base word -> its first position in the list (also dedupes). Built once.
	var BASE_INDEX = null;
	function baseIndex() {
		if (BASE_INDEX) return BASE_INDEX;
		BASE_INDEX = {};
		for (var i = 0; i < D.BASE_WORDS.length; i++) {
			var w = D.BASE_WORDS[i];
			if (!Object.prototype.hasOwnProperty.call(BASE_INDEX, w))
				BASE_INDEX[w] = i;
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

	var PRAISE_TIP =
		"Great instinct! Long and unpredictable is what actually works. A few unrelated words plus a symbol is the sweet spot.";

	// The tip must match the *result*, not just the method — a brute-forced password can still be
	// trivially weak (a sequence, a sentence, too short), and praising it would teach the wrong thing.
	function tipFor(crackedBy, reason, tone) {
		switch (crackedBy) {
			case "dictionary":
				return "That's on every common password list on the planet. Hackers try common passwords first.";
			case "leet":
				return "Swapping o→0 or e→3 fools nobody: hacking tools can reverse it automatically.";
			case "pattern":
				return "A word plus a number or a year is the very first pattern hackers try. Length and randomness beat cleverness.";
			case "brute":
				if (reason === "sequence")
					return "Sequences like abcdef, 12345 or qwerty are the very first thing a hacker tries. It looks random, but it isn't.";
				if (reason === "phrase")
					return "A phrase is far more guessable than it looks, hackers use language and phrase lists. Pick unrelated words, add symbols.";
				if (tone === "good") return PRAISE_TIP;
				if (reason === "lowvariety")
					return "Too short or all one type of character, a hacker runs through this fast. Add length, capitals, numbers and symbols.";
				return "Good direction, now add length. Several unrelated words plus a number or symbol tips it over.";
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
		var reason = null; // refines the brute-force tip (sequence / phrase / lowvariety / random)
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
				// No single known word. Estimate realistically — a string can still be highly
				// guessable (a sequence, a repeat, or a natural-language sentence) even though it
				// has no clean base word. analyseUnknown() discounts exactly those.
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
				var analysis = analyseUnknown(input, cs);
				realGuesses = analysis.guesses;
				reason = analysis.reason;
			}
		}

		var bits = strengthBits(input);
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
			tip: tipFor(crackedBy, reason, verdict.tone),
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
		strengthBits: strengthBits,
		verdictLabel: verdictLabel,
		GUESSES_PER_SEC: GUESSES_PER_SEC,
		SYMBOLS: SYMBOLS,
		SPEED: SPEED,
	};
})(window);
