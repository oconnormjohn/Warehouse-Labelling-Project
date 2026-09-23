import http.server
import json
import os
import subprocess
from PIL import Image  # 🚀 Injected hardware dependency: Image pixel conversion engine

# Map the color tracking string straight to your local CUPS queues
PRINTER_POOL = {
    'pink': 'pink_labels',
    'green': 'green_labels',
    'yellow': 'yellow_labels',
    'blue': 'blue_labels',
    'plain': 'plain_labels',
    'dispatch': 'dispatch_labels'  # 🚛 Added dedicated dispatch hardware queue mapping
}

# Direct target pathway on the Pi for persistent state synchronization layout
CONFIG_FILE_PATH = os.path.join(os.path.dirname(__file__), 'config.json')
# Registered data matrix pathways for dynamic configuration lists
LIST_FILES_POOL = {
    'category': os.path.join(os.path.dirname(__file__), 'category.json'),
    'toiletries': os.path.join(os.path.dirname(__file__), 'toiletries.json'),
    'christmas': os.path.join(os.path.dirname(__file__), 'christmas.json'),
    'dispatch': os.path.join(os.path.dirname(__file__), 'dispatch.json'),
    'misc': os.path.join(os.path.dirname(__file__), 'misc.json')
}


# ==========================================================================
# INDUSTRIAL MONOCHROME 1-BIT ZEBRA HEX ENCODER SUBROUTINE
# ==========================================================================
def convert_image_to_zpl_graphic(image_filename, base_dir=None):
    """
    Opens a PNG or JPG file, flattens transparency layouts, automatically rescales 
    web assets up to standard label dimensions, handles photometric inversion,
    and returns a standard Zebra ~DG code download block.
    """
    if base_dir is None:
        base_dir = os.path.dirname(__file__)
        
    file_path = os.path.join(base_dir, 'label-graphics', image_filename.lower())
    
    # Fallback to standard blank file if image is missing
    if not os.path.exists(file_path):
        file_path = os.path.join(base_dir, 'label-graphics', 'blank.png')
        if not os.path.exists(file_path):
            return ""

    try:
        with Image.open(file_path) as img:
            # 1. Flatten transparency chains inside web PNG files elegantly
            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                background = Image.new("RGBA", img.size, (255, 255, 255, 255))
                img = Image.alpha_composite(background, img.convert('RGBA')).convert('RGB')
            else:
                img = img.convert('RGB')

            # 2. 🚀 ERGONOMIC SCALE TRACK: Automatically resize small web icons up to crisp label dimensions
            # Target width of 220px preserves layout clarity beautifully on 812-dot stock
            target_width = 400
            w_percent = (target_width / float(img.size[0]))
            target_height = int((float(img.size[1]) * float(w_percent)))
            img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)

            # 3. Force high-contrast monochrome conversion layer
            monochrome_img = img.convert("1")
            width_px, height_px = monochrome_img.size
            
            bytes_per_row = (width_px + 7) // 8
            total_bytes = bytes_per_row * height_px

            hex_data = []
            pixel_bytes = monochrome_img.tobytes()
            
            # 4. 🚀 PHOTOMETRIC BIT INVERSION: Flip every byte (0xFF - byte) to fix Black-is-White inversion
            for i in range(0, len(pixel_bytes), bytes_per_row):
                row_slice = pixel_bytes[i:i + bytes_per_row]
                inverted_row = bytes([255 - b for b in row_slice])
                hex_data.append("".join(f"{b:02X}" for b in inverted_row))

            return f"~DGE:IMGTEMP.GRF,{total_bytes},{bytes_per_row},{''.join(hex_data)}"
    except Exception as ex:
        print(f"❌ Python pixel graphic processing loop crashed: {ex}")
        return ""

