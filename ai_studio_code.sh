sudo mkdir -p /etc/chromium/policies/managed /etc/chromium-browser/policies/managed
echo '{"DeveloperToolsAvailability": 1}' | sudo tee /etc/chromium/policies/managed/enable_devtools.json
echo '{"DeveloperToolsAvailability": 1}' | sudo tee /etc/chromium-browser/policies/managed/enable_devtools.json