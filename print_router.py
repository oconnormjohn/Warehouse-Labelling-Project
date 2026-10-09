"""
Production Label Dashboard - CUPS Print Router & Local Web Server
Designed for Raspberry Pi Linux environments with physical Zebra label printers.
"""

import http.server
import json
import os
import subprocess

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# Mapping of label colors and job types to local CUPS printer queues
PRINTER_POOL = {
    'pink': 'pink_labels',
    'green': 'green_labels',
    'yellow': 'yellow_labels',
    'blue': 'blue_labels',
    'plain': 'plain_labels',
    'dispatch': 'dispatch_labels'
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE_PATH = os.path.join(BASE_DIR, 'config.json')

# Persistent list data stores
LIST_FILES_POOL = {
    'category': os.path.join(BASE_DIR, 'category.json'),
    'toiletries': os.path.join(BASE_DIR, 'toiletries.json'),
    'christmas': os.path.join(BASE_DIR, 'christmas.json'),
    'dispatch': os.path.join(BASE_DIR, 'dispatch.json'),
    'misc': os.path.join(BASE_DIR, 'misc.json')
}

# Standard capacity caps per list type
LIST_CAPACITY_LIMITS = {
    'category': 35,
    'toiletries': 14,
    'christmas': 14,
    'misc': 7,
    'dispatch': 48
}


def convert_image_to_zpl_graphic(image_filename, base_dir=None):
    """
    Opens an image file (PNG/JPG), flattens transparency, rescales to standard label
    dimensions, applies photometric inversion, and returns a Zebra ~DG graphic command.
    """
    if not HAS_PIL:
        return ""

    if base_dir is None:
        base_dir = BASE_DIR
        
    clean_filename = os.path.basename(image_filename)
    search_dirs = [
        os.path.join(base_dir, 'label-graphics'),
        os.path.join(base_dir, 'dingbats'),
        base_dir
    ]
    file_path = None
    for s_dir in search_dirs:
        candidate = os.path.join(s_dir, clean_filename)
        if os.path.exists(candidate):
            file_path = candidate
            break
        candidate_lower = os.path.join(s_dir, clean_filename.lower())
        if os.path.exists(candidate_lower):
            file_path = candidate_lower
            break
        if os.path.exists(s_dir):
            for fname in os.listdir(s_dir):
                if fname.lower() == clean_filename.lower():
                    file_path = os.path.join(s_dir, fname)
                    break
        if file_path:
            break

    if not file_path or not os.path.exists(file_path):
        file_path = os.path.join(base_dir, 'label-graphics', 'blank.png')
        if not os.path.exists(file_path):
            return ""

    try:
        with Image.open(file_path) as img:
            # Flatten transparency for web PNG assets
            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                background = Image.new("RGBA", img.size, (255, 255, 255, 255))
                img = Image.alpha_composite(background, img.convert('RGBA')).convert('RGB')
            else:
                img = img.convert('RGB')

            # Scale icons to 400px width while preserving native dimensions for dispatch and double-size dingbat graphics
            if image_filename.lower() not in ('dispatch-van-90.png', 'durham and sunderland foodbank logo.png', 'fb-logo90.png'):
                if 'dingbat' in image_filename.lower():
                    # Preserve double-sized dingbat graphics (up to 800px printhead width)
                    if img.size[0] > 800:
                        target_width = 800
                        w_percent = target_width / float(img.size[0])
                        target_height = int(float(img.size[1]) * float(w_percent))
                        img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
                else:
                    target_width = 400
                    w_percent = target_width / float(img.size[0])
                    target_height = int(float(img.size[1]) * float(w_percent))
                    img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)

            # High-contrast 1-bit monochrome conversion
            monochrome_img = img.convert("1")
            width_px, height_px = monochrome_img.size
            
            bytes_per_row = (width_px + 7) // 8
            total_bytes = bytes_per_row * height_px

            hex_data = []
            pixel_bytes = monochrome_img.tobytes()
            
            # Photometric bit inversion (0xFF - byte) for Zebra printhead polarity
            for i in range(0, len(pixel_bytes), bytes_per_row):
                row_slice = pixel_bytes[i:i + bytes_per_row]
                inverted_row = bytes([255 - b for b in row_slice])
                hex_data.append("".join(f"{b:02X}" for b in inverted_row))

            return f"~DGE:IMGTEMP.GRF,{total_bytes},{bytes_per_row},{''.join(hex_data)}"
    except Exception as ex:
        print(f"Image to ZPL conversion error: {ex}")
        return ""