class PrintRouterHandler(http.server.BaseHTTPRequestHandler):
    
    # Unified Web Asset Router (HTML, CSS, JS, and graphics folders)
    def do_GET(self):
        # API Intercept Layer: Check if frontend is reading a multi-field list file
        if self.path.startswith('/api/list?name='):
            # 🔧 RESTORED SAFE INDEX STRING SPLITTING
            list_key = self.path.split('name=')[1].split('&')[0].lower()
            target_path = LIST_FILES_POOL.get(list_key)
            
            if not target_path:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Invalid list file resource requested.")
                return
                
            # Define structural schema capacities matching list length specifications
            max_boundary_caps = { 'category': 35, 'toiletries': 14, 'christmas': 14, 'misc': 7, 'dispatch': 48 }
            current_target_cap = max_boundary_caps.get(list_key, 35)
            
            data_payload = []
            if os.path.exists(target_path):
                try:
                    with open(target_path, 'r') as f:
                        data_payload = json.load(f)
                except Exception:
                    data_payload = []
            
            # If the file on disk is completely fresh or raw text format, pad it out seamlessly with multi-field fallback objects
            if not isinstance(data_payload, list) or len(data_payload) == 0:
                data_payload = []
                for _ in range(current_target_cap):
                    data_payload.append({
                        "text1": "",
                        "text2": "",
                        "image_file": "" if list_key == 'dispatch' else "blank.jpg"
                    })
                    
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(data_payload).encode('utf-8'))
            return

        clean_path = self.path.split('?')[0]
      
        # Default empty root path requests straight to your index file
        if clean_path == '/' or clean_path == '':
            clean_path = '/index.html'
        
        file_path = os.path.join(os.path.dirname(__file__), clean_path.lstrip('/'))
        
        if not os.path.exists(file_path) or os.path.isdir(file_path):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Asset not found inside project workspace.")
            return

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

    # Configure CORS Safety Headers explicitly so Firefox doesn't block requests
    def _set_headers(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS, GET')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers()

    # Process the incoming print job data payload or configuration syncing tasks
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))

            # CHECK ROUTING POINT: Handle configuration tasks safely with flexible path boundary matching
            if self.path.rstrip('/') == '/api/config':
                with open(CONFIG_FILE_PATH, 'w') as config_file:
                    json.dump(payload, config_file, indent=2)
                self._set_headers()
                self.wfile.write(json.dumps({"status": "success", "message": "Config saved successfully"}).encode('utf-8'))
                return
            
            # API Intercept Layer: Handle saving modified arrays back to disk
            if self.path.startswith('/api/list/save?name='):
                # 🔧 FIXED: Restored complete list index slicing parameters securely
                list_key = self.path.split('name=')[1].split('&')[0].lower()
                target_path = LIST_FILES_POOL.get(list_key)
                
                if not target_path:
                    self.send_response(400)
                    self._set_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": "Invalid list destination"}).encode('utf-8'))
                    return
                    
                with open(target_path, 'w') as config_file:
                    json.dump(payload, config_file, indent=2)
                    
                self._set_headers()
                self.wfile.write(json.dumps({"status": "success", "message": f"{list_key} list updated on disk"}).encode('utf-8'))
                return

            # STANDARD PRINT ROUTINE (Cleaned with strip() to prevent silent routing misses)
            color = payload.get('color', '').lower().strip() # 🧼 Strips hidden browser spaces
            cwrd1 = payload.get('cwrd1', '').strip()        # 🧼 Strips hidden text pads
            cwrd2 = payload.get('cwrd2', '').strip()        # 🧼 Strips hidden text pads
            q_num = str(payload.get('q', '')).strip()
            year  = str(payload.get('year', '')).strip()
            m1    = payload.get('m1', ' ').strip()
            m2    = payload.get('m2', ' ').strip()
            m3    = payload.get('m3', ' ').strip()

            target_cups_printer = PRINTER_POOL.get(color)
            if not target_cups_printer:
                raise ValueError(f"Unknown printer color requested: {color}")

            # 📝 INJECTED LOGIC DIVERGENCY FOR PLAIN MODE PRINTING RUNS
            if color == 'plain':
                template_name = 'PlainLabel.zpl'
                template_path = os.path.join(os.path.dirname(__file__), 'ZPL', template_name)
                
                if not os.path.exists(template_path):
                    raise FileNotFoundError(f"Missing Plain Label ZPL template file: {template_name}")

                with open(template_path, 'r') as file:
                    zpl_content = file.read()

                # 🚛 NEW ROUTINE FOR DISPATCH MODE LOGISTICS RUNS
                if color == 'dispatch':
                    if payload.get('q') == 'BLANK_DISPATCH':
                        template_name = 'blankDispatchLabel.zpl'
                        template_path = os.path.join(os.path.dirname(__file__), 'ZPL', template_name)
                        if os.path.exists(template_path):
                            with open(template_path, 'r') as file:
                                final_zpl_payload = file.read()
                        else:
                            final_zpl_payload = "^XA^FO50,50^A0N,50,50^FDERROR: MISSING BLANK DISPATCH TEMPLATE^XZ"
                    else:
                        final_zpl_payload = "^XA^FO50,50^A0N,50,50^FDDISPATCH ENTRY ROUTE PENDING^XZ"

                # 📝 IF COLOR IS PLAIN, FALLBACK SEAMLESSLY TO STANDARD PLAIN MODE TEXT PROCESSING
                elif color == 'plain':
                    zpl_content = zpl_content.replace('{{CWRD1}}', cwrd1)
                    zpl_content = zpl_content.replace('{{CWRD2}}', cwrd2)
                    image_download_command = convert_image_to_zpl_graphic(m1)

                    if image_download_command.strip() != "":
                        final_zpl_payload = f"^XA\n{image_download_command}\n^XZ\n{zpl_content}"
                    else:
                        final_zpl_payload = zpl_content
                
            else:
                # Standard legacy temporal formatting mapping routes for rolling years calendar squares
                is_month_mode = (str(q_num).upper() == 'MM')
                is_full_year  = (str(q_num).upper() == 'FY' or 'ALL' in [m1, m2, m3])
                is_two_word   = (cwrd2.strip() != '')

                if is_month_mode:
                    template_name = 'twoWordMonthLabel.zpl' if is_two_word else 'oneWordMonthLabel.zpl'
                elif is_full_year:
                    template_name = 'twoWordYearLabel.zpl' if is_two_word else 'oneWordYearLabel.zpl'
                else:
                    template_name = 'twoWordCategoryLabel.zpl' if is_two_word else 'oneWordCategoryLabel.zpl'

                template_path = os.path.join(os.path.dirname(__file__), 'ZPL', template_name)
                
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
                zpl_content = zpl_content.replace('{{MONTH}}', m1)

                final_zpl_payload = zpl_content

            # Write out a temporary file to deliver to the physical queue execution pipeline
            temp_print_file = os.path.join(os.path.dirname(__file__), 'temp_print_job.zpl')
            with open(temp_print_file, 'w') as file:
                file.write(final_zpl_payload)

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
    if not os.path.exists(CONFIG_FILE_PATH):
        default_config = {
            "version": "1.1.0",
            "isFourthYearReleased": False,
            "showPrintConfirmation": True,
            "securityPin": "1234"
        }
        try:
            with open(CONFIG_FILE_PATH, 'w') as f:
                json.dump(default_config, f, indent=2)
            print(f"📁 Created default persistent state configuration layer file: config.json")
        except Exception as e:
            print(f"⚠️ Warning: Could not write default layout configurations file: {e}")

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
