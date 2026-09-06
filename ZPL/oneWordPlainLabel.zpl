^XA

^FX ==== ONE WORD CATEGORY QUARTER LABEL TEMPLATE ====

^FX ==== Top section - Category name ====
^FO0,50
^CF0,115
^FX ==== NB Standard Printer Font 0 is the only scalable font ====
^FX ==== ^CF0,125 is the highest permissible size for the category line ====
^FB812,1,0,C,0
^FD{{CWRD1}}\&^FS

^FX ==== Bottom section - GRAPHIC IMAGE JPG or PNG ====

^FX ==== Method 1 Stored Memory Placeholder (^XG  Best for Fixed Templates) ====

^FO250,350
^XG[IMAGE_FILENAME],1,1^FS

^FX ==== Method 2 Graphic Field Placeholder (^GF Best for On The Fly Printing) ====

^FO350,450
^GFA,[HEX_BYTE_COUNT],[TOTAL_BYTES],[ROW_BYTES],[HEX_DATA_PLACEHOLDER]^FS


^XZ

