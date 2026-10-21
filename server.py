import os
import sys
import webbrowser
import threading
import time
import uvicorn

# Ensure utf-8 console output if supported
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def open_browser():
    time.sleep(1.2)
    url = "http://127.0.0.1:8000"
    print(f"\n[INFO] Opening application in your browser: {url}")
    webbrowser.open(url)

if __name__ == "__main__":
    print("=" * 60)
    print("  Yahoo! Auction to Flea Market Reseller Assistant")
    print("=" * 60)
    print("Server running locally at: http://127.0.0.1:8000")
    print("Press Ctrl+C to stop the server.\n")

    # Start browser opener in background thread
    threading.Thread(target=open_browser, daemon=True).start()

    # Run uvicorn server
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=False, log_level="info")
