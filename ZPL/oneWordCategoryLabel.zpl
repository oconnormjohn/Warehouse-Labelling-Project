^XA

^FX ==== ONE WORD CATEGORY QUARTER LABEL TEMPLATE ====

^FX ==== Top section - Category name ====
^FO0,50
^CF0,125
^FX ==== NB Standard Printer Font 0 is the only scalable font ====
^FX ==== ^CF0,125 is the highest permissible size for the category line ====
^FB812,1,0,C,0
^FD{{CWRD1}}\&^FS

^FX ==== Middle section - Quarter and Year ====
^CF0,135
^FO250,230
^FDQtr^FS
^CF0,140
^FO450,225
^FD{{Q}}^FS
^FO600,258
^CF0,100
^FD{{YR}}^FS

^FX ==== Bottom section - Month(s) ====
^CF0,110
^FO60,445^FD{{M1}}^FS
^FO310,445^FD{{M2}}^FS
^FO580,445^FD{{M3}}^FS

^FX ==== Graphic Boxes around Months ====
^FO35,400^GB750,180,3^FS
^FO285,400^GB3,180,3^FS
^FO535,400^GB3,180,3^FS

^XZ