#!/bin/bash
# 1. Clean out any old lingering system instance loops cleanly
killall python3
killall chromium
killall firefox

# 2. Launch the Python print router as a silent background daemon
# Redirects process logs directly into a local log file inside your directory
nohup python3 /home/dcp-admin/Desktop/kiosk-system/print_router.py > /home/dcp-admin/Desktop/kiosk-system/print_server.log 2>&1 &

# 3. Provide the print spool server 2 seconds to warm up sockets cleanly
sleep 2

# 4. Explicitly bind the launch execution path to the active desktop screen display socket
export DISPLAY=:0
export XAUTHORITY=/home/dcp-admin/.Xauthority

# 5. Launch Chromium in absolute full-screen kiosk layout and bypass password keyrings
chromium --kiosk \
         --no-first-run \
         --disable-infobars \
         --disable-session-crashed-bubble \
         --incognito \
         --disable-features=Translate \
         --no-sandbox \
         --password-store=basic \
         http://localhost:8080 2>/dev/null
