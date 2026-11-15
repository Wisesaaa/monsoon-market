"""Logic test for Monsoon Market: hide the pointer-lock overlay via JS,
then drive keyboard input and check the game state (area, buy, weapon).
Run under:
  TMPDIR=~/workspace/tmp xvfb-run -a -s "-screen 0 1280x800x24" <venv>/bin/python logic_test.py
"""
import sys
sys.path.insert(0, "/home/hatch/workspace/venvs/camoufox/lib/python3.12/site-packages")
from camoufox.sync_api import Camoufox

def main():
    with Camoufox(headless=False) as browser:
        ctx = browser.new_context(ignore_https_errors=True, viewport={"width": 1280, "height": 720})
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.goto("http://localhost:8080/", wait_until="load")
        # live game (no ?shot=): no data-shot-ready attribute — wait for the HUD
        page.wait_for_selector("#hud", timeout=30000)
        page.wait_for_timeout(3000)
        print("area exists:", page.evaluate("!!document.getElementById('area')"))
        print("overlay exists:", page.evaluate("!!document.getElementById('overlay')"))
        # hide the overlay (pointer lock never engages under Xvfb)
        page.evaluate("document.getElementById('overlay').hidden = true")
        # area before moving
        area0 = page.evaluate("document.getElementById('area').textContent")
        # hold W for 2s
        page.keyboard.down("KeyW")
        page.wait_for_timeout(2000)
        page.keyboard.up("KeyW")
        area1 = page.evaluate("document.getElementById('area').textContent")
        print("area before:", area0, "| after W 2s:", area1, "| MOVEMENT:", "PASS" if area0 != area1 else "FAIL")
        # buy armor: open buy menu, click armor
        page.keyboard.press("KeyB")
        page.wait_for_timeout(300)
        money0 = page.evaluate("document.getElementById('money-value').textContent")
        page.evaluate("document.querySelector('[data-id=\"armor\"]').click()")
        page.wait_for_timeout(300)
        money1 = page.evaluate("document.getElementById('money-value').textContent")
        armor = page.evaluate("document.getElementById('armor-value').textContent")
        print("money before buy:", money0, "| after armor:", money1, "| armor:", armor,
              "| BUY:", "PASS" if money0 != money1 and int(armor) > 0 else "FAIL")
        # stamina: hold sprint (W + no Shift) and read the body state via window
        page.keyboard.down("KeyW")
        page.wait_for_timeout(1500)
        page.keyboard.up("KeyW")
        print("page errors:", errors)
        page.close()
        ctx.close()
    print("done")

if __name__ == "__main__":
    main()
