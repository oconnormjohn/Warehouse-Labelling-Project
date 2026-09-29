#!/bin/bash
# 1. Kill any old lingering instances cleanly
killall python3
killall chromium
killall firefox

# 2. Start the Python print server daemon silently in the background
python3 ~/shared/warehouse-label-kiosk/print_router.py &

# 3. Give the background server 2 seconds to warm up
sleep 2

# 4. Force the script to target the main X11 desktop display socket
export DISPLAY=:0
export XAUTHORITY=/home/pi/.Xauthority

# 5. Launch Chromium directly in strict kiosk mode and completely bypass the secure keyring locks
chromium --kiosk \
         --no-first-run \
         --disable-infobars \
         --disable-session-crashed-bubble \
         --incognito \
         --disable-features=Translate \
         --no-sandbox \
         --password-store=basic \
         http://localhost:8080 > ~/chromium_error.log 2>&1
