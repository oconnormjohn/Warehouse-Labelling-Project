import http.server
import json
import os
import subprocess

# Map the color tracking string from Firefox straight to your local CUPS queues
PRINTER_POOL = {
    'pink': 'pink_labels',
    'green': 'green_labels',
    'yellow': 'yellow_labels',
    'blue': 'blue_labels'
}

class PrintRouterHandler(http.server.BaseHTTPRequestHandler):
    
    # 1. Unified Web Asset Router (HTML, CSS, JS, and graphics folders)
    def do_GET(self):
        # FIXED: Extract the first index string element explicitly out of the path array split
        clean_path = self.path.split('?')[0]
        
        # Default empty root path requests straight to your index file
        if clean_path == '/' or clean_path == '':
            clean_path = '/index.html'
        
        # Calculate the absolute physical file path on your Pi
        file_path = os.path.join(os.path.dirname(__file__), clean_path.lstrip('/'))
        
        # Safety check: if file doesn't exist on disk, return a clean 404
        if not os.path.exists(file_path) or os.path.isdir(file_path):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Asset not found inside project workspace.")
            return

        # Determine precise content headers to prevent browser parsing errors
        mimetype = 'application/octet-stream'
        lower_path = file_path.lower()
        
        if lower_path.endswith(".html"): mimetype = 'text/html'
        elif lower_path.endswith(".css"): mimetype = 'text/css'
        elif lower_path.endswith(".js"):  mimetype = 'application/javascript'
        elif lower_path.endswith(".jpg") or lower_path.endswith(".jpeg"): mimetype = 'image/jpeg'
        elif lower_path.endswith(".png"): mimetype = 'image/png'
        elif lower_path.endswith(".svg"): mimetype = 'image/svg+xml'

        try:
            with open(file_path, 'rb') as file:
                self.send_response(200)
                self.send_header('Content-type', mimetype)
                self.send_header('Content-Length', str(os.path.getsize(file_path)))
                self.end_headers()
                self.wfile.write(file.read())
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Internal server file error: {str(e)}".encode('utf-8'))

    # 2. Configure CORS Safety Headers explicitly so Firefox doesn't block print requests
    def _set_headers(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS, GET')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers()

    # 3. Process the incoming print job data payload
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            job = json.loads(post_data.decode('utf-8'))

            # Extract variable payload data fields
            color = job.get('color', '').lower()
            cwrd1 = job.get('cwrd1', '')
            cwrd2 = job.get('cwrd2', '')
            q_num = job.get('q', '')
            year  = job.get('year', '')
            m1    = job.get('m1', ' ')
            m2    = job.get('m2', ' ')
            m3    = job.get('m3', ' ')

            target_cups_printer = PRINTER_POOL.get(color)
            if not target_cups_printer:
                raise ValueError(f"Unknown printer color requested: {color}")

            # Select the correct master ZPL template layout configuration
            is_full_year = (str(q_num).upper() == 'FY' or 'ALL' in [m1, m2, m3])
            is_two_word  = (cwrd2.strip() != '')

            if is_full_year:
                template_name = 'twoWordYearLabel.zpl' if is_two_word else 'oneWordYearLabel.zpl'
            else:
                template_name = 'twoWordCategoryLabel.zpl' if is_two_word else 'oneWordCategoryLabel.zpl'

            template_path = os.path.join(os.path.dirname(__file__), template_name)
            
            if not os.path.exists(template_path):
                raise FileNotFoundError(f"Missing master ZPL template file: {template_name}")

            with open(template_path, 'r') as file:
                zpl_content = file.read()

            # Execute string placeholder token substitutions
            zpl_content = zpl_content.replace('{{CWRD1}}', cwrd1)
            zpl_content = zpl_content.replace('{{CWRD2}}', cwrd2)
            zpl_content = zpl_content.replace('{{Q}}', str(q_num))
            zpl_content = zpl_content.replace('{{YR}}', str(year))
            zpl_content = zpl_content.replace('{{M1}}', m1 if m1 != 'x' else ' ')
            zpl_content = zpl_content.replace('{{M2}}', m2 if m2 != 'x' else ' ')
            zpl_content = zpl_content.replace('{{M3}}', m3 if m3 != 'x' else ' ')

            # Write out a temporary file to deliver to the physical queue execution pipeline
            temp_print_file = os.path.join(os.path.dirname(__file__), 'temp_print_job.zpl')
            with open(temp_print_file, 'w') as file:
                file.write(zpl_content)

            # Fire terminal command directly into the Linux CUPS system layer
            print_command = ['lp', '-d', target_cups_printer, temp_print_file]
            subprocess.run(print_command, capture_output=True, text=True, check=True)

            if os.path.exists(temp_print_file):
                os.remove(temp_print_file)

            # Return success confirmation payload back to Firefox interface
            self._set_headers()
            response = {"status": "success", "message": f"Job routed to {target_cups_printer}"}
            self.wfile.write(json.dumps(response).encode('utf-8'))

        except Exception as e:
            self._set_headers()
            self.send_response(500)
            error_response = {"status": "error", "message": str(e)}
            self.wfile.write(json.dumps(error_response).encode('utf-8'))

def run_server(port=8080):
    server_address = ('', port)
    httpd = http.server.HTTPServer(server_address, PrintRouterHandler)
    print(f"🚀 Print Router Server active on Pi port {port}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down print service daemon gracefully.")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