class PrintRouterHandler(http.server.BaseHTTPRequestHandler):
    """HTTP request handler for label printing, system configuration, and status monitoring."""

    def _set_cors_headers(self, status=200, content_type='application/json'):
        self.send_response(status)
        self.send_header('Content-type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS, GET')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_cors_headers()

    def send_json(self, data, status=200):
        self._set_cors_headers(status=status, content_type='application/json')
        self.wfile.write(json.dumps(data).encode('utf-8'))

    # =========================================================================
    # GET ENDPOINTS & STATIC ASSET ROUTING
    # =========================================================================
    def do_GET(self):
        # API: Fetch list database contents
        if self.path.startswith('/api/list?name='):
            raw_query = self.path.split('name=')[1]
            list_key = raw_query.split('&')[0].lower() if '&' in raw_query else raw_query.lower()
            target_path = LIST_FILES_POOL.get(list_key)
            
            if not target_path:
                self.send_json({"error": "Invalid list resource requested"}, status=400)
                return

            current_target_cap = LIST_CAPACITY_LIMITS.get(list_key, 35)
            data_payload = []

            if os.path.exists(target_path):
                try:
                    with open(target_path, 'r', encoding='utf-8') as f:
                        data_payload = json.load(f)
                except Exception:
                    data_payload = []
            
            # Ensure output is a padded array matching the capacity cap
            if not isinstance(data_payload, list) or len(data_payload) == 0:
                data_payload = []
                for _ in range(current_target_cap):
                    data_payload.append({
                        "text1": "",
                        "text2": "",
                        "image_file": "" if list_key == 'dispatch' else "blank.jpg"
                    })
                    
            self.send_json(data_payload)
            return

        # API: Query live CUPS printer queues
        if self.path == '/api/printers/status':
            status_report = {
                "pink": False, "green": False, "yellow": False,
                "blue": False, "plain": False, "dispatch": False
            }

            try:
                queue_result = subprocess.run(['lpstat', '-p'], capture_output=True, text=True, check=True)
                queue_output = queue_result.stdout.lower()
                
                for color, queue_name in PRINTER_POOL.items():
                    # Queue is considered online if present and not disabled or paused
                    if queue_name in queue_output:
                        for line in queue_output.split('\n'):
                            if queue_name in line and "disabled" not in line and "paused" not in line:
                                status_report[color] = True
            except Exception as parse_ex:
                print(f"Printer status query failed (CUPS offline): {parse_ex}")

            self.send_json(status_report)
            return

        # API: Verify and recover hardware printer queues
        if self.path == '/api/printers/reset':
            try:
                lpstat_v_result = subprocess.run(['lpstat', '-v'], capture_output=True, text=True, check=True)
                v_output = lpstat_v_result.stdout.lower()

                queues_to_enable = []
                queues_to_disable = []

                for color, queue_name in PRINTER_POOL.items():
                    if queue_name in v_output and "usb" in [line for line in v_output.split('\n') if queue_name in line]:
                        queues_to_enable.append(queue_name)
                    else:
                        queues_to_disable.append(queue_name)

                if queues_to_enable:
                    subprocess.run(f"sudo /usr/sbin/cupsenable {' '.join(queues_to_enable)}", shell=True, capture_output=True)
                if queues_to_disable:
                    subprocess.run(f"sudo /usr/sbin/cupsdisable {' '.join(queues_to_disable)}", shell=True, capture_output=True)

                self.send_json({"status": "success", "message": "Printer status synchronization complete"})
            except Exception as ex:
                self.send_json({"status": "error", "message": str(ex)}, status=500)
            return

        # Static file routing for web interface and graphics
        try:
            raw_path = str(self.path).split('?')[0]
            if raw_path == '/':
                raw_path = '/index.html'

            local_file_path = os.path.join(BASE_DIR, raw_path.lstrip('/'))

            if os.path.exists(local_file_path) and os.path.isfile(local_file_path):
                content_type = "text/plain"
                if local_file_path.endswith('.html'): content_type = "text/html"
                elif local_file_path.endswith('.css'): content_type = "text/css"
                elif local_file_path.endswith('.js'): content_type = "application/javascript"
                elif local_file_path.endswith('.json'): content_type = "application/json"
                elif local_file_path.endswith('.png'): content_type = "image/png"
                elif local_file_path.endswith('.jpg') or local_file_path.endswith('.jpeg'): content_type = "image/jpeg"

                self._set_cors_headers(status=200, content_type=content_type)
                with open(local_file_path, 'rb') as asset_file:
                    self.wfile.write(asset_file.read())
                return
            else:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b"Resource file not found on disk.")
                return
        except Exception as serve_ex:
            print(f"Static file server error: {serve_ex}")
            self.send_response(500)
            self.end_headers()

    # =========================================================================
    # POST ENDPOINTS & PRINT ROUTING
    # =========================================================================
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))

            # Configuration save
            if self.path.rstrip('/') == '/api/config':
                with open(CONFIG_FILE_PATH, 'w', encoding='utf-8') as config_file:
                    json.dump(payload, config_file, indent=2)
                self.send_json({"status": "success", "message": "Config saved successfully"})
                return
            
            # List data save
            if self.path.startswith('/api/list/save?name='):
                raw_query = self.path.split('name=')[1]
                list_key = raw_query.split('&')[0].lower() if '&' in raw_query else raw_query.lower()
                target_path = LIST_FILES_POOL.get(list_key)
                
                if not target_path:
                    self.send_json({"status": "error", "message": "Invalid list destination"}, status=400)
                    return
                    
                with open(target_path, 'w', encoding='utf-8') as config_file:
                    json.dump(payload, config_file, indent=2)
                    
                self.send_json({"status": "success", "message": f"{list_key} list updated on disk"})
                return

            # Print job processing
            color = payload.get('color', '').lower().strip() 
            cwrd1 = payload.get('cwrd1', '').strip()        
            cwrd2 = payload.get('cwrd2', '').strip()        
            q_num = str(payload.get('q', '')).strip()
            year  = str(payload.get('year', '')).strip()

            raw_m1 = payload.get('m1', ' ')
            raw_m2 = payload.get('m2', ' ')
            raw_m3 = payload.get('m3', ' ')

            if isinstance(raw_m1, list):
                m1 = raw_m1[0] if len(raw_m1) > 0 else ' '
                m2 = raw_m1[1] if len(raw_m1) > 1 else ' '
                m3 = raw_m1[2] if len(raw_m1) > 2 else ' '
            else:
                m1 = str(raw_m1).strip()
                m2 = str(raw_m2).strip()
                m3 = str(raw_m3).strip()

            target_cups_printer = PRINTER_POOL.get(color)
            if not target_cups_printer:
                raise ValueError(f"Unknown printer color queue: {color}")

            # 1. EFB Labels Mode (Single label routed to plain_labels printer)
            if payload.get('q') == 'EFB_LABEL':
                target_cups_printer = PRINTER_POOL.get('plain')
                logo_filename = payload.get('m2') or 'fb-logo90.png'
                image_download_command = convert_image_to_zpl_graphic(logo_filename)
                template_filename = payload.get('m1') or 'efb-label.zpl'
                template_path = os.path.join(BASE_DIR, 'ZPL', template_filename)
                if os.path.exists(template_path):
                    with open(template_path, 'r', encoding='utf-8') as f:
                        zpl_content = f.read()
                    final_zpl_payload = f"^XA\n{image_download_command}\n^XZ\n{zpl_content}" if image_download_command else zpl_content
                else:
                    final_zpl_payload = f"^XA^FO50,50^A0N,20,20^FDERROR: MISSING EFB TEMPLATE {template_filename}^XZ"

            # 2. Dispatch Labels Mode
            elif color == 'dispatch':
                if payload.get('q') == 'BLANK_DISPATCH':
                    image_download_command = convert_image_to_zpl_graphic('dispatch-van-90.png')
                    template_path = os.path.join(BASE_DIR, 'ZPL', 'blankDispatchLabel.zpl')
                    if os.path.exists(template_path):
                        with open(template_path, 'r', encoding='utf-8') as f:
                            zpl_content = f.read()
                        final_zpl_payload = f"^XA\n{image_download_command}\n^XZ\n{zpl_content}" if image_download_command else zpl_content
                    else:
                        final_zpl_payload = "^XA^FO50,50^A0N,20,20^FDERROR: MISSING BLANK DISPATCH TEMPLATE^XZ"
                else:
                    image_download_command = convert_image_to_zpl_graphic('dispatch-van-90.png')
                    template_path = os.path.join(BASE_DIR, 'ZPL', 'dispatchLabel.zpl')
                    if os.path.exists(template_path):
                        with open(template_path, 'r', encoding='utf-8') as f:
                            zpl_content = f.read()
                        
                        zpl_content = zpl_content.replace('{{ADDR1}}', cwrd1)
                        zpl_content = zpl_content.replace('{{ADDR2}}', cwrd2)
                        zpl_content = zpl_content.replace('{{PCODE}}', m1)
                        zpl_content = zpl_content.replace('{{TRAYS}}', str(m2))
                        zpl_content = zpl_content.replace('{{DDATE}}', str(m3))
                        zpl_content = zpl_content.replace('{{TRLY}}', str(year))
                        zpl_content = zpl_content.replace('{{TRLYS}}', str(payload.get('total_trolleys', '1')))
                        
                        final_zpl_payload = f"^XA\n{image_download_command}\n^XZ\n{zpl_content}" if image_download_command else zpl_content
                    else:
                        final_zpl_payload = "^XA^FO50,50^A0N,20,20^FDERROR: MISSING DISPATCH TEMPLATE^XZ"

            # 2. Plain Labels Mode
            elif color == 'plain':
                template_path = os.path.join(BASE_DIR, 'ZPL', 'PlainLabel.zpl')
                if q_num in ('DINGBAT_PUZZLE', 'DINGBAT_ANSWER') or 'dingbat' in str(m1).lower():
                    if os.path.exists(os.path.join(BASE_DIR, 'dingbats', 'dingbat-label.zpl')):
                        template_path = os.path.join(BASE_DIR, 'dingbats', 'dingbat-label.zpl')
                    elif os.path.exists(os.path.join(BASE_DIR, 'ZPL', 'dingbat-label.zpl')):
                        template_path = os.path.join(BASE_DIR, 'ZPL', 'dingbat-label.zpl')
                        
                if not os.path.exists(template_path):
                    final_zpl_payload = f"^XA^FO50,50^A0N,40,40^FDERROR: MISSING TEMPLATE {os.path.basename(template_path)}^XZ"
                else:
                    with open(template_path, 'r', encoding='utf-8') as f:
                        zpl_content = f.read()

                    zpl_content = zpl_content.replace('{{CWRD1}}', cwrd1)
                    zpl_content = zpl_content.replace('{{CWRD2}}', cwrd2)

                    image_download_command = convert_image_to_zpl_graphic(m1)
                    final_zpl_payload = f"^XA\n{image_download_command}\n^XZ\n{zpl_content}" if image_download_command else zpl_content
            
            # 3. Standard Rolling Calendar / Months Labels Mode
            else:
                is_month_mode = (str(q_num).upper() == 'MM')
                is_full_year  = (str(q_num).upper() == 'FY' or 'ALL' in [m1, m2, m3])
                is_two_word   = (cwrd2.strip() != '')

                if is_month_mode:
                    template_name = 'twoWordMonthLabel.zpl' if is_two_word else 'oneWordMonthLabel.zpl'
                elif is_full_year:
                    template_name = 'twoWordYearLabel.zpl' if is_two_word else 'oneWordYearLabel.zpl'
                else:
                    template_name = 'twoWordCategoryLabel.zpl' if is_two_word else 'oneWordCategoryLabel.zpl'

                template_path = os.path.join(BASE_DIR, 'ZPL', template_name)
                
                if not os.path.exists(template_path):
                    final_zpl_payload = f"^XA^FO50,50^A0N,30,30^FDERROR: MISSING TEMPLATE {template_name}^XZ"
                else:
                    with open(template_path, 'r', encoding='utf-8') as f:
                        zpl_content = f.read()

                    zpl_content = zpl_content.replace('{{CWRD1}}', cwrd1)
                    zpl_content = zpl_content.replace('{{CWRD2}}', cwrd2)
                    zpl_content = zpl_content.replace('{{Q}}', str(q_num))
                    zpl_content = zpl_content.replace('{{YR}}', str(year))
                    zpl_content = zpl_content.replace('{{M1}}', m1 if m1 != 'x' else ' ')
                    zpl_content = zpl_content.replace('{{M2}}', m2 if m2 != 'x' else ' ')
                    zpl_content = zpl_content.replace('{{M3}}', m3 if m3 != 'x' else ' ')
                    zpl_content = zpl_content.replace('{{MONTH}}', m1)

                    final_zpl_payload = zpl_content

            # Write temporary spool file and send to CUPS
            temp_print_file = os.path.join(BASE_DIR, 'temp_print_job.zpl')
            with open(temp_print_file, 'w', encoding='utf-8') as f:
                f.write(final_zpl_payload)

            # Proactively unpause queue before printing
            try:
                recovery_cmd = f'sudo /usr/sbin/cupsenable {target_cups_printer}'
                subprocess.run(recovery_cmd, shell=True, capture_output=True, text=True)
            except Exception as e:
                print(f"Warning: could not verify queue state: {e}")

            # Hand off to lp command
            print_command = ['lp', '-d', target_cups_printer, temp_print_file]
            try:
                subprocess.run(print_command, capture_output=True, text=True, check=True)
            except subprocess.CalledProcessError as lp_ex:
                print(f"Critical failure routing to {target_cups_printer}: {lp_ex.stderr}")
                raise lp_ex
            finally:
                if os.path.exists(temp_print_file):
                    os.remove(temp_print_file)

            self.send_json({"status": "success", "message": f"Job routed to {target_cups_printer}"})

        except Exception as e:
            self.send_json({"status": "error", "message": str(e)}, status=500)


def run_server(port=8080):
    """Initializes default configuration file if absent and starts HTTP daemon."""
    if not os.path.exists(CONFIG_FILE_PATH):
        default_config = {
            "version": "1.1.0",
            "isFourthYearReleased": False,
            "showPrintConfirmation": True,
            "securityPin": "1234",
            "shortDatePeriod": 1,
            "isDemoModeActive": False
        }
        try:
            with open(CONFIG_FILE_PATH, 'w', encoding='utf-8') as f:
                json.dump(default_config, f, indent=2)
            print("Initialized default configuration file: config.json")
        except Exception as e:
            print(f"Warning: Could not create default config.json: {e}")

    server_address = ('', port)
    httpd = http.server.HTTPServer(server_address, PrintRouterHandler)
    print(f"Print Router Daemon listening on port {port}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Print Router Daemon.")
        httpd.server_close()


if __name__ == '__main__':
    run_server()