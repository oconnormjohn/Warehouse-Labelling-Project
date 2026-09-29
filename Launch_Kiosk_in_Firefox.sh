#!/bin/bash
# 1. Kill any old lingering instances
killall python3
killall firefox

# 2. Start the Python print server daemon silently in the background
python3 ~/shared/warehouse-label-kiosk/print_router.py &

# 3. Give the background server 2 seconds to warm up
sleep 2

# 4. Launch Firefox directly hrough the local server address
firefox --kiosk --clear-cache --private-window http://localhost:8080
