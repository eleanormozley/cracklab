/*
 * app.js — wires the UI to the engine + animator, and runs the kiosk shell.
 * Plain script, relative-loaded after wordlist/cracker/animator.
 *
 * Kiosk behaviour (type-to-start, type-to-reset, auto-scroll, hidden cursor/scrollbar,
 * scroll-lock, fullscreen) is the DEFAULT. Add ?dev to the URL to disable all of it.
 */
(function () {
	"use strict";

	var C = window.Cracker;
	var A = window.Animator;

	var $ = function (id) {
		return document.getElementById(id);
	};

	var els = {
		input: $("password-input"),
		crack: $("crack-btn"),
		presets: $("presets"),
		strengthFill: $("strength-fill"),
		strengthText: $("strength-text"),
		candidate: $("candidate"),
		feed: $("feed"),
		strategy: $("strategy"),
		guesses: $("guesses"),
		rate: $("rate"),
		stage: $("stage-visual"),
		verdict: $("verdict"),
		stageWrap: $("stage"),
	};

	var PRESETS = [
		"password",
		"hunter22",
		"Summer2026!",
		"P@ssw0rd1",
		"Tr0ub4dor&3",
		"correcthorsebatterystaple",
	];
	var IDLE_HTML = '<span class="idle-prompt">Start typing a password…</span>';
	var PLACEHOLDER_HTML = '<span class="cand cand-try">••••••••</span>';
	var MAX_LEN = 60; // hard cap — extra characters are silently ignored

	var DEV = new URLSearchParams(location.search).has("dev");
	var KIOSK = !DEV;

	var reducedMotion = false;
	// window.matchMedia &&
	// window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	// Demo lifecycle: "editing" (accepting a password) -> "running" -> "done".
	var STATE = { EDITING: "editing", RUNNING: "running", DONE: "done" };
	var state = STATE.EDITING;
	var currentRun = null;

	// Animation playback speed is a global setting in cracker.js (no on-screen slider).
	function getSpeed() {
		return C.SPEED || 1;
	}

	// ---- live strength meter (inherent strength, independent of the crack path) ----
	function updateStrength() {
		var v = els.input.value;
		if (!v) {
			els.strengthFill.style.width = "0%";
			els.strengthFill.className = "strength-fill";
			els.strengthText.textContent = "";
			if (state === STATE.EDITING) els.candidate.innerHTML = IDLE_HTML;
			return;
		}
		if (state === STATE.EDITING) {
			els.candidate.innerHTML =
				'<span class="cand cand-try">' + escapeHtml(v) + "</span>";
		}
		// Derive the meter's label from the SAME time model the crack verdict uses, so the live
		// hint and the final verdict never disagree.
		var bits = C.strengthBits(v);
		var seconds = Math.pow(2, bits) / 2 / C.GUESSES_PER_SEC;
		var vl = C.verdictLabel(seconds);
		var pct = Math.max(6, Math.min(100, (bits / 90) * 100));
		els.strengthFill.style.width = pct + "%";
		els.strengthFill.className = "strength-fill tone-" + vl.tone;
		els.strengthText.textContent =
			vl.label.toLowerCase() + " · " + Math.round(bits) + " bits of entropy";
	}

	// ---- verdict card ----
	function showVerdict(plan, elapsedSeconds) {
		var stageNames = {
			dictionary: "a dictionary attack",
			pattern: "a pattern attack",
			leet: "letter substitutions",
			brute: "brute force",
		};
		var brokeBy = stageNames[plan.crackedBy] || "brute force";
		els.verdict.className = "verdict show tone-" + plan.tone;
		els.verdict.innerHTML =
			'<div class="verdict-head">' +
			'<span class="verdict-badge">CRACKED</span>' +
			'<span class="verdict-strength">' +
			plan.verdict +
			"</span>" +
			"</div>" +
			'<div class="verdict-pw">' +
			escapeHtml(plan.input) +
			"</div>" +
			'<div class="verdict-grid">' +
			'<div class="vc"><div class="vc-k">on screen (slowed)</div><div class="vc-v">' +
			formatElapsed(elapsedSeconds) +
			"</div></div>" +
			'<div class="vc vc-real"><div class="vc-k">a real cyberattack</div><div class="vc-v">' +
			plan.realTimeText +
			"</div></div>" +
			'<div class="vc"><div class="vc-k">broken by</div><div class="vc-v small">' +
			brokeBy +
			"</div></div>" +
			"</div>" +
			'<div class="verdict-tip"><span class="tip-mark">→</span> ' +
			escapeHtml(plan.tip) +
			"</div>";
	}

	function formatElapsed(s) {
		if (s < 1) return (s * 1000).toFixed(0) + " ms";
		return s.toFixed(1) + " s";
	}

	function escapeHtml(s) {
		return String(s).replace(/[&<>"]/g, function (c) {
			return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
		});
	}

	function setRunning(isRunning) {
		els.crack.disabled = isRunning;
		els.crack.textContent = isRunning ? "CRACKING…" : "CRACK IT";
		els.stageWrap.classList.toggle("is-running", isRunning);
	}

	// ---- custom, cancellable smooth scroll (snappier + more consistent than CSS smooth) ----
	var scrollRAF = null;
	function smoothScrollTo(targetY) {
		if (scrollRAF) cancelAnimationFrame(scrollRAF);
		var maxY = Math.max(0, document.body.scrollHeight - window.innerHeight);
		var to = Math.max(0, Math.min(targetY, maxY));
		if (reducedMotion) {
			window.scrollTo(0, to);
			return;
		}
		var from = window.pageYOffset;
		var dist = to - from;
		if (Math.abs(dist) < 2) return;
		var dur = 350,
			start = null;
		function ease(t) {
			return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
		}
		function step(ts) {
			if (start === null) start = ts;
			var p = Math.min(1, (ts - start) / dur);
			window.scrollTo(0, from + dist * ease(p));
			if (p < 1) scrollRAF = requestAnimationFrame(step);
			else scrollRAF = null;
		}
		scrollRAF = requestAnimationFrame(step);
	}
	function scrollToTop() {
		smoothScrollTo(0);
	}
	function scrollToStage() {
		var r = els.stageWrap.getBoundingClientRect();
		var target =
			r.top + window.pageYOffset - (window.innerHeight - r.height) / 2;
		smoothScrollTo(target);
	}
	function scrollToBottom() {
		smoothScrollTo(document.body.scrollHeight);
	}

	// ---- reset to a fresh, ready-to-type state ----
	function resetToEditing(doScroll) {
		if (currentRun) {
			currentRun.cancel();
			currentRun = null;
		}
		state = STATE.EDITING;
		els.input.value = "";
		els.verdict.className = "verdict";
		els.verdict.innerHTML = "";
		els.feed.innerHTML = "";
		els.guesses.textContent = "0";
		els.rate.textContent = "0 /s";
		els.strategy.textContent = "";
		els.candidate.innerHTML = IDLE_HTML;
		setRunning(false);
		updateStrength();
		els.input.focus();
		if (doScroll !== false) scrollToTop();
	}

	// ---- main action ----
	function startCrack() {
		var pw = els.input.value;
		if (!pw) {
			els.input.focus();
			els.stageWrap.classList.add("shake");
			setTimeout(function () {
				els.stageWrap.classList.remove("shake");
			}, 400);
			return;
		}
		if (currentRun) currentRun.cancel();
		state = STATE.RUNNING;
		els.verdict.className = "verdict";
		els.verdict.innerHTML = "";
		els.candidate.innerHTML =
			'<span class="cand cand-try">' + escapeHtml(pw) + "</span>";
		setRunning(true);
		scrollToStage();

		var plan = C.buildPlan(pw);
		var t0 = performance.now();
		currentRun = A.run(
			plan,
			{
				candidate: els.candidate,
				feed: els.feed,
				strategy: els.strategy,
				guesses: els.guesses,
				rate: els.rate,
				stage: els.stage,
			},
			{ getSpeed: getSpeed, reducedMotion: reducedMotion },
		);

		currentRun.promise
			.then(function (res) {
				if (res && res.cancelled) return;
				var elapsed = (performance.now() - t0) / 1000;
				setRunning(false);
				currentRun = null;
				state = STATE.DONE;
				showVerdict(plan, elapsed);
				scrollToBottom();
			})
			.catch(function () {
				setRunning(false);
			});
	}

	// ---- kiosk: fullscreen (needs a gesture, so first keypress is the real trigger) ----
	var fullscreenTried = false;
	function requestFullscreenSafe() {
		if (!KIOSK || fullscreenTried) return;
		fullscreenTried = true;
		var el = document.documentElement;
		if (!document.fullscreenElement && el.requestFullscreen) {
			var p = el.requestFullscreen();
			if (p && p.catch)
				p.catch(function () {
					fullscreenTried = false;
				});
		}
	}

	// ---- global keyboard capture (the heart of the kiosk behaviour) ----
	var NAV_KEYS = {
		PageUp: 1,
		PageDown: 1,
		Home: 1,
		End: 1,
		ArrowUp: 1,
		ArrowDown: 1,
	};
	function onKeyDown(e) {
		if (e.ctrlKey || e.metaKey || e.altKey) return; // leave devtools / shortcuts alone
		requestFullscreenSafe();
		var k = e.key;

		if (k === "Escape") {
			e.preventDefault();
			resetToEditing();
			return;
		}

		if (k === "Enter") {
			e.preventDefault();
			if (state === STATE.EDITING && els.input.value) startCrack();
			else resetToEditing();
			return;
		}

		if (k === " " || k === "Spacebar") {
			// never insert a space, never page-scroll
			e.preventDefault();
			if (state !== STATE.EDITING) resetToEditing();
			return;
		}

		if (KIOSK && NAV_KEYS[k]) {
			e.preventDefault();
			return;
		} // lock scrolling to the 3 states

		// Printable single character.
		if (k.length === 1) {
			if (state !== STATE.EDITING) {
				resetToEditing(false); // wipe for the next visitor (scroll handled below)
				els.input.value = k;
				updateStrength();
				scrollToTop();
				e.preventDefault();
			} else if (document.activeElement !== els.input) {
				els.input.focus();
				if (els.input.value.length < MAX_LEN) els.input.value += k;
				updateStrength();
				e.preventDefault();
			} else if (els.input.value.length >= MAX_LEN) {
				// editing + focused, but already at the cap -> swallow silently
				e.preventDefault();
			}
			// else: editing + focused, under cap -> let the browser type it (input event updates strength)
		}
	}

	function blockScroll(e) {
		e.preventDefault();
	}

	// ---- presets ----
	PRESETS.forEach(function (p) {
		var chip = document.createElement("button");
		chip.className = "chip";
		chip.type = "button";
		chip.textContent = p;
		chip.addEventListener("click", function () {
			resetToEditing(false);
			els.input.value = p;
			updateStrength();
			startCrack();
		});
		els.presets.appendChild(chip);
	});

	els.crack.addEventListener("click", startCrack);
	els.input.addEventListener("input", function () {
		if (state !== STATE.EDITING) return;
		updateStrength();
	});
	document.addEventListener("keydown", onKeyDown);

	// ---- kiosk shell ----
	if (KIOSK) {
		document.documentElement.classList.add("kiosk");
		document.addEventListener("wheel", blockScroll, { passive: false });
		document.addEventListener("touchmove", blockScroll, { passive: false });
		requestFullscreenSafe(); // best-effort on load; browsers usually defer to first key
	}

	els.candidate.innerHTML = IDLE_HTML;
	updateStrength();
	els.input.focus();
})();
