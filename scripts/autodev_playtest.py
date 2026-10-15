#!/usr/bin/env python3
"""True wall-clock Playwright game play against the actual built HTML.

This drives keys/mouse for at least 24 real seconds, unlike 600 simulated game
seconds. It does not claim to substitute for human novice usability studies.
"""
import json
import os
import shutil
import time
from pathlib import Path

from playwright.sync_api import sync_playwright
from playwright.sync_api import Error as PlaywrightError

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "dist/play.html"
OUT = ROOT / "qa-output"
OUT.mkdir(exist_ok=True)


def snapshot(page):
    return page.evaluate("""() => ({state: game.state, wave: game.wave,
      time: game.time, hp: game.player.hp, x: game.player.x,
      kills: game.kills, weapon: game.weapon, paused: game.paused,
      enemies: game.enemies.length, dashReady: game.player.dashReady,
      upgrades: game.mutations.length})""")


def main():
    if not HTML.is_file():
        raise AssertionError("Missing dist/play.html: run npm run build first")
    with sync_playwright() as p:
        executable = shutil.which("chromium") or shutil.which("chromium-browser")
        browser = p.chromium.launch(headless=True,
            executable_path=executable or None,
            args=["--no-sandbox", "--disable-dev-shm-usage"])
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        start = time.monotonic()
        mode = "native file:// HTML"
        try:
            page.goto(HTML.as_uri(), wait_until="load", timeout=30000)
        except PlaywrightError as exc:
            if "ERR_BLOCKED_BY_ADMINISTRATOR" not in str(exc):
                raise
            # Some sealed automation containers prohibit all file:// navigation.
            # This still executes the EXACT built offline HTML in a real browser,
            # but we must NOT claim that native file opening was verified.
            mode = "inline dist/play.html via set_content (file:// blocked)"
            page.close()
            page = browser.new_page(viewport={"width": 1280, "height": 900})
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.set_content(HTML.read_text(encoding="utf-8"), wait_until="load")
        page.wait_for_selector("#arena", state="visible")
        page.wait_for_function("typeof game !== 'undefined' && game.state === 'playing'")
        first = snapshot(page)
        assert first["wave"] == 1 and first["enemies"] >= 1, first
        assert time.monotonic() - start < 10, "start-to-combat exceeded 10 seconds"
        pixels = page.evaluate("""() => {
          const c=document.querySelector('#arena');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
          const set=new Set();for(let i=0;i<d.length;i+=400)set.add(`${d[i]},${d[i+1]},${d[i+2]}`);
          return set.size;
        }""")
        assert pixels >= 5, f"canvas appears blank ({pixels} sampled colors)"
        page.screenshot(path=str(OUT / "autodev-start.png"), full_page=True)
        print("QA: game started; begin real keyboard actions", flush=True)

        # Actual keyboard game input (no game.step, forced wave or fake test state).
        page.keyboard.down("d")
        page.wait_for_timeout(700)
        page.keyboard.up("d")
        moved = snapshot(page)
        assert moved["x"] > first["x"] + 10, (first, moved)
        page.keyboard.down("d")
        page.keyboard.down("Shift")
        page.wait_for_timeout(160)
        page.keyboard.up("Shift")
        page.keyboard.up("d")
        dashed = snapshot(page)
        assert dashed["dashReady"] > 0, dashed
        for key, weapon in [("2", "scatter"), ("3", "beam"), ("1", "pulse")]:
            page.keyboard.press(key)
            assert snapshot(page)["weapon"] == weapon, (key, snapshot(page))
        page.keyboard.press("p")
        paused = snapshot(page)
        assert paused["paused"], paused
        page.wait_for_timeout(170)
        assert abs(snapshot(page)["time"] - paused["time"]) < .04, "paused game kept advancing"
        page.keyboard.press("p")
        assert not snapshot(page)["paused"]

        # Tab loss must not kill a novice who checks another window.
        page.evaluate("window.dispatchEvent(new Event('blur'))")
        auto_paused = snapshot(page)
        assert auto_paused["paused"], auto_paused
        page.wait_for_timeout(250)
        assert abs(snapshot(page)["time"] - auto_paused["time"]) < .04, "focus loss did not freeze combat"
        page.keyboard.press("p")
        assert not snapshot(page)["paused"], "P did not resume after automatic pause"

        # Manual aim interaction with actual Canvas UI.
        box = page.locator("#arena").bounding_box()
        assert box, "canvas bounding box unavailable"
        page.mouse.move(box["x"] + box["width"] * .65, box["y"] + box["height"] * .42)
        page.mouse.down()
        page.wait_for_timeout(250)
        page.mouse.up()

        controls = ("w", "d", "s", "a")
        seconds = int(os.environ.get("AUTODEV_PLAY_SECONDS", "24"))
        if seconds < 6 or seconds > 180:
            raise AssertionError("invalid AUTODEV_PLAY_SECONDS")
        deadline = time.monotonic() + seconds
        print(f"QA: entering {seconds}s real-time controlled play", flush=True)
        upgrades = 0
        restarts = 0
        max_wave = first["wave"]
        move_index = 0
        while time.monotonic() < deadline:
            state = snapshot(page)
            max_wave = max(max_wave, state["wave"])
            if state["state"] == "upgrade":
                page.locator("#upgrades .upgrade-option").first.click(timeout=3000)
                upgrades += 1
                continue
            if state["state"] == "dead":
                page.locator("#retry").click(timeout=3000)
                restarts += 1
                continue
            assert state["state"] == "playing", state
            direction = controls[move_index % len(controls)]
            page.keyboard.down(direction)
            if move_index % 5 == 0:
                page.keyboard.down("Shift")
            page.wait_for_timeout(640)
            page.keyboard.up(direction)
            if move_index % 5 == 0:
                page.keyboard.up("Shift")
            move_index += 1
            if move_index % 12 == 0:
                print(f"QA: {move_index} real keyboard actions; max wave {max_wave}; upgrades {upgrades}; restarts {restarts}", flush=True)
        final = snapshot(page)
        page.screenshot(path=str(OUT / "autodev-played.png"), full_page=True)
        assert move_index >= int(seconds / 2), "did not sustain real input for expected wall clock interval"
        assert not errors, f"uncaught browser JavaScript errors: {errors}"
        page.locator("#restart").click(timeout=5000)
        fresh = snapshot(page)
        assert fresh["wave"] == 1 and fresh["state"] == "playing" and fresh["weapon"] == "pulse", fresh
        assert fresh["enemies"] >= 1 and fresh["time"] < 1, fresh
        print(json.dumps({"mode": mode + " real-time Chromium input", "elapsedWallSeconds": round(time.monotonic()-start, 2), "initial": first, "moved": moved, "dash": dashed, "maxWave": max_wave, "upgradeSelections": upgrades, "restartsDuringPlay": restarts, "stepsWithRealKeyboard": move_index, "afterRestart": fresh, "canvasSampledColors": pixels, "browserErrors": errors}, ensure_ascii=False))
        browser.close()


if __name__ == "__main__":
    main()
