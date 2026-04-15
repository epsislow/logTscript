window.lib_files = {
  ex_lcd_nx_pv4: `
  
  
  
  comp [lcd] .ttt:
    row: 8
    cols: 21
    pixelSize: 7
    pixelGap: 1
    glow
    round: 0
    color: ^f70
    bg: ^310
    rgb
    nl
    on:1
    :
    
comp [key] .prv:
    label:'<'
    size: 35
    on:1
    :
    
    
comp [key] .nxt:
    label:'>'
    size: 35
    on:1
    :

104wire dmem = 1;8 + 1;8 + \\5;8 + 1;8   + \\9;8 + 1;8 + \\13;8 + 1;8    + \\17;8 + 1;8 + \\3;8 + 111111010;16




comp [counter] .pos:
    depth: 3
    on:1
    :
    
.pos:{
   dir=1
   set=.nxt
}

.pos:{
   dir=0
   set=.prv
}


3wire pos = .pos:get

.pos:{
   data=000
   write= 1
   set=EQ(pos,101)
}

.pos:{
   data=100
   write= 1
   set=EQ(pos,111)
}

1wire clr = OR(.nxt,.prv)

.ttt:{
  clear = 1
  set=  OR(.nxt,.prv)
}

pcb +[mgr]:
    5pin pos
    1pin set
    8pout x
    8pout y
    16pout dat
    exec:set
    on:1
    
    
104wire dmem = 1;8 + 1;8 + \\5;8 + 1;8   + \\9;8 + 1;8 + \\13;8 + 1;8    + \\17;8 + 1;8 + \\3;8 + 111111010;16

comp [mem] .mem:
    depth: 8
    length: 16
    on:1
    = dmem
    :
    
    .mem:{
       adr = pos
       get >= x
    }
    
    #show(.mem:get)
    
    :8bit get

doc(pcb.mgr)



.ttt:{
   x=dmem.0/8
   y=dmem.8/8
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos,000)
}


.ttt:{
   x=dmem.16/8
   y=dmem.24/8
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos, 001)
}


.ttt:{
   x=\\9
   y=1
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos, 010)
}


.ttt:{
   x=\\13
   y=1
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos, 011)
}


.ttt:{
   x=\\17
   y=1
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos, 100)
}


  
  
  
  
  `,
  ex_lcd_nx_pv3: `
  
  
  comp [lcd] .ttt:
    row: 8
    cols: 21
    pixelSize: 7
    pixelGap: 1
    glow
    round: 0
    color: ^f70
    bg: ^310
    rgb
    nl
    on:1
    :
    
comp [key] .prv:
    label:'<'
    size: 35
    on:1
    :
    
    
comp [key] .nxt:
    label:'>'
    size: 35
    on:1
    :

104wire dmem = 1;8 + 1;8 + \\5;8 + 1;8   + \\9;8 + 1;8 + \\13;8 + 1;8    + \\17;8 + 1;8 + \\3;8 + 111111010;16

comp [mem] .mem:
    depth: 8
    length: 16
    on:1
    = dmem
    :



comp [counter] .pos:
    depth: 3
    on:1
    :
    
.pos:{
   dir=1
   set=.nxt
}

.pos:{
   dir=0
   set=.prv
}


3wire pos = .pos:get

.pos:{
   data=000
   write= 1
   set=EQ(pos,101)
}

.pos:{
   data=100
   write= 1
   set=EQ(pos,111)
}

1wire clr = OR(.nxt,.prv)

.ttt:{
  clear = 1
  set=  OR(.nxt,.prv)
}

doc(comp.lcd)

.ttt:{
   x=dmem.0/8
   y=dmem.8/8
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos,000)
}


.ttt:{
   x=dmem.16/8
   y=dmem.24/8
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos, 001)
}


.ttt:{
   x=\\9
   y=1
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos, 010)
}


.ttt:{
   x=\\13
   y=1
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos, 011)
}


.ttt:{
   x=\\17
   y=1
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos, 100)
}




  
  
  
  `,
  
  ex_lcd_nx_pv2: `
  comp [lcd] .ttt:
    row: 8
    cols: 21
    pixelSize: 7
    pixelGap: 1
    glow
    round: 0
    color: ^f70
    bg: ^310
    rgb
    nl
    on:1
    :
    
comp [key] .prv:
    label:'<'
    size: 35
    on:1
    :
    
    
comp [key] .nxt:
    label:'>'
    size: 35
    on:1
    :

comp [counter] .pos:
    depth: 3
    on:1
    :
    
.pos:{
   dir=1
   set=.nxt
}

.pos:{
   dir=0
   set=.prv
}


3wire pos = .pos:get

.pos:{
   data=000
   write= 1
   set=EQ(pos,101)
}

.pos:{
   data=100
   write= 1
   set=EQ(pos,111)
}

1wire clr = OR(.nxt,.prv)

.ttt:{
  x=0
  y=0
  data= 0 < \\167 w0
  rowlen= \\21
  rgb= ^fff
  set= clr
}

doc(comp.lcd)

.ttt:{
   x=1
   y=1
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos,000)
}


.ttt:{
   x=\\5
   y=1
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos, 001)
}


.ttt:{
   x=\\9
   y=1
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos, 010)
}


.ttt:{
   x=\\13
   y=1
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos, 011)
}


.ttt:{
   x=\\17
   y=1
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos, 100)
}




  
  `,
  
  ex_lcd_nx_pv: `
  
comp [lcd] .ttt:
    row: 8
    cols: 21
    pixelSize: 7
    pixelGap: 1
    glow
    round: 0
    color: ^f70
    bg: ^310
    rgb
    nl
    on:1
    :
    
comp [key] .prv:
    label:'<'
    size: 35
    on:1
    :
    
    
comp [key] .nxt:
    label:'>'
    size: 35
    on:1
    :

comp [counter] .pos:
    depth: 3
    on:1
    :
    
.pos:{
   dir=1
   set=.nxt
}

.pos:{
   dir=0
   set=.prv
}


3wire pos = .pos:get

.pos:{
   data=000
   write= 1
   set=EQ(pos,101)
}

.pos:{
   data=100
   write= 1
   set=EQ(pos,111)
}

#>
.ttt:{
  x=0
  y=0
  data= 1 < \\167 w1
  rowlen= \\21
  rgb= ^fff
  set= OR(.nxt, .prv)
}
#<

doc(comp.lcd)

.ttt:{
   x=1
   y=1
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos,000)
}


.ttt:{
   x=\\5
   y=1
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos, 001)
}


.ttt:{
   x=\\9
   y=1
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos, 010)
}


.ttt:{
   x=\\13
   y=1
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos, 011)
}


.ttt:{
   x=\\17
   y=1
   rowlen=11
   data = 111111010
   rgb = ^f70
   set=EQ(pos, 100)
}


 



  
  
  `,
    ex_pcb_regs3: `



pcb +[regs]:
   1pin set
   1pin adr
   4pin data
   4pout reg1
   4pout reg2
   exec: set
   on:1
   
   comp [reg] .s:
   depth: 4
   on:1
   :
   
   comp [reg] .t:
   depth: 4
   on:1
   :
   
   .s:{
     data=data
     set = EQ(adr,0)
   }
   
   .t:{
     data=data
     write = 1
     set = EQ(adr,1)
   }
   
   reg1 = .s:get
   reg2 = .t:get
   8wire ret = reg1 + reg2
   :8bit ret

pcb [regs] .q::

8wire q = .q

comp [key] .aa:
    label:'A'
    size: 35
    on:1
    :

1wire aa=.aa

comp [key] .bb:
    label:'B'
    size: 35
    on:1
    :

1wire bb=.bb

comp [key] .cc:
    label:'.'
    size: 35
    on:1
    :

1wire cc=.cc

.q:{
  adr = 0
  data = ^F
  set = aa
}
.q:{
  adr = 1
  data = ^F
  set = bb
}


.q:{
  adr = 0
  data = 1000
  set = cc
}
.q:{
  adr = 1
  data = 0001
  set = cc
}


comp [led] .rr:
    length: 8
    square
    on:1
     :

.rr = .q:reg1 + .q:reg2
     
doc(comp.led)

	`,
    ex_pcb_regs2: `
    
    
    

pcb +[regs]:
   1pin set
   1pin adr
   4pin data
   4pout reg1
   4pout reg2
   exec: set
   on:1
   
   comp [reg] .s:
   depth: 4
   on:1
   :
   
   comp [reg] .t:
   depth: 4
   on:1
   :
   
   .s:{
     data=data
     set = EQ(adr,0)
   }
   
   .t:{
     data=data
     write = 1
     set = EQ(adr,1)
   }
   
   reg1 = .s:get
   reg2 = .t:get
   8wire ret = reg1 + reg2
   :8bit ret

pcb [regs] .q::

8wire q = .q

comp [key] .aa:
    label:'A'
    size: 35
    on:1
    :  
    
comp [key] .bb:
    label:'B'
    size: 35
    on:1
    :

1wire aa=.aa
1wire bb=.bb

.q:{
  adr = 0
  data = ^F
  set = aa
}

.q:{
   adr = 1
   data = ^F
   set = bb
}

doc(comp.led)



    `,
    ex_pcb_regs: `
    

pcb +[regs]:
   1pin set
   1pin adr
   4pin data
   4pout reg1
   4pout reg2
   exec: set
   on:1
   
   comp [reg] .s:
   depth: 4
   on:1
   :
   
   comp [reg] .t:
   depth: 4
   on:1
   :
   
   .s:{
     data=data
     set = EQ(adr,0)
   }
   
   .t:{
     data=data
     write = 1
     set = EQ(adr,1)
   }
   
   reg1 = .s:get
   reg2 = .t:get
   8wire ret = reg1 + reg2
   :8bit ret

pcb [regs] .q::

8wire q = .q

comp [key] .aa:
    label:'A'
    size: 35
    on:1
    :

1wire aa=.aa

.q:{
  adr = 1
  data = ^F
  set = 1
}

doc(pcb.regs)


`,

  ex_demux: `
  
  def fr(1bit a, 1bit b):
   :1bit OR(a,b)
   :2bit a + a

comp [dip] .a:
    size:3
    noLabels
    visual:1
    on:1
     :

#doc(DEMUX2)
2wire q = 1 + 0
1wire _, 2wire c = fr(.a.0,.a.1)
8wire b2 = DEMUX2(.a.2/2, c)

  
  `,
  
  ex_osc6: `
  
  


  
comp [switch] .dire:
   text: 'dir'
   nl:1
   :
 
1wire dire = .dire:get
    
comp [~] .osc1:
    duration1: 4
    duration0: 4
    length: 6
    freq: 10
    freqIsSec: 0
    eachCycle: 1
    :

comp [counter] .sec:
   depth: 6
   on:1
   :
    
comp [counter] .min:
   depth: 6
   on:1
   :
   
comp [counter] .hour:
   depth: 6
   on:1
   :
    

1wire o1= .osc1:get
8wire cnt = .osc1:counter

#>
1wire trig60 = MUX1(dire, EQ(cnt, \\0), EQ(cnt, \\60))

.osc1:{
  reset = 1
  set = trig60
}
#<

#.sec:data = MUX1(dire, \\59, \\59)
#.sec:set =1

.sec:{
  data=MUX1(dire,  \\59, \\0)
  write=1
  set= 1
}

.sec:{
  dir=dire
  set= .osc1:get
}
6wire sec = .sec:get
1wire trigSec= MUX1(dire, EQ(sec, \\0), EQ(sec, \\60))
.sec:{
  data= MUX1(dire, \\59, \\0)
  write=1
  set=trigSec
}


.min:{
  dir=dire
  set= trigSec
}
6wire min = .min:get
1wire trigMin = MUX1(dire, EQ(min, \\0), EQ(min, \\60))

.min:{
  data=MUX1(dire,  \\59, \\0)
  write=1
  set= trigMin
}


6wire hour = .hour:get
1wire trigHour = MUX1(dire, EQ(hour, \\0), EQ(hour, \\23))
.hour:{
  data= MUX1(dire, \\24, \\0)
  write=1
  set= trigHour
}
#>
.hour:{
  data= \\23
  write=1
  set= trigHour
}
#<
.hour:{
  dir=dire
  set= trigMin
}


comp [7seg] .sev4:
   color: ^0f9
   : 
comp [7seg] .sev5:
   color: ^0f9
   : 
comp [7seg] .sev2:
   color: ^09f
   : 
   
comp [7seg] .sev3:
   color: ^09f
   :
 
comp [7seg] .sev0:
   color: ^99f
   : 
comp [7seg] .sev1:
   color: ^99f
   :

comp [divider] .div:
   depth: 6
   :
   
   
comp [divider] .div2:
   depth: 6
   :
   
comp [divider] .div3:
   depth: 6
   :

.div:a = .sec:get
.div:b = \\10

6wire div0 = .div:get
6wire div1 = .div:mod

.div2:a = .min:get
.div2:b = \\10
6wire div2g = .div2:get
6wire div2m = .div2:mod

.div3:a = .hour:get
.div3:b = \\10
6wire div3g = .div3:get
6wire div3m = .div3:mod


.sev0:hex= div0.2/4
.sev0:set = .osc1:get
 
.sev1:hex= div1.2/4
.sev1:set = .osc1:get

.sev3:hex = div2m.2/4
.sev3:set = .osc1:get

.sev2:hex= div2g.2/4
.sev2:set= .osc1:get
    
    
.sev5:hex = div3m.2/4
.sev5:set = .osc1:get

.sev4:hex= div3g.2/4
.sev4:set= .osc1:get
1wire qq = EQ(div0, 000000)

.sev1:h=1
.sev3:h=1
.sev5:h=1


#>
.sev1:{
  a=0
   b=0
   c=0
   d=0
   set = EQ(div0, 000000)
}

#<


  
  
  `,
  
  
  ex_osc5: `
  
  
  
  
    
comp [~] .osc1:
    duration1: 4
    duration0: 4
    length: 6
    freq: 12
    freqIsSec: 0
    eachCycle: 1
    :
    
    
comp [counter] .min:
   depth: 6
   :
   
comp [counter] .hour:
   depth: 6
   :
    

1wire o1= .osc1:get
8wire cnt = .osc1:counter

1wire trig60 = EQ(cnt, \\60)

.osc1:{
  reset = 1
  set = trig60
}


.min:{
  dir=1
  set= trig60
}
6wire min = .min:get
1wire trigMin = EQ(min, \\60)
.min:{
  data=0
  write=1
  set= trigMin
}

.hour:{
  dir=1
  set= trigMin
}
6wire hour = .hour:get

comp [7seg] .sev4:
   color: ^0f9
   : 
comp [7seg] .sev5:
   color: ^0f9
   : 
comp [7seg] .sev2:
   color: ^09f
   : 
   
comp [7seg] .sev3:
   color: ^09f
   :
 
comp [7seg] .sev0:
   color: ^99f
   : 
comp [7seg] .sev1:
   color: ^99f
   :

comp [divider] .div:
   depth: 6
   :
   
   
comp [divider] .div2:
   depth: 6
   :
   
comp [divider] .div3:
   depth: 6
   :

.div:a = .osc1:counter
.div:b = \\10

6wire div0 = .div:get
6wire div1 = .div:mod

.div2:a = .min:get
.div2:b = \\10
6wire div2g = .div2:get
6wire div2m = .div2:mod

.div3:a = .hour:get
.div3:b = \\10
6wire div3g = .div3:get
6wire div3m = .div3:mod


.sev0:hex= div0.2/4
.sev0:set = .osc1:get
 
.sev1:hex= div1.2/4
.sev1:set = .osc1:get

.sev3:hex = div2m.2/4
.sev3:set = .osc1:get

.sev2:hex= div2g.2/4
.sev2:set= .osc1:get
    
    
.sev5:hex = div3m.2/4
.sev5:set = .osc1:get

.sev4:hex= div3g.2/4
.sev4:set= .osc1:get
1wire qq = EQ(div0, 000000)

.sev1:h=1
.sev3:h=1
.sev5:h=1


#>
.sev1:{
  a=0
   b=0
   c=0
   d=0
   set = EQ(div0, 000000)
}

#<



  
  `,
  
  
  ex_osc4: `
    
    
    
comp [~] .osc1:
    duration1: 4
    duration0: 4
    length: 6
    freq: 10
    freqIsSec: 0
    eachCycle: 1
    :
    
    
comp [counter] .min:
   depth: 4
   :
   
comp [counter] .hour:
   depth:4
   :
    

1wire o1= .osc1:get
8wire cnt = .osc1:counter

1wire trig60 = EQ(cnt, \\11)

.osc1:{
  reset = 1
  set = trig60
}


.min:{
  dir=1
  set= trig60
}
6wire min = .min:get
1wire trigMin = EQ(min, \\3)
.min:{
  data=0
  write=1
  set= trigMin
}

.hour:{
  dir=1
  set= trigMin
}
4wire hour = .hour:get

comp [7seg] .sev2:
   color: ^99ffFF
   : 
   
comp [7seg] .sev3:
   color: ^99ffFF
   :
 
comp [7seg] .sev0:
   color: ^99ffFF
   : 
   
comp [7seg] .sev1:
   color: ^99ffFF
   :

comp [divider] .div:
   depth: 6
   :

.div:a = .osc1:counter
.div:b = \\10

6wire div0 = .div:get
6wire div1 = .div:mod

.sev0:hex= div0.2/4
.sev0:set = .osc1:get
 
.sev1:hex= div1.2/4
.sev1:set = .osc1:get


.sev3:hex = min
.sev3:set = .osc1:get

.sev2:hex= hour
.sev2:set= .osc1:get
    
  
  
  

`,
  
  ex_osc3 : `
  
  
    
comp [~] .osc1:
    duration1: 4
    duration0: 4
    length: 6
    freq: 10
    freqIsSec: 0
    eachCycle: 1
    :
    
    
comp [counter] .min:
   depth: 4
   :
    

1wire o1= .osc1:get
8wire cnt = .osc1:counter

1wire trig60 = EQ(cnt, \\11)

.osc1:{
  reset = 1
  set = trig60
}


.min:{
  dir=1
  set= trig60
}
6wire min = .min:get


comp [7seg] .sev2:
   color: ^99ffFF
   : 
   
comp [7seg] .sev3:
   color: ^99ffFF
   :
 
comp [7seg] .sev0:
   color: ^99ffFF
   : 
   
comp [7seg] .sev1:
   color: ^99ffFF
   :

comp [divider] .div:
   depth: 6
   :

.div:a = .osc1:counter
.div:b = \\10

6wire div0 = .div:get
6wire div1 = .div:mod

.sev0:hex= div0.2/4
.sev0:set = .osc1:get
 
.sev1:hex= div1.2/4
.sev1:set = .osc1:get


.sev3:hex = min
.sev3:set = .osc1:get
    
    
  
  
  `,
    ex_osc2: `
    
    
    
    4wire d = 1111

7wire a = \`000000 -| \\5\`
8wire a4 = \\2 < \\3 w1
8wire a5= a4.7 < \\3 w0

comp [~] .osc1:
    duration1: 4
    duration0: 4
    length: 6
    freq: 2
    freqIsSec: 0
    eachCycle: 1
    :

1wire o1= .osc1:get
8wire cnt = .osc1:counter

.osc1:{
  reset = 1
  set = EQ(cnt, \\11)
}

comp [7seg] .sev0:
   color: ^99ffFF
   : 
   
comp [7seg] .sev1:
   color: ^99ffFF
   :

comp [divider] .div:
   depth: 6
   :

.div:a = .osc1:counter
.div:b = \\10

6wire div0 = .div:get
6wire div1 = .div:mod

.sev0:hex= div0.2/4
.sev0:set = .osc1:get
 
.sev1:hex= div1.2/4
.sev1:set = .osc1:get


    
    `,
    ex_osc1: `
    comp [osc] .osc1:
  duration1: 1
  duration0: 3
  length: 4
  freq: 2
  freqIsSec: 1
  eachCycle: 0
  :
  
1wire osc1 = .osc1:get
4wire osc1cnt = .osc1:counter

    `,
  def_ands: `
  def A2(3bit a):
   :1bit XOR(a.0, a.1)
   :1bit XOR(a.1, a.2)

def AND3(3bit a):
   :1bit AND(a.0, AND(a.1, a.2))

def AND4(4bit a):
   :1bit AND(a.0, AND3(a.1/3))

def AND5(5bit a):
   :1bit AND(AND(a.0, a.1), AND3(a.2/3))

def AND6(6bit a):
   :1bit AND(AND3(a.0-2), AND3(a.3-5))

def AND7(7bit a):
   :1bit AND(AND4(a.0-3), AND3(a.4-6))
  `,

cm_parser_7seg_not_a_compType : `
comp [7seg] .s:
   text: "R"
   color: ^2c7
   :


`,

ex_clock: `




repeat 1..5[
  comp [7seg] .s?:
    on:1
    :
]

comp [7seg] .s6:
   nl
   :


repeat 1..3[
  comp [key] .k?:
     label: ?
     on:1
     :
  1wire k? = .k?
]


comp [counter] .min1:
   depth: 4
   on:1
   :

comp [counter] .min2:
   depth: 4
   on:1
   :
   
comp [counter] .sec1:
   depth: 4
   on:1
   :

comp [counter] .sec2:
   =0000
   depth: 4
   :
4wire sec2 = .sec2:get

comp [mem] .ram:
   depth: 8
   length: 8
   on: 1
   :


.s5:{
  hex=0
  set=k1
}
.s6:{
  hex=0
  set=k1
}

.s6:{
  hex = sec2
  set = 1
}


.sec2:{
  dir=1
  set= ~
}


.sec2:{
  data = 0000
  write = EQ(sec2, 1001)
  set = ~
}


`,
ex_dv_7seg: `



comp [dip] .as:
   text: 'A'
   length: 16
   = 0000000000000000
   nl
   visual:1
   noLabels
   :16bit

16wire as = .as

comp [7seg] .b:
   on:1
   :

comp [7seg] .a:
   on:1
   :

   
comp [/] .dv:
   depth: 4
    on:1
   :
   
4wire dv1
4wire dv2
.dv:{
  a= as
  b= 1010
  set = 1
  get>=dv1
  mod>=dv2
}
1wire is0= AND(!dv2,1111)
1wire is0b= AND(!dv1,1111)
.a:{
  hex = dv2
  set= 1
}
.a:{
  a=0
  b=0
  c=0
  d=0
  e=0
  f=0
  set=is0
}
.b:{
  hex = dv1
  set=1
}
.b:{
  a=0
  b=0
  c=0
  d=0
  e=0
  f=0
  set= is0b
}


`,

bad_dv_7seg : `

comp [dip] .as:
   text: 'A'
   length: 16
   = 0000000000000000
   nl
   visual:1
   noLabels
   :16bit

4wire as = .as

comp [7seg] .a:
   :
   
comp [/] .dv:
   depth: 4
    on:1
   :
   
.dv:{
  a= as
  b= 1010
  set = ~
}
4wire dv1 = .dv:get
4wire dv2= .dv:mod

.a:hex = dv2
.a:set= 1

`,

ex_scr5:`


comp [key] .d:
    label:'d'
    size: 35
    on:1
    :
comp [key] .e:
    label:'e'
    size: 35
    on:1
    :

comp [lcd] .scr:
    row: 20
    cols: 20
    square
    on:1
     :
400wire c3 = 1 < \\399 w1
30bit d0heart = 00000+01010+11111+11111+01110 +00100
30bit d0diamond = 00000+00100+01110+11111+01110+00100
35bit d0club = 00100+01110+00100+10101+11111+00100+01110
30bit d0spade = 00100+01110+11111+11011+00100+01110

12wire cl0red = ^a33
12wire cl0green = ^3a3
12wire cl0black = ^001
12wire cl0white = ^aaa
.scr:{
  x=0
  y = 0
  rgb = ^222
  rowlen = \\20
  data= c3
  set = 1
}


.scr:{
   x=1
   y=1
   rgb= ^aa0
   rowlen= \\5
   not = 0
   write0=0
   chr= ^31
   set = 1
}

.scr:{
   x=\\6
   y=1
   rgb= ^aa0
   rowlen= \\5
   not = 0
   write0=0
   chr= ^32
   set = 1
}

.scr:{
   x=1
   y=\\9
   rgb= ^aaa
   rowlen= \\5
   write0=0
   chr= ^62
   set = .d
}

.scr:{
   x=\\12
   y=1
   rgb= cl0white
   rowlen= \\5
   data = d0spade
   set = 1
}


`,
ex_scr4: `
comp [key] .d:
    label:'d'
    size: 35
    on:1
    :

comp [lcd] .scr:
    row: 20
    cols: 20
    square
    on:1
     :
400wire c3 = 1 < \\399 w1

.scr:{
  x=0
  y = 0
  rgb = ^222
  rowlen = \\20
  data= c3
  set = 1
}


.scr:{
   x=1
   y=1
   rgb= ^aa0
   rowlen= \\5
   not = 0
   write0=0
   chr= ^31
   set = 1
}

.scr:{
   x=\\6
   y=1
   rgb= ^aa0
   rowlen= \\5
   not = 0
   write0=0
   chr= ^32
   set = 1
}

.scr:{
   x=\\12
   y=1
   rgb= ^aaa
   rowlen= \\5
   write0=0
   chr= ^62
   set = .d
}

30bit d0heart = 00000+01010+11111+11111+01110 +00100
.scr:{
   x=1
   y=\\9
   rgb= ^a33
   rowlen= \\5
   data = d0heart
   set = 1
}


`,
ex_scr3: `
comp [key] .d:
    label:'d'
    size: 35
    on:1
    :

comp [lcd] .scr:
    row: 20
    cols: 20
    square
    on:1
     :
400wire c3 = 1 < \\399 w1

.scr:{
  x=0
  y = 0
  rgb = ^222
  rowlen = \\20
  data= c3
  set = 1
}


.scr:{
   x=1
   y=1
   rgb= ^aa0
   rowlen= \\5
   not = 0
   write0=0
   chr= ^31
   set = 1
}

.scr:{
   x=\\6
   y=1
   rgb= ^aa0
   rowlen= \\5
   not = 0
   write0=0
   chr= ^32
   set = 1
}

1wire d = .d
.scr:{
   x=\\12
   y=1
   rgb= ^aaa
   rowlen= \\5
   write0=0
   chr= ^62
   set = d
}


`,

ex_scr2: `
comp [key] .d:
    label:'d'
    size: 35
    on:1
    :

comp [lcd] .scr:
    row: 20
    cols: 20
    square
    on:1
     :
400wire c3 = 1 < \\399 w1

.scr:{
  x=0
  y = 0
  rgb = ^222
  rowlen = \\20
  data= c3
  set = 1
}


.scr:{
   x=1
   y=1
   rgb= ^aa0
   rowlen= \\5
   not = 0
   write0=0
   chr= ^31
   set = 1
}

.scr:{
   x=\\6
   y=1
   rgb= ^aa0
   rowlen= \\5
   not = 0
   write0=0
   chr= ^32
   set = 1
}


.scr:{
   x=\\12
   y=1
   rgb= ^aaa
   rowlen= \\5
   not = 0
   write0=0
   chr= ^62
   set = .d
}



`,
ex_scr1: `

comp [lcd] .scr:
    row: 20
    cols: 20
    square
    on:1
     :
400wire c3 = 1 < \\399 w1

.scr:{
  x=0
  y = 0
  rgb = ^222
  rowlen = \\20
  data= c3
  set = 1
}


.scr:{
   x=1
   y=1
   rgb= ^aa0
   rowlen= \\5
   not = 0
   write0=0
   chr= ^4a
   set = 1
}



`,

ex_gm_7seg2: `

8wire a = \\127
4wire b = a.4/4
repeat 1..5[
  comp [7seg] .s?:
    on:1
    :
]

comp [7seg] .s6:
   nl
   :

repeat 1..3[
  comp [key] .k?:
     label: ?
     on:1
     :
  1wire k? = .k?
]

comp [mem] .pos:
   depth: 4
   length: 3
   on:1
   :

1wire k= OR(OR(.k1, .k2), .k3)
4wire pos
.pos:{
  at=0
  data = MUX1(.k1, MUX1(.k2, MUX1(.k3, \\0, \\3), \\2), \\1)       
  write = 1
  set = k
  get>= pos
}

.s1:{
  a=0
  g=0
  d=1
  set=.k3
}
.s1:{
  a=0
  g=1
  d=0
  set=.k2
}
.s1:{
  a=1
  g=0
  d=0
  set=.k1
}

16wire odata =  ^C6 3A
16wire r = $.0/16
4wire rnd = r.0/4
4wire rnd2 = r.4/4
4wire rnd3 = r.8/4
4wire rnd4 = r.12/4
#01111110
8wire o = MUX1(rnd.0, MUX1(rnd.1, MUX1(rnd.2, ^00, 10010000 ), odata.8/8), odata.0/8)
8wire o2 =  MUX1(rnd2.0, MUX1(rnd2.1, MUX1(rnd2.2, ^00, 10010000 ), odata.8/8), odata.0/8)
8wire o3 =  MUX1(rnd3.0, MUX1(rnd3.1, MUX1(rnd3.2, ^00, 10010000 ), odata.8/8), odata.0/8)
8wire o4 =  MUX1(rnd4.0, MUX1(rnd4.1, MUX1(rnd4.2, ^00, 10010000 ), odata.8/8), odata.0/8)



.s4:{
  a = o2.0
  b = o2.1
  c = o2.2
  d = o2.3
  e = o2.4
  f = o2.5
  g = o2.6
  h = o2.7
  set=~
}


.s5:{
  a = o.0
  b = o.1
  c = o.2
  d = o.3
  e = o.4
  f = o.5
  g = o.6
  h = o.7
  set=~
}


.s6:{
  a = o3.0
  b = o3.1
  c = o3.2
  d = o3.3
  e = o3.4
  f = o3.5
  g = o3.6
  h = o3.7
  set=~
}


.s3:{
  a = o4.0
  b = o4.1
  c = o4.2
  d = o4.3
  e = o4.4
  f = o4.5
  g = o4.6
  h = o4.7
  set=~
}

repeat 1..6[
   8wire ss? = .s?:get
]
`,

ex_gm_7seg: `
8wire a = \\127
4wire b = a.4/4
repeat 1..5[
  8wire s?
  comp [7seg] .s?:
    on:1
    :
  s? = .s?
]

comp [7seg] .s6:
   nl
   :
   
8wire s6 = .s6


repeat 1..3[
  comp [key] .k?:
     label: ?
     on:1
     :
  1wire k? = .k?
]

comp [mem] .pos:
   depth: 4
   length: 3
   on:1
   :

1wire k= OR(OR(.k1, .k2), .k3)
4wire pos
.pos:{
  at=0
  data = MUX1(.k1, MUX1(.k2, MUX1(.k3, \\0, \\3), \\2), \\1)       
  write = 1
  set = k
  get>= pos
}

.s1:{
  a=0
  g=0
  d=1
  set=.k3
}
.s1:{
  a=0
  g=1
  d=0
  set=.k2
}
.s1:{
  a=1
  g=0
  d=0
  set=.k1
}

.s4:{
  a= 1
  b= 1
  f= 1
  g= 1
  set=k1
}

`,

ex_mem_shifter5: `


   

comp [key] .k:
    label:'v'
    on:1
    :
comp [key] .k2:
    label:'^'
    on:1
    nl
    :

comp [dip] .i0:
    noLabels 
    visual:1
    on:1
    nl
    :
4wire i0= .i0
comp [led] .l00:
   square
   :
comp [led] .l01:
   square
   :
comp [led] .l02:
   square
   :
comp [led] .l03:
   square
   on:1
   nl
   :
comp [led] .l10:
   square
   :
comp [led] .l11:
   square
   :
comp [led] .l12:
   square
   :
comp [led] .l13:
   square
   on:1
   nl
   :
comp [led] .l20:
   square
   :
comp [led] .l21:
   square
   :
comp [led] .l22:
   square
   :
comp [led] .l23:
   square
   on:1
   nl
   :
comp [led] .l30:
   square
   :
comp [led] .l31:
   square
   :
comp [led] .l32:
   square
   :
comp [led] .l33:
   square
   on:1
   nl
   :




 comp [counter] .c:
      depth: 3
      on: 1
      :
   comp [-] .sub:
      depth: 3
      on: 1
      :


comp [mem] .r:
   depth: 4
   length: 4
   on:1
   :

1wire end= 0
1wire qend = !end
1wire k= AND(qend, .k)
1wire start=0
1wire qstart= !start
1wire k2= AND(qstart, .k2)

4wire r0
4wire r1
4wire r2

4wire f0
4wire f1
4wire f2
.r:{
   at=01
   get>= f0
   set = k2
}
.r:{
   at=0
   data = f0
   write = k2
   set = k2
}
.r:{
   at=10
   get>= f1
   set = k2
}
.r:{
   at=01
   data = f1
   write = k2
   set = k2
}
.r:{
   at=11
   get>= f2
   set = k2
}
.r:{
   at=10
   data = f2
   write = k2
   set = k2
}
.r:{
   at=11
   data = 0000
   write = k2
   set = k2
}

.r:{
   at=10
   get>= r2
   set = k
}
.r:{
   at=11
   data= r2
   write =k
   set= k
}
.r:{
   at=1
   get>= r1
   set = k
}
.r:{
   at=10
   data= r1
   write = k
   set= k
}
.r:{
   at=0
   get>= r0
   set = k
}
.r:{
   at=1
   data = r0
   write = k
   set = k
}
.r:{
   at=0
   data = i0
   write = k
   set = k
}
4wire t0 = 0000
.r:{
   at=0
   get>= t0
   set= OR(k, k2)
}
.l00= t0.0
.l01= t0.1
.l02= t0.2
.l03= t0.3

4wire t1 = 0000
.r:{
   at=1
   get>= t1
   set= OR(k, k2)
}
.l10= t1.0
.l11= t1.1
.l12= t1.2
.l13= t1.3

4wire t2 = 0000
.r:{
   at=10
   get>= t2
   set= OR(k, k2)
}
.l20= t2.0
.l21= t2.1
.l22= t2.2
.l23= t2.3

4wire t3 = 0000
.r:{
   at=11
   get>= t3
   set= OR(k, k2)
}
.l30= t3.0
.l31= t3.1
.l32= t3.2
.l33= t3.3

   3wire cc
   .c:{
     dir=1
     set=k
     get>= cc
   }
   .c:{
    dir=0
    set= k2
    get>= cc
   }
   
 
.sub:{
  a= 011
  b= cc
  set= .k
  carry>= end 
}

.sub:{
  a= cc
  b= 1
  set= .k2
  carry>= start
}





`,
ex_mem_shifter4: `


   

comp [key] .k:
    label:'v'
    on:1
    :
comp [key] .k2:
    label:'^'
    on:1
    nl
    :

comp [dip] .i0:
    noLabels 
    visual:1
    on:1
    nl
    :
4wire i0= .i0
comp [led] .l00:
   square
   :
comp [led] .l01:
   square
   :
comp [led] .l02:
   square
   :
comp [led] .l03:
   square
   on:1
   nl
   :
comp [led] .l10:
   square
   :
comp [led] .l11:
   square
   :
comp [led] .l12:
   square
   :
comp [led] .l13:
   square
   on:1
   nl
   :
comp [led] .l20:
   square
   :
comp [led] .l21:
   square
   :
comp [led] .l22:
   square
   :
comp [led] .l23:
   square
   on:1
   nl
   :
comp [led] .l30:
   square
   :
comp [led] .l31:
   square
   :
comp [led] .l32:
   square
   :
comp [led] .l33:
   square
   on:1
   nl
   :




 comp [counter] .c:
      depth: 3
      on: 1
      :
   comp [-] .sub:
      depth: 3
      on: 1
      :


comp [mem] .r:
   depth: 4
   length: 4
   on:1
   :

1wire end= 0
1wire qend = !end
1wire k= AND(qend, .k)
4wire r0
4wire r1
4wire r2
.r:{
   at=10
   get>= r2
   set = k
}
.r:{
   at=11
   data= r2
   write =k
   set= k
}
.r:{
   at=1
   get>= r1
   set = k
}
.r:{
   at=10
   data= r1
   write = k
   set= k
}
.r:{
   at=0
   get>= r0
   set = k
}
.r:{
   at=1
   data = r0
   write = k
   set = k
}
.r:{
   at=0
   data = i0
   write = k
   set = k
}
4wire t0 = 0000
.r:{
   at=0
   get>= t0
   set= k
}
.l00= t0.0
.l01= t0.1
.l02= t0.2
.l03= t0.3

4wire t1 = 0000
.r:{
   at=1
   get>= t1
   set= k
}
.l10= t1.0
.l11= t1.1
.l12= t1.2
.l13= t1.3

4wire t2 = 0000
.r:{
   at=10
   get>= t2
   set= k
}
.l20= t2.0
.l21= t2.1
.l22= t2.2
.l23= t2.3

4wire t3 = 0000
.r:{
   at=11
   get>= t3
   set= k
}
.l30= t3.0
.l31= t3.1
.l32= t3.2
.l33= t3.3

   3wire cc
   .c:{
     dir=1
     set=k
     get>= cc
   }
   
 
.sub:{
  a= 011
  b= cc
  set= .k
  carry>= end 
}






`,

ex_mem_shiftwr3: `
   

comp [key] .k:
    label:'v'
    on:1
    nl
    :

comp [dip] .i0:
    noLabels 
    visual:1
    on:1
    nl
    :
4wire i0= .i0
comp [led] .l00:
   square
   :
comp [led] .l01:
   square
   :
comp [led] .l02:
   square
   :
comp [led] .l03:
   square
   on:1
   nl
   :
comp [led] .l10:
   square
   :
comp [led] .l11:
   square
   :
comp [led] .l12:
   square
   :
comp [led] .l13:
   square
   on:1
   nl
   :
comp [led] .l20:
   square
   :
comp [led] .l21:
   square
   :
comp [led] .l22:
   square
   :
comp [led] .l23:
   square
   on:1
   nl
   :
comp [led] .l30:
   square
   :
comp [led] .l31:
   square
   :
comp [led] .l32:
   square
   :
comp [led] .l33:
   square
   on:1
   nl
   :




 comp [counter] .c:
      depth: 3
      on: 1
      :
   comp [-] .sub:
      depth: 3
      on: 1
      :


comp [mem] .r:
   depth: 4
   length: 4
   on:1
   :

1wire end= 0
1wire qend = !end
1wire k=.k 
4wire r0
4wire r1
4wire r2
.r:{
   at=10
   get>= r2
   set = k
}
.r:{
   at=11
   data= r2
   write =k
   set= k
}
.r:{
   at=1
   get>= r1
   set = k
}
.r:{
   at=10
   data= r1
   write = k
   set= k
}
.r:{
   at=0
   get>= r0
   set = k
}
.r:{
   at=1
   data = r0
   write = k
   set = k
}
.r:{
   at=0
   data = i0
   write = k
   set = k
}
4wire t0 = 0000
.r:{
   at=0
   get>= t0
   set= k
}
.l00= t0.0
.l01= t0.1
.l02= t0.2
.l03= t0.3

4wire t1 = 0000
.r:{
   at=1
   get>= t1
   set= k
}
.l10= t1.0
.l11= t1.1
.l12= t1.2
.l13= t1.3

4wire t2 = 0000
.r:{
   at=10
   get>= t2
   set= k
}
.l20= t2.0
.l21= t2.1
.l22= t2.2
.l23= t2.3

4wire t3 = 0000
.r:{
   at=11
   get>= t3
   set= k
}
.l30= t3.0
.l31= t3.1
.l32= t3.2
.l33= t3.3

   3wire cc
   .c:{
     dir=1
     set=k
     get>= cc
   }
   
 
.sub:{
  a= 100
  b= cc
  set= .k
  carry>= end 
}




`,

ex_mem_shifter2: `

comp [key] .k:
    label:'v'
    on:1
    nl
    :

comp [dip] .i0:
    noLabels 
    visual:1
    on:1
    nl
    :
4wire i0= .i0
comp [led] .l00::
comp [led] .l01::
comp [led] .l02::
comp [led] .l03:
   on:1
   nl
   :
comp [led] .l10::
comp [led] .l11::
comp [led] .l12::
comp [led] .l13:
   on:1
   nl
   :
comp [led] .l20::
comp [led] .l21::
comp [led] .l22::
comp [led] .l23:
   on:1
   nl
   :
comp [led] .l30::
comp [led] .l31::
comp [led] .l32::
comp [led] .l33:
   on:1
   nl
   :




 comp [counter] .c:
      depth: 3
      on: 1
      :
   comp [-] .sub:
      depth: 3
      on: 1
      :


comp [mem] .r:
   depth: 4
   length: 4
   on:1
   :

1wire end= 0
1wire qend = !end
1wire k=.k 
4wire r0
4wire r1
4wire r2
.r:{
   at=10
   get>= r2
   set = k
}
.r:{
   at=11
   data= r2
   write =k
   set= k
}
.r:{
   at=1
   get>= r1
   set = k
}
.r:{
   at=10
   data= r1
   write = k
   set= k
}
.r:{
   at=0
   get>= r0
   set = k
}
.r:{
   at=1
   data = r0
   write = k
   set = k
}
.r:{
   at=0
   data = i0
   write = k
   set = k
}
4wire t0 = 0000
.r:{
   at=0
   get>= t0
   set= k
}
.l00= t0.0
.l01= t0.1
.l02= t0.2
.l03= t0.3

4wire t1 = 0000
.r:{
   at=1
   get>= t1
   set= k
}
.l10= t1.0
.l11= t1.1
.l12= t1.2
.l13= t1.3

4wire t2 = 0000
.r:{
   at=10
   get>= t2
   set= k
}
.l20= t2.0
.l21= t2.1
.l22= t2.2
.l23= t2.3

4wire t3 = 0000
.r:{
   at=11
   get>= t3
   set= k
}
.l30= t3.0
.l31= t3.1
.l32= t3.2
.l33= t3.3

   3wire cc
   .c:{
     dir=1
     set=k
     get>= cc
   }
   
 
.sub:{
  a= 100
  b= cc
  set= .k
  carry>= end 
}



`,

ex_calc3: `


def EQ(3bit a, 3bit b):
    1bit r0 = !XOR(a.0, b.0)
    1bit r1 = !XOR(a.1, b.1)
    1bit r2 = !XOR(a.2, b.2)
    :1bit AND(AND(r0, r1), r2)


comp [7seg] .a:
   color: ^b93
   on:1
   :
comp [7seg] .b:
   color: ^b93
   on:1
   :
comp [7seg] .c:
   color: ^b93
   on:1
   :
comp [7seg] .d:
   color: ^b93
   on:1
   :
comp [7seg] .e:
   color: ^b93
   on:1
   :
comp [7seg] .f:
   color: ^b93
   on:1
   :
comp [7seg] .g:
   color: ^b93
   nl
   on:1
   :


comp [led] .op:
   text:'+'
   :
comp [led] .op:
   text:'-'
   :
comp [led] .op:
   text:'x'
   :
comp [led] .op:
   text:':'
   nl
   :

comp [key] .k1:
   label:'1'
   :
comp [key] .k2:
   label:'2'
   on:1
   :
comp [key] .k3:
   label:'3'
   :
comp [key] .kc:
   label:'C'
   nl
   :
comp [key] .k4:
   label:'4'
   :
comp [key] .k5:
   label:'5'
   :
comp [key] .k6:
   label:'6'
   :
comp [key] .kd:
   label:':'
   nl
   :
comp [key] .k7:
   label:'7'
   :
comp [key] .k8:
   label:'8'
   :
comp [key] .k9:
   label:'9'
   :
comp [key] .kx:
   label:'x'
   nl
   :
comp [key] .kp:
   label:'+'
   :
comp [key] .k0:
   label:'0'
   :
comp [key] .ke:
   label:'-'
   :
comp [key] .kb:
   label:'<'
   :
comp [key] .ke:
   label:'='
   :

comp [=] .crs:
   depth: 3
   on:1
   :

3wire crs= .crs:get

comp [mem] .q1:
   depth: 4
   length: 8
   on:1
   :

.q1:{
   at= crs
   data = 0010
   write= 1
   set = .k2 
}
.q1:{
   at= crs
   data = 0001
   write= 1
   set = .k1
}
1wire k= OR(.k1, .k2)
4wire mem0
4wire mem1
4wire mem2

.q1:{
   at= crs
   set= k
   get>= mem0
}

1wire eq
1wire eq1
1wire eq2



.crs:{
   dir= 1
   set= k
}
eq = EQ(.crs:get, 000)
eq1 = EQ(.crs:get, 001)
eq2 = EQ(.crs:get, 010)

.g:{
   hex= mem0
   set= EQ(crs, 000)
}

.f:{
   hex= mem0
   set= EQ(crs, 001)
}



`,

ex_calc2_3: `



comp [7seg] .a:
   color: ^b93
   on:1
   :
comp [7seg] .b:
   color: ^b93
   on:1
   :
comp [7seg] .c:
   color: ^b93
   on:1
   :
comp [7seg] .d:
   color: ^b93
   on:1
   :
comp [7seg] .e:
   color: ^b93
   on:1
   :
comp [7seg] .f:
   color: ^b93
   on:1
   :
comp [7seg] .g:
   color: ^b93
   nl
   on:1
   :


comp [led] .op:
   text:'+'
   :
comp [led] .op:
   text:'-'
   :
comp [led] .op:
   text:'x'
   :
comp [led] .op:
   text:':'
   nl
   :

comp [key] .k1:
   label:'1'
   :
comp [key] .k2:
   label:'2'
   on:1
   :
comp [key] .k3:
   label:'3'
   :
comp [key] .kc:
   label:'C'
   nl
   :
comp [key] .k4:
   label:'4'
   :
comp [key] .k5:
   label:'5'
   :
comp [key] .k6:
   label:'6'
   :
comp [key] .kd:
   label:':'
   nl
   :
comp [key] .k7:
   label:'7'
   :
comp [key] .k8:
   label:'8'
   :
comp [key] .k9:
   label:'9'
   :
comp [key] .kx:
   label:'x'
   nl
   :
comp [key] .kp:
   label:'+'
   :
comp [key] .k0:
   label:'0'
   :
comp [key] .ke:
   label:'-'
   :
comp [key] .kb:
   label:'<'
   :
comp [key] .ke:
   label:'='
   :

comp [=] .crs:
   depth: 3
   on:1
   :

3wire crs= .crs:get

comp [mem] .q1:
   depth: 4
   length: 8
   on:1
   :

.q1:{
   at= crs
   data = 0010
   write= 1
   set = .k2 
}

.q1:{
   at= crs
   data = 0001
   write= 1
   set = .k1
}

4wire mem0
4wire mem1
4wire mem2
1wire k = OR(.k1, .k2)
.q1:{
   at=0
   set= .k1
   get>= mem0
}
.q1:{
   at=1
   set= .k1
   get>= mem1
}
.q1:{
   at=10
   set= .k1
   get>= mem2
}
.q1:{
   at=0
   set= .k2
   get>= mem0
}
.q1:{
   at=1
   set= .k2
   get>= mem1
}
.q1:{
   at=10
   set= .k2
   get>= mem2
}

.g:{
   hex= mem0
   set= k
}
.f:{
   hex= mem1
   set= k
}
.e:{
   hex= mem2
   set= k
}


.crs:{
   dir= 1
   set= .k1
}

.crs:{
   dir= 1
   set= .k2
}

`,

ex_calc2_4: `





comp [7seg] .a:
   color: ^b93
   on:1
   :
comp [7seg] .b:
   color: ^b93
   on:1
   :
comp [7seg] .c:
   color: ^b93
   on:1
   :
comp [7seg] .d:
   color: ^b93
   on:1
   :
comp [7seg] .e:
   color: ^b93
   on:1
   :
comp [7seg] .f:
   color: ^b93
   on:1
   :
comp [7seg] .g:
   color: ^b93
   nl
   on:1
   :


comp [led] .op:
   text:'+'
   :
comp [led] .op:
   text:'-'
   :
comp [led] .op:
   text:'x'
   :
comp [led] .op:
   text:':'
   nl
   :

comp [key] .k1:
   label:'1'
   :
comp [key] .k2:
   label:'2'
   on:1
   :
comp [key] .k3:
   label:'3'
   :
comp [key] .kc:
   label:'C'
   nl
   :
comp [key] .k4:
   label:'4'
   :
comp [key] .k5:
   label:'5'
   :
comp [key] .k6:
   label:'6'
   :
comp [key] .kd:
   label:':'
   nl
   :
comp [key] .k7:
   label:'7'
   :
comp [key] .k8:
   label:'8'
   :
comp [key] .k9:
   label:'9'
   :
comp [key] .kx:
   label:'x'
   nl
   :
comp [key] .kp:
   label:'+'
   :
comp [key] .k0:
   label:'0'
   :
comp [key] .ke:
   label:'-'
   :
comp [key] .kb:
   label:'<'
   :
comp [key] .ke:
   label:'='
   :

comp [=] .crs:
   depth: 3
   on:1
   :

3wire crs= .crs:get

comp [mem] .q1:
   depth: 4
   length: 8
   on:1
   :


.q1:{
   at= crs
   data= 0011
   write=1
   set= .k3
}
.q1:{
   at= crs
   data = 0010
   write= 1
   set = .k2 
}

.q1:{
   at= crs
   data = 0001
   write= 1
   set = .k1
}

4wire mem0
4wire mem1
4wire mem2
4wire mem3
4wire mem4

1wire k = OR( OR(.k1, .k2), .k3)
.q1:{
   at=0
   set= .k1
   get>= mem0
}
.q1:{
   at=1
   set= .k1
   get>= mem1
}
.q1:{
   at=10
   set= .k1
   get>= mem2
}
.q1:{
   at=11
   set= .k1
   get>= mem3
}
.q1:{
   at=100
   set= .k1
   get>= mem4
}



.q1:{
   at=0
   set= .k2
   get>= mem0
}
.q1:{
   at=1
   set= .k2
   get>= mem1
}
.q1:{
   at=10
   set= .k2
   get>= mem2
}
.q1:{
   at=11
   set= .k2
   get>= mem3
}
.q1:{
   at=100
   set= .k2
   get>= mem4
}

.q1:{
   at=0
   set= .k3
   get>= mem0
}
.q1:{
   at=1
   set= .k3
   get>= mem1
}
.q1:{
   at=10
   set= .k3
   get>= mem2
}
.q1:{
   at=11
   set= .k3
   get>= mem3
}
.q1:{
   at=100
   set= .k3
   get>= mem4
}


.g:{
   hex= mem0
   set= k
}
.f:{
   hex= mem1
   set= k
}
.e:{
   hex= mem2
   set= k
}
.d:{
   hex= mem3
   set= k
}
.c:{
   hex= mem4
   set= k
}



.crs:{
   dir= 1
   set= .k1
}
.crs:{
   dir= 1
   set= .k2
}
.crs:{
   dir=1
   set= .k3
}

`,

ex_calc2: `

comp [7seg] .a:
   color: ^b93
   on:1
   :
comp [7seg] .b:
   color: ^b93
   on:1
   :
comp [7seg] .c:
   color: ^b93
   on:1
   :
comp [7seg] .d:
   color: ^b93
   on:1
   :
comp [7seg] .e:
   color: ^b93
   on:1
   :
comp [7seg] .f:
   color: ^b93
   on:1
   :
comp [7seg] .g:
   color: ^b93
   nl
   on:1
   :


comp [led] .op:
   text:'+'
   :
comp [led] .op:
   text:'-'
   :
comp [led] .op:
   text:'x'
   :
comp [led] .op:
   text:':'
   nl
   :

comp [key] .k1:
   label:'1'
   :
comp [key] .k2:
   label:'2'
   on:1
   :
comp [key] .k3:
   label:'3'
   :
comp [key] .kc:
   label:'C'
   nl
   :
comp [key] .k4:
   label:'4'
   :
comp [key] .k5:
   label:'5'
   :
comp [key] .k6:
   label:'6'
   :
comp [key] .kd:
   label:':'
   nl
   :
comp [key] .k7:
   label:'7'
   :
comp [key] .k8:
   label:'8'
   :
comp [key] .k9:
   label:'9'
   :
comp [key] .kx:
   label:'x'
   nl
   :
comp [key] .kp:
   label:'+'
   :
comp [key] .k0:
   label:'0'
   :
comp [key] .ke:
   label:'-'
   :
comp [key] .kb:
   label:'<'
   :
comp [key] .ke:
   label:'='
   :

comp [=] .crs:
   depth: 3
   on:1
   :

3wire crs= .crs:get

comp [mem] .q1:
   depth: 4
   length: 8
   on:1
   :

.q1:{
   at= crs
   data = 0010
   write= 1
   set = .k2 
}

4wire mem0
4wire mem1
4wire mem2

.q1:{
   at=0
   set= .k2
   get>= mem0
}
.q1:{
   at=1
   set= .k2
   get>= mem1
}
.q1:{
   at=10
   set= .k2
   get>= mem2
}

.g:{
   hex= mem0
   set= .k2
}

.f:{
   hex= mem1
   set= .k2
}


.crs:{
   dir= 1
   set= .k2
}


`,


ex_calc: `
comp [7seg] .a:
   color: ^9b3
   on:1
   :
comp [7seg] .b:
   color: ^9b3
   on:1
   :
comp [7seg] .c:
   color: ^9b3
   on:1
   :
comp [7seg] .d:
   color: ^9b3
   nl
   on:1
   :

comp [key] .k1:
   label:'1'
   :
comp [key] .k2:
   label:'2'
   :
comp [key] .k3:
   label:'3'
   :
comp [key] .kc:
   label:'C'
   nl
   :
comp [key] .k4:
   label:'4'
   :
comp [key] .k5:
   label:'5'
   :
comp [key] .k6:
   label:'6'
   :
comp [key] .ke:
   label:'='
   nl
   :
comp [key] .k7:
   label:'7'
   :
comp [key] .k8:
   label:'8'
   :
comp [key] .k9:
   label:'9'
   :
comp [key] .kx:
   label:'x'
   nl
   :
comp [key] .kp:
   label:'+'
   :
comp [key] .k0:
   label:'0'
   :
comp [key] .ke:
   label:'-'
   :
comp [key] .kd:
   label:':'
   nl
   :




`,
  
ex_7seg_dec2: `






def ANDA4(4bit a):
   :1bit AND( AND(a.0, a.1), AND(a.2, a.3))







comp [dip] .sg:
   text: 'Sign'
   length: 1
   = 0
   visual: 1
   noLabels
   :1bit
comp [dip] .as:
   text: 'A'
   length: 16
   = 0000000000000000
   nl
   visual:1
   noLabels
   :16bit

16wire as = MUX1(.sg, .as, !.as)


comp [7seg] .f:
   text: "="
   color: ^9b3
   on:1
   :
comp [7seg] .e:
   color: ^9b3
   on:1
   :
comp [7seg] .a:
   color: ^9b3
   on:1
   :
comp [7seg] .b:
   color: ^9b3
   on:1
   :
comp [7seg] .c:
   color: ^9b3
   on:1
   :
comp [7seg] .d:
   color: ^9b3
   on:1
   :

comp [divider] .dv:
   depth: 16
   on:1
   :
comp [divider] .dx:
   depth: 16
   on:1
   :
comp [divider] .dy:
   depth: 16
   on:1
   :
comp [divider] .dz:
   depth: 16
   on:1
   :

16wire da
16wire db
16wire dc
16wire dd
16wire de
16wire df
16wire dg
16wire dh

.dv:{
   a = as
   b = 1010
   set = 1
   get>= da
   mod>= db
}
.dx:{
   a = da
   b = 1010
   set = 1
   get>= dc
   mod>= dd
}
.dy:{
   a = dc
   b = 1010
   set = 1
   get>= de
   mod>= df
}
.dz:{
   a = de
   b = 1010
   set = 1
   get>= dg
   mod>= dh
}
.f:{
  g = MUX1(.sg, 0, 1)
  set = 1
}
.e:{
  hex = dg.12/4
  set = 1
}
.a:{
   hex = dh.12/4
   set = 1
}

.b:{
   hex = df.12/4
   set = 1
}

.c:{
   hex = dd.12/4
   set = 1
}

.d:{
   hex = db.12/4
   h=1
   set = 1
}

1wire e0 = ANDA4(!dg.12/4)
1wire a0 = AND(ANDA4(!dh.12/4), e0)
1wire b0 = AND(ANDA4(!df.12/4), a0)
1wire c0 = AND(ANDA4(!dd.12/4), b0)
1wire d0 = AND(ANDA4(!db.12/4), c0)


.e:{
   a=0
   b=0
   c=0
   d=0
   e=0
   f=0
   set= e0
}

.a:{
   a=0
   b=0
   c=0
   d=0
   e=0
   f=0
   set= a0
}

.b:{
   a=0
   b=0
   c=0
   d=0
   e=0
   f=0
   set= b0
}

.c:{
   a=0
   b=0
   c=0
   d=0
   e=0
   f=0
   set= c0
}


.d:{
   a=0
   b=0
   c=0
   d=0
   e=0
   f=0
   h=0
   set= d0
}

NEXT(~)


`,
  
ex_7seg_dec: `


comp [dip] .as:
   text: 'A'
   length: 8
   = 00000000
   nl
   :8bit

8wire as = .as

comp [7seg] .b:
   text:"AB"
   color: ^9b3
   on:1
   :
comp [7seg] .c:
   color: ^9b3
   on:1
   :
comp [7seg] .d:
   color: ^9b3
   on:1
   :

comp [divider] .dv:
   depth: 8
   on:1
   :

comp [divider] .dx:
   depth: 8
   on:1
   :

8wire da
8wire db
8wire dc
8wire dd

.dv:{
   a = .as
   b = 1010
   set = 1
   get>= da
   mod>= db
}


.dx:{
   a = da
   b = 1010
   set = 1
   get>= dc
   mod>= dd
}

.b:{
   hex = dc.4/4
   set = 1
}

.c:{
   hex = dd.4/4
   set = 1
}

.d:{
   hex = db.4/4
   set = 1
}


`,
  
ex_counter_plus_minus: `

comp [key] .s1:
   label:"lf"
   on:1
   :

comp [key] .s2:
   label: "rg"
   on:1
   :

comp [=] .crs:
   depth: 4
   = 0000
   on:1
   :
4wire crs0
.crs:{
  dir= 0
  set= .s1
  get>= crs0
}
.crs:{
  dir= 1
  set= .s2
  get>=crs0
}

`,
ex_mem_sep_blocks_v2: `

comp [key] .s1:
   label: "1"
   size: 36
   :
comp [key] .s2:
   label: "2"
   size: 36
   :

comp [mem] .mem:
  depth: 8
  length: 16
  on:1
  :

8wire at10

.mem:{
  at= 10
  data= ^FF
  write= 1
  set= .s1
  get>= at10
}
8wire k 
.mem:{
   at= 10
   set= .s2
   get>= k
}
8wire b = .mem:get

`,

ex_pcb_bcd: `



pcb +[bcd]:
   4pin sum
   1pin set
   4pout corr
   1pout carry
   exec: set
   on:1

   comp [-] .sub:
      on:1
      :

   .sub:a = sum
   .sub:b = MUX1(set, 0000, 1010)
   .sub:set = set
   corr = .sub:get
   carry = .sub:carry 

   :1bit set

pcb [bcd] .b::

.b:sum = 1111
.b:set = 0

show(.b:corr)
show(.b:carry)






`,

ex_pcb_w_mem: `
pcb +[comp1]:
   4pin adr
   8pin data
   8pout get
   1pin set
   1pin write
   exec: set
   on: 1
   comp [mem] .ram:
      depth: 8
      length: 16
      on: 1
      :
   .ram:at = adr
   get = .ram:get
   ~~
   .ram:{ 
      at = adr
      data = data
      write = 1
      set = set
   }
   get = .ram:get
   :1bit set

# new instance
pcb [comp1] .a::

pcb [comp1] .b::

# using it
.a:adr = ^F
.a:data = ^AB
.a:write = 1
.a:set = 1
8wire out = .a:get

.b:adr = ^F
8wire out2 = .b:get

show(.a:get)
NEXT(~)
show(.a:get)
`,

  ex_7seg_alu_rotary: `
  

  


  


comp [switch] .on:
   text: 'Pwr'
   :

comp [led] .pwr:
   color: ^21f
   nl
   text: 'ON'
   :

.pwr = .on

comp [rotary] .op:
    text: "R1"
    for.0: "+"
    for.1: "-"
    for.2: "x"
    for.3: ":"
    states : 4
    :

comp [led] .w:
    nl
    :

comp [dip] .as:
   text: 'A'
   length: 4
   visual: 1
   noLabels
   = 0000
   :8bit

comp [dip] .bs:
   text: "B"
   length: 4
   visual: 1
   noLabels
   nl
   :4bit

comp [7seg] .a:
   text: "A"
   :

comp [7seg] .b:
   text:"B"
   :
comp [7seg] .c:
   text:"AB"
   color: ^bb3
   :
comp [7seg] .d:
   color: ^3ba
   :

.a:hex = 0
.a:set = 1
.b:hex = 0
.b:set = 1

.a:hex = .as
.b:hex = .bs
.a:set = 1
.b:set = 1

comp [adder] .ad:
   depth: 4
   :

comp [subtract] .sb:
   depth: 4
   :

comp [multiplier] .mp:
   depth: 4
   :

comp [divider] .dv:
   depth: 4
   :
   
.ad:a = .as
.ad:b = .bs

.sb:a = .as
.sb:b = .bs

.mp:a = .as
.mp:b = .bs

.dv:a = .as
.dv:b = .bs

show(.ad:get)
show(.ad:carry)


.c:hex = MUX2(.op, .ad:carry, .sb:carry, .mp:over, .dv:mod)
.c:set = 1

.d:hex = MUX2(.op, .ad:get, .sb:get, .mp:get, .dv:get)
.d:set = 1

2wire qq = .op

.c:set = .as + .bs
.d:set = .as + .bs

  

  

  `,
ex_7seg_alu: `


comp [switch] .on:
   text: 'Pwr'
   :

comp [led] .pwr:
   color: ^21f
   nl
   text: 'ON'
   :

.on = 1
.pwr = .on

comp [dip] .op:
   text: 'Op'
   length: 4
   nl
   :4bit

comp [dip] .as:
   text: 'A'
   length: 4
   = 0000
   :8bit

comp [dip] .bs:
   text: "B"
   length: 4
   nl
   :4bit

comp [7seg] .a:
   text: "A"
   :

comp [7seg] .b:
   text:"B"
   :
comp [7seg] .c:
   text:"AB"
   color: ^9b3
   :
comp [7seg] .d:
   color: ^9b3
   :

.a:hex = 0
.a:set = 1
.b:hex = 0
.b:set = 1

.a:hex = .as
.b:hex = .bs
.a:set = 1
.b:set = 1

comp [adder] .ad:
   depth: 4
   :

comp [subtract] .sb:
   depth: 4
   :

comp [multiplier] .mp:
   depth: 4
   :

comp [divider] .dv:
   depth: 4
   :
   
.ad:a = .as
.ad:b = .bs

.sb:a = .as
.sb:b = .bs

.mp:a = .as
.mp:b = .bs

.dv:a = .as
.dv:b = .bs

show(.ad:get)
show(.ad:carry)


.c:hex = MUX2(.op.0/2, .ad:carry, .sb:carry, .mp:over, .dv:mod)
.c:set = 1

.d:hex = MUX2(.op.0/2, .ad:get, .sb:get, .mp:get, .dv:get)
.d:set = 1

.c:set = ~
.d:set = ~
`,
ex_7seg_adder: `

comp [switch] .on:
   text: 'Pwr'
   :

comp [led] .pwr:
   color: ^21f
   nl
   text: 'ON'
   :

.on = 1
.pwr = .on

comp [dip] .as:
   text: 'A'
   length: 4
   = 0000
   :8bit

comp [dip] .bs:
   text: "B"
   length: 4
   nl
   :4bit

comp [7seg] .a:
   text: "A"
   :

comp [7seg] .b:
   text:"B"
   :
comp [7seg] .c:
   text:"AB"
   color: ^9b3
   :
comp [7seg] .d:
   color: ^9b3
   :

.a:hex = 0
.a:set = 1
.b:hex = 0
.b:set = 1

.a:hex = .as
.b:hex = .bs
.a:set = 1
.b:set = 1

comp [adder] .ad:
   depth: 4
   :

   
.ad:a = .as
.ad:b = .bs

show(.ad:get)
show(.ad:carry)

.c:hex = .ad:carry
.c:set = 1

.d:hex = .ad:get
.d:set = 1

.c:set = ~
.d:set = ~`,
  ex_mem_counter:
  `
    comp [counter] .c:
   depth: 5
   = 00000
   :

  comp [mem] .rom:
   depth: 8
   length: 256
   :


.rom:at = 0
.rom:data = ^1234 5678 9ABC + ^DF FF
.rom:write = 1
.rom:set = 1

.c:dir = 1
.c:set = 1

.rom:at = .c:get
show(.c:get)
show(.rom:get)

.c:set = 1
.rom:set = 1
show(.c:get)
show(.rom:get)

.c:set = 1
.rom:set = 1
show(.c:get)
show(.rom:get)

.c:set = 1
.rom:set = 1
show(.c:get)
show(.rom:get)


.c:set = 1
.rom:set = 1
show(.c:get)
show(.rom:get)


.c:set = 1
.rom:set = 1
show(.c:get)
show(.rom:get)

.c:set = 1
.rom:set = 1
show(.c:get)
show(.rom:get)

.c:set = 1
.rom:set = 1
show(.c:get)
show(.rom:get)

  `,
  ex_counter: `
  
  comp [counter] .c:
   depth: 5
   = 00100
   :
#this should have a js function like addCounter({ depth: 4, default: "0000" })
#if no default is set then use 0
#this should execute:
#addCounter({depth: 5, default: "00100" })


.c:dir = 1
#sets the direction to increment
.c:data = 10100
.c:write = 1
#sets the date to be 10100 
.c:set = 1
#the value is changed imediatly and because the direction is increment it will changed to 10101 
#if the value was 11111 then the increment should change it to 00000
show(.c:get) 

.c:set = ~
#the value is changed on the next NEXT(~) 

.c:dir = 0
#sets the direction to decrement
.c:data = 00000
.c:write = 1
.c:set = 1
#the value is changed imediatly and because the direction is decrement it will be changed to 11111

show(.c:get) 
#this should show the current value of the counter meaning 11111

.c:dir = 0
.c:set = 1
show(.c:get) 

.c:set = 1
show(.c:get) 
.c:set = 1
show(.c:get) 
  

  `,
  
  ex_mem: `
  
  comp [mem] .rom:
   depth: 8
   length: 256
   :


.rom:at = 0
.rom:data = ^1234 5678 9ABC + ^DF
.rom:write = 1
.rom:set = 1
#this sets 7 values for address 0 to 6 now

5bit adr = 00100
8bit val2 = ^0F
.rom:at = adr
.rom:data = val2

show(.rom:get)
#shows 10011010 

show(adr)
.rom:set = ~
#this will set for address 5 the value 0 when NEXT(~)  will be executed

show(.rom:get)
#shows 00001111 
NEXT(~)
show(.rom:get)
#shows 00001111


  
  `,
  
  ex_lcd_mem9_clr: `
  
  
def NOTE(4bit a):
    :1bit NOT(a.0)
    :1bit NOT(a.1) 
    :1bit NOT(a.2)
    :1bit NOT(a.3)

def AND4(4bit a):
    :1bit AND( AND(a.0, a.1), AND(a.2, a.3))

  
comp [key] .clr:
  label:"Clr"
  size: 50
  :
comp [key] .lf:
  label:"lf"
  :
comp [key] .rg:
  label:"rg"
  :

comp [mem] .mem:
  depth: 8
  length: 16
  on: 1
  :


.mem:at = 0
.mem:data = ^4865 6c6c 6f20 576f 726c 6420 3a21 205f 
.mem:write = 1
.mem:set = 1

comp [lcd] .lcd1:
  row: 8
  cols: 100
  pixelSize: 2
  pixelGap: 1
  glow
  round: 0
  color: ^58f
  bg: ^000
  rgb
  nl
  on:1
  :

comp [counter] .c:
   depth: 4
   = 0000
   :

comp [counter] .crs:
   depth: 5
   = 00000
   on:1
   :
5wire crs
.crs:{
  dir= 1
  set= .rg
  get>= crs
}
.crs:{
  dir= 0
  set= .lf
  get>= crs
}


comp [multiplier] .ml:
   :
comp [adder] .add:
   :

4wire q= .c:get
1wire clr = .clr

1wire k = MUX1(clr, 1, ~)


.c:{
  dir = 1
  data = 0000
  write = clr
  set = ~
}


5wire m1= .ml:get
5wire m2= .ml:over
.add:{
 a= crs
 b= .c:get
 set= ~
}
5wire j2= .add:carry + .add:get
.ml:{
  a= .add:get
  b= ^6
  set = ~
}

8wire j 
.mem:{
   at= q
   set= ~
   get>= j
}

.lcd1:{
  clear= clr
  set = 1
}

.lcd1:{ 
  x = .ml:over + .ml:get
  y = 0
  rgb = MUX2(q.0/2, ^F33, ^FF3, ^F3F, ^3FF)
  rowlen = 101
  chr = .mem:get
  set = k
}
  

  
  

  `,
  
  ex_lcd_mem5_clr: `
  
  
  
def NOTE(4bit a):
    :1bit NOT(a.0)
    :1bit NOT(a.1) 
    :1bit NOT(a.2)
    :1bit NOT(a.3)

def AND4(4bit a):
    :1bit AND( AND(a.0, a.1), AND(a.2, a.3))

  
comp [key] .clr:
  label:"Clr"
  size: 50
  :


comp [mem] .mem:
  depth: 8
  length: 16
  :


.mem:at = 0
.mem:data = ^4865 6c6c 6f20 576f 726c 6420 3a21 205f 
.mem:write = 1
.mem:set = 1

comp [lcd] .lcd1:
  row: 8
  cols: 100
  pixelSize: 2
  pixelGap: 1
  glow
  round: 0
  color: ^58f
  bg: ^000
  rgb
  nl
  on:1
  :

comp [counter] .c:
   depth: 4
   = 0000
   :

comp [multiplier] .ml:
   :


4wire q= .c:get
1wire clr = .clr
#1wire clr = MUX1(AND4(NOTE(q)), .clr, 1)
1wire k = MUX1(clr, 1, ~)

.c:{
  dir = 1
  data = 0000
  write = clr
  set = ~
}

#4wire q= .c:get

5wire m1= .ml:get
5wire m2= .ml:over
.ml:{
  a= .c:get
  b= ^6
  set = ~
}

.mem:{
   at= q
   set= 1
}
8bit j = .mem:get

.lcd1:{ 
  clear = clr
  x = .ml:over + .ml:get
  y = 0
  rgb = MUX2(q.0/2, ^F33, ^FF3, ^F3F, ^3FF)
  rowlen = 101
  chr = .mem:get
 # chr = ^4 + q
  set = k
}
  `,
  
  ex_lcd_mem_key: `
  
  
  
  

  
comp [key] .clr:
  label:"Clr"
  size: 50
  :


comp [mem] .mem:
  depth: 8
  length: 16
  = 48 65 6c 6c 6f 20 57 6f 72 6c 64
  :


.mem:at = 0
.mem:data = ^48 65 6c 6c 6f 20 57 6f 72 6c 64 20 3a 21 20 5f 
.mem:write = 1
.mem:set = 1

comp [lcd] .lcd1:
  row: 8
  cols: 100
  pixelSize: 2
  pixelGap: 1
  glow
  round: 0
  color: ^58f
  bg: ^000
  rgb
  nl
  on:1
  :

comp [counter] .c:
   depth: 4
   = 0000
   :

comp [multiplier] .ml:
   :


1wire clr = .clr
1wire k = MUX1(clr, 1, ~)

.c:dir = 1
.c:set = ~

4wire q= .c:get

5wire m1= .ml:get
5wire m2= .ml:over
.ml:{
  a= .c:get
  b= ^6
  set = ~
}

.mem:{
   at= q
   set= 1
}
8bit j = .mem:get

.lcd1:{ 
  clear = clr
  x = .ml:over + .ml:get
  y = 0
  rgb = MUX2(q.0/2, ^F33, ^FF3, ^F3F, ^3FF)
  rowlen = 101
  chr = .mem:get
 # chr = ^4 + q
  set = k
}
  
  
  
  
  
  `,
  ex_lcd2: `
  

comp [lcd] .lcd1:
  row: 8
  cols: 40
  pixelSize: 7
  pixelGap: 1
  glow
  round: 0
  color: ^58f
  bg: ^000
  rgb
  nl
  :

comp [counter] .c:
   depth: 4
   = 0001
   :

comp [multiplier] .ml:
   :

.c:dir = 1
.c:set = ~

4wire q= .c:get

4wire m1= .ml:get
4wire m2= .ml:over
.ml:{
  a= .c:get
  b= ^1
  set = ~
}

.lcd1:{ 
  clear = MUX2(q.0/2,1,0,0,0)
  x = .ml:get
  y = 0
  rgb = MUX2(q.0/2, ^F33, ^FF3, ^F3F, ^3FF)
  rowlen = 101
  chr = ^4 + q
  set = ~
}
  
  
  
  `,
  
  ex_lcd: `

comp [lcd] .lcd1:
  row: 8
  cols: 20
  pixelSize: 7
  pixelGap: 1
  glow
  round: 0
  color: ^58f
  bg: ^000
  nl
  :

comp [counter] .c:
   depth: 3
   = 000
   :

.c:dir = 1
.c:set = ~

5wire q= .c:get


.lcd1:clear = 1
.lcd1:x = .c:get
.lcd1:y = 0
.lcd1:rowlen = 101
.lcd1:chr = ^41
.lcd1:data = 0111010001100000111000001100010111000000
.lcd1:set = ~
  
  `,
  
  
  ex_pcb_shifter2: `
  
  
pcb +[sh4]:
   4pin in
   16pout get
   1pin into
   1pin set
   4pout out
   16pout all
   exec: set
   on: 1
   comp [shifter] .sh0:
      depth: 4
      on: 1
      :
   comp [shifter] .sh1:
      depth: 4
      on: 1
      :
   comp [shifter] .sh2:
      depth: 4
      on: 1
      :
   comp [shifter] .sh3:
      depth: 4
      on: 1
      :
   1wire i = into
   .sh0:dir=i
   .sh1:dir=i
   .sh2:dir=i
   .sh3:dir=i
   .sh0:in=MUX1(i, 0, in.0)
   .sh1:in=MUX1(i, 0, in.1)
   .sh2:in=MUX1(i, 0, in.2)
   .sh3:in=MUX1(i, 0, in.3)
   .sh0:set= set
   .sh1:set= set
   .sh2:set= set
   .sh3:set= set
   out = .sh0:out + .sh1:out + .sh2:out +.sh3:out
   get = .sh0:get + .sh1:get + .sh2:get +.sh3:get
   4bit sh0= .sh0:get
   4bit sh1= .sh1:get
   4bit sh2= .sh2:get
   4bit sh3= .sh3:get
   4bit m0= sh0.0 + sh1.0 + sh2.0 + sh3.0
   4bit m1= sh0.1 + sh1.1 + sh2.1 + sh3.1
   4bit m2= sh0.2 + sh1.2 + sh2.2 + sh3.2
   4bit m3= sh0.3 + sh1.3 + sh2.3 + sh3.3
   all = m0 +m1+ m2+ m3
   #all= sh0+ sh1+sh2+sh3
   ~~
   :1bit set

# new instance
8wire g
pcb [sh4] .a::

.a:in=1111
.a:into=1
.a:set=1
.a:in=1010
.a:into=1
.a:set=1
.a:in=1100
.a:into=1
.a:set=1
#.a:into=0
#.a:set=1
16wire a=.a:all
4bit o=.a:out
show(a.0/8, a.8/8)
show(o)
  `,
  ex_pcb_shifter:
  `
  
  
pcb +[sh4]:
   4pin in
   16pout get
   1pin into
   1pin set
   4pout out
   exec: set
   on: 1
   comp [shifter] .sh0:
      depth: 4
      on: 1
      :
   comp [shifter] .sh1:
      depth: 4
      on: 1
      :
   comp [shifter] .sh2:
      depth: 4
      on: 1
      :
   comp [shifter] .sh3:
      depth: 4
      on: 1
      :
   1wire i = into
   .sh0:dir=i
   .sh1:dir=i
   .sh2:dir=i
   .sh3:dir=i
   .sh0:in=MUX1(i, 0, in.0)
   .sh1:in=MUX1(i, 0, in.1)
   .sh2:in=MUX1(i, 0, in.2)
   .sh3:in=MUX1(i, 0, in.3)
   .sh0:set= set
   .sh1:set= set
   .sh2:set= set
   .sh3:set= set
   out = .sh0:out + .sh1:out + .sh2:out +.sh3:out
   get = .sh0:get + .sh1:get + .sh2:get +.sh3:get
   ~~
   :1bit set

# new instance
8wire g
pcb [sh4] .a::

.a:in=1111
.a:into=1
.a:set=1
.a:in=1010
.a:into=1
.a:set=1
.a:into=0
.a:set=1
16wire a=.a:get
4bit o=.a:out
show(a.0/8, a.8/8)
show(o)
  
  `,
  ex_shifter: `
  comp [shifter] .sh:
   depth: 8
   :

.sh:value = 00110111
.sh:set = 1
#this should set this value in the shifter

.sh:dir = 1 
#meaning shifting to right or
.sh:set = 1
#the shifting is done now

show(.sh:get) 
show(.sh:out)


comp [shifter] .sh2:
   depth: 8
   circular
   on: 1
   :
#this shifter is circular 

8wire g
1wire o

.sh2:{
  value = 00110111
  dir = 1
  set = 1
  get>= g
  out>= o
}
#the shifting is done now

show(.sh:get)
#shows 10011011
show(.sh:out)
#shows 1 shows the bit that was shifted out 


`,
  
  ex_alu_comps: `
  
comp [adder] .add:
   depth: 32
   :
   

.add:a = ^FFFF FFFF
.add:b = ^8FFF FFFF
show(.add:get)
show(.add:carry)

comp [subtract] .sub:
   depth: 4
   :

.sub:a = 1111
.sub:b = 0110
show(.sub:get)
#shows 1001 shows the result of a - b
show(.sub:carry)
#shows 0  shows the carry after a - b

.sub:a = 0000
.sub:b = 0001
show(.sub:get)
#shows 1111 shows the result of a - b
show(.sub:carry)
#shows 1  shows the carry after a - b


comp [divider] .div:
   depth: 32
   :

.div:a = ^FFFF FFFF
.div:b = ^0000 0023
show(.div:get)
#shows 0111 shows the result of a / b
show(.div:mod)
#shows 0000 shows the modulo of a / b


comp [multiplier] .mul:
    depth: 4
    :
    
.mul:a = 0010
.mul:b = 0010
show(.mul:get)
#shows 0100 shows the result of a * b
show(.mul:over)
#shows 0000 shows the carry over after the result of a * b

.mul:a = 1111
.mul:b = 1111
show(.mul:get)
#shows 0001 shows the result of a * b
show(.mul:over)
#shows 1110 shows the carry over after the result of a * b
`,
};
