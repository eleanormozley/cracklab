/*
 * animator.js — plays an attack plan back as a dramatised, "watch it think" animation.
 * All timing is deliberately slowed so a crowd can follow the work; the global SPEED
 * setting in cracker.js scales it. Decoupled from cracker.js so the two tune independently.
 *
 * Animator.run(plan, ui, opts) -> { promise, cancel }
 *   ui:   { candidate, feed, strategy, guesses, rate, stage } DOM elements
 *   opts: { getSpeed(): number, reducedMotion: boolean }
 */
(function (global) {
	"use strict";

	var CANCEL = { cancelled: true };

	function esc(s) {
		return String(s).replace(/[&<>"]/g, function (c) {
			return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
		});
	}

	function commas(n) {
		return Math.floor(n)
			.toString()
			.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}

	function run(plan, ui, opts) {
		opts = opts || {};
		var getSpeed =
			opts.getSpeed ||
			function () {
				return 1;
			};
		var reduced = !!opts.reducedMotion;
		var cancelled = false;
		var timers = [];
		var guesses = 0;

		function wait(ms) {
			return new Promise(function (resolve, reject) {
				var delay = Math.max(0, ms) / getSpeed();
				var t = setTimeout(function () {
					if (cancelled) reject(CANCEL);
					else resolve();
				}, delay);
				timers.push(t);
			});
		}

		function bumpGuesses(by) {
			guesses += by;
			ui.guesses.textContent = commas(guesses);
		}
		function setRate(perSec) {
			ui.rate.textContent = commas(perSec) + " /s";
		}
		function setStrategy(text) {
			ui.strategy.textContent = text;
		}
		function setCandidateHTML(html) {
			ui.candidate.innerHTML = html;
		}
		function feedLine(text, cls) {
			var div = document.createElement("div");
			div.className = "feed-line " + (cls || "");
			div.textContent = text;
			ui.feed.appendChild(div);
			// Keep the feed from growing unbounded.
			while (ui.feed.childNodes.length > 60)
				ui.feed.removeChild(ui.feed.firstChild);
			ui.feed.scrollTop = ui.feed.scrollHeight;
		}
		function clearStage() {
			ui.stage.innerHTML = "";
		}

		// ---- stage players -------------------------------------------------------

		function playSweep(stage) {
			setStrategy(stage.label /* + " — " + stage.note */);
			clearStage();
			var items = stage.sweep;
			var perItem = reduced
				? 24
				: Math.max(28, 520 / Math.max(6, items.length));
			var rate = 40000;
			var chain = Promise.resolve();
			items.forEach(function (word, i) {
				chain = chain.then(function () {
					return wait(perItem).then(function () {
						var isHit = i === stage.targetIndex;
						setCandidateHTML(
							'<span class="cand ' +
								(isHit ? "cand-hit" : "cand-try") +
								'">' +
								esc(word) +
								"</span>",
						);
						bumpGuesses(1 + Math.floor(Math.random() * 3));
						rate = Math.min(2500000, rate * 1.12 + 3000);
						setRate(Math.floor(rate));
						if (isHit) {
							feedLine("✓ MATCH  " + word, "feed-hit");
						} else if (i > items.length - 10 || i % 2 === 0) {
							feedLine("✗ " + word, "feed-miss");
						}
					});
				});
			});
			return chain.then(function () {
				return wait(reduced ? 120 : 420);
			});
		}

		function playTransform(stage) {
			setStrategy(stage.label /* + " — " + stage.note */);
			clearStage();
			var wrap = document.createElement("div");
			wrap.className = "transform";
			wrap.innerHTML =
				'<div class="tf-row"><span class="tf-label">input</span><span class="tf-from">' +
				esc(stage.from) +
				"</span></div>" +
				'<div class="tf-arrow">▼</div>' +
				'<div class="tf-row"><span class="tf-label">resolved</span><span class="tf-to">' +
				esc(stage.to) +
				"</span></div>";
			ui.stage.appendChild(wrap);
			setCandidateHTML(
				'<span class="cand cand-try">' + esc(stage.from) + "</span>",
			);
			return wait(reduced ? 260 : 900).then(function () {
				setCandidateHTML(
					'<span class="cand cand-try">' + esc(stage.to) + "</span>",
				);
				bumpGuesses(6);
				return wait(reduced ? 160 : 520);
			});
		}

		function playPattern(stage) {
			setStrategy(stage.label /* + " — " + stage.note */);
			clearStage();
			var attempts = stage.attempts;
			var perItem = reduced
				? 26
				: Math.max(45, 900 / Math.max(6, attempts.length));
			var rate = 120000;
			var chain = Promise.resolve();
			attempts.forEach(function (attempt, i) {
				chain = chain.then(function () {
					return wait(perItem).then(function () {
						var isHit = i === stage.targetIndex;
						var fixed = stage.fixed;
						var tail = attempt.slice(fixed.length);
						setCandidateHTML(
							'<span class="cand ' +
								(isHit ? "cand-hit" : "cand-try") +
								'">' +
								'<span class="cand-fixed">' +
								esc(fixed) +
								"</span>" +
								'<span class="cand-tail">' +
								esc(tail) +
								"</span></span>",
						);
						bumpGuesses(1 + Math.floor(Math.random() * 5));
						rate = Math.min(9000000, rate * 1.1 + 8000);
						setRate(Math.floor(rate));
						if (isHit) feedLine("✓ CRACKED  " + attempt, "feed-hit");
						else feedLine("✗ " + attempt, "feed-miss");
					});
				});
			});
			return chain.then(function () {
				return wait(reduced ? 120 : 420);
			});
		}

		function playBrute(stage) {
			setStrategy(stage.label /* + " — " + stage.note */);
			clearStage();
			var target = stage.target;
			var charset = stage.charset;
			var MAX_REELS = 14;
			var shown = target.slice(0, MAX_REELS);
			var overflow = target.length - shown.length;

			var board = document.createElement("div");
			board.className = "reels";
			var reelEls = [];
			for (var i = 0; i < shown.length; i++) {
				var reel = document.createElement("span");
				reel.className = "reel";
				reel.textContent = charset[Math.floor(Math.random() * charset.length)];
				board.appendChild(reel);
				reelEls.push(reel);
			}
			if (overflow > 0) {
				var more = document.createElement("span");
				more.className = "reel reel-more";
				more.textContent = "+" + overflow;
				board.appendChild(more);
			}
			ui.stage.appendChild(board);

			var rate = 200000000;
			// Lock reels left-to-right; each spins a few frames then snaps to the real char.
			var chain = Promise.resolve();
			shown.split("").forEach(function (ch, idx) {
				var spins = reduced ? 3 : 7;
				for (var s = 0; s < spins; s++) {
					(function (frame, last) {
						chain = chain.then(function () {
							return wait(reduced ? 18 : 42).then(function () {
								reelEls[idx].textContent = last
									? ch
									: charset[Math.floor(Math.random() * charset.length)];
								if (last) reelEls[idx].classList.add("reel-locked");
								bumpGuesses(
									Math.floor(
										charset.length * (idx + 1) * 137 + Math.random() * 5000,
									),
								);
								rate = Math.min(9000000000, rate * 1.05 + 5000000);
								setRate(Math.floor(rate));
								var locked = reelEls.map(function (r, k) {
									return k <= idx && last ? ch : k < idx ? shown[k] : "•";
								});
								setCandidateHTML(
									'<span class="cand cand-try">' +
										esc(shown.slice(0, last ? idx + 1 : idx)) +
										'<span class="cand-tail">' +
										esc(last ? "" : reelEls[idx].textContent) +
										"</span>" +
										"</span>",
								);
							});
						});
					})(s, s === spins - 1);
				}
			});
			return chain.then(function () {
				setCandidateHTML(
					'<span class="cand cand-hit">' + esc(target) + "</span>",
				);
				feedLine("✓ CRACKED  " + target, "feed-hit");
				return wait(reduced ? 120 : 420);
			});
		}

		function playStage(stage) {
			switch (stage.type) {
				case "dictionary":
				case "base":
					return playSweep(stage);
				case "leet":
				case "case":
					return playTransform(stage);
				case "pattern":
					return playPattern(stage);
				case "brute":
					return playBrute(stage);
				default:
					return Promise.resolve();
			}
		}

		// ---- drive the sequence --------------------------------------------------
		ui.feed.innerHTML = "";
		ui.guesses.textContent = "0";
		setRate(0);

		var seq = plan.stages.reduce(function (chain, stage) {
			return chain.then(function () {
				if (cancelled) return Promise.reject(CANCEL);
				return playStage(stage);
			});
		}, Promise.resolve());

		var promise = seq
			.then(function () {
				return { totalGuesses: guesses };
			})
			.catch(function (e) {
				if (e === CANCEL) return { cancelled: true };
				throw e;
			});

		function cancel() {
			cancelled = true;
			timers.forEach(clearTimeout);
		}

		return { promise: promise, cancel: cancel };
	}

	global.Animator = { run: run };
})(window);
