"""Staged screenshot capture for Monsoon Market.
Opens http://localhost:8080/?shot=<name> in Camoufox (headed, under Xvfb),
waits for the data-shot-ready DOM attribute, saves /tmp/shot-<name>.png
and reports page/console errors per shot. Run under:
  TMPDIR=~/workspace/tmp xvfb-run -a -s "-screen 0 1280x800x24" <venv>/bin/python capture_all.py
"""
import sys
sys.path.insert(0, "/home/hatch/workspace/venvs/camoufox/lib/python3.12/site-packages")
from camoufox.sync_api import Camoufox

SHOTS = ["cover", "buy", "mid", "site"]

def main():
    with Camoufox(headless=False) as browser:
        ctx = browser.new_context(ignore_https_errors=True, viewport={"width": 1280, "height": 720})
        for name in SHOTS:
            page = ctx.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.goto(f"http://localhost:8080/?shot={name}", wait_until="load")
            try:
                page.wait_for_selector("html[data-shot-ready='true']", timeout=30000)
            except Exception:
                print(f"{name} TIMEOUT waiting for shot-ready")
            page.screenshot(path=f"/tmp/shot-{name}.png")
            print(f"{name} saved ERRORS: {errors}")
            page.close()
        ctx.close()
    print("done")

if __name__ == "__main__":
    main()
