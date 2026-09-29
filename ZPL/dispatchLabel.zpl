^XA
^FX ==== Blank Dispatch Label - Landscape ====
^LL1218

^FX ==== Graphic Box ====
^FO450,50^GB325,1150,3^FS

^FX ==== Text fields rotated using 'Caret'A0R  ====
^FX ==== 'Caret'A0R = (Font 0, Rotated 90 deg) ====
^CF0,80

^FX ==== 1st line of Address ====
^FO650,40
^FB1218,1,0,C,0
^A0R,100,100^FD{{ADDR1}}^FS

^FX ==== 2nd line of Address ====
^FO550,40
^FB1200,1,0,C,0
^A0R,100,100^FD{{ADDR2}}^FS

^FX ==== Postcode ====
^FO450,850
^A0R,90,90^FD{{PCODE}}^FS

^FX ==== Second Line: Trolleys ====
^FO300,40
^A0R,80,80^FDTrolley^FS

^FO300,300
^A0R,100,100^FD{{TRLY}}^FS

^FO300,380
^A0R,80,80^FDof^FS

^FO300,475
^A0R,100,100^FD{{TRLYS}}^FS

^FX ==== Third Line: Trays ====
^FO170,40
^A0R,80,80^FDTotal trays^FS

^FO170,425
^A0R,100,100^FD{{TRAYS}}^FS

^FX ==== Bottom Line: Delivery Date ====
^FO40,40
^A0R,80,80^FDDelivery:^FS

^FO40,350
^A0R,80,80^FD{{DDATE}}^FS

^XZ
