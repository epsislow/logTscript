/* ================= CHARACTER LCD ================= */

  const lcdDisplays = new Map();

function addCharacterLCD(options) {
  const container = document.getElementById("devices");
  if (!container || !options.id) return;
  showDevices();

  const lcd = new CharacterLCD(options);
  lcd.mount(container);
  lcdDisplays.set(options.id, lcd);
}

class CharacterLCD {
  constructor({
    id,
    rows = 8,
    cols = 5,
    pixelSize = 10,
    pixelGap = 3,
    pixelOnColor = "#6dff9c",
    backgroundColor = "transparent",
    glow = true,
    round = true,
      nl = false,
    rgb = false,
  }) {
    this.id = id;
    this.rows = rows;
    this.cols = cols;
    this.pixelSize = pixelSize;
    this.pixelGap = pixelGap;
    this.pixelOnColor = pixelOnColor;
    this.backgroundColor = backgroundColor;
    this.glow = glow;
    this.round = round;
    this.nl = nl;
    this.rgb = rgb;
    this.currentColor = null; // Current RGB color for new pixels
    this.loadEnglishFont();

    this.pixels = Array.from({ length: rows }, () =>
      Array(cols).fill(0)
    );
    
    // Initialize pixelColors array to store color per pixel
    this.pixelColors = Array.from({ length: rows }, () =>
      Array(cols).fill(null)
    );

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");

    this.canvas.width =
      cols * (pixelSize + pixelGap) + pixelGap;
    this.canvas.height =
      rows * (pixelSize + pixelGap) + pixelGap;

    /* ---- batching state ---- */
    this._dirty = false;
    this._rafId = null;

    this.requestDraw();
  }

  mount(parent) {
  const wrapper = document.createElement("div");
  wrapper.className = "lcd-wrapper";

  wrapper.appendChild(this.canvas);
  parent.appendChild(wrapper);
    if (this.nl) {
      const br = document.createElement('div');
      br.className = 'break';
      parent.appendChild(br);
    }
}

  /* =========================
     UPDATE METHODS (NO DRAW)
  ========================= */

  setRow(rowIndex, bitString) {
    if (!this.pixels[rowIndex]) return;
    if (bitString.length !== this.cols) return;

    for (let c = 0; c < this.cols; c++) {
      this.pixels[rowIndex][c] = bitString[c] === "1" ? 1 : 0;
    }
    this.requestDraw();
  }

  setRows(rowMap) {
    let changed = false;
    for (const row in rowMap) {
      if (!this.pixels[row]) continue;
      const bits = rowMap[row];
    //  if (bits.length !== this.cols) continue;

      for (let c = 0; c < Math.min(this.cols, bits.length); c++) {
        this.pixels[row][c] = bits[c] === "1" ? 1 : 0;
      }
      changed = true;
    }
    if (changed) this.requestDraw();
  }
  
  setRect(topCol, topRow, rectMap, write0 = 1, color = null) {
//    console.log(topCol +','+ topRow, rectMap);
   // topCol = parseInt(topCol, 10);
    // topRow = parseInt(topRow, 10);
let changed = false;
// Use provided color, or currentColor, or null (which means use pixelOnColor)
const pixelColor = color !== null ? color : this.currentColor;

for (const row in rectMap) {
  const r = parseInt(row, 10);
  const bits = rectMap[row];
  
  // Calculate the actual row index
  const actualRow = topRow + r;
  
  // Check if row is within bounds
  if(actualRow < 0 || actualRow >= this.rows) {
    continue;
  }
  
  // Check if the row exists in pixels array
  if (!this.pixels[actualRow]) {
    continue;
  }
  
  for (let c = 0; c < Math.min(this.cols, bits.length); c++) {
    // Calculate the actual column index
    const actualCol = topCol + c;
    
    // Check if column is within bounds
    if(actualCol < 0 || actualCol >= this.cols) {
      continue;
    }
    
    // Set the pixel value
    const pixelValue = bits[c] === "1" ? 1 : 0;
    if(pixelValue || (write0 && !pixelValue)) {
      this.pixels[actualRow][actualCol] = pixelValue;
    }
    
    // If pixel is set to 1 and we have a color, store it
    if(pixelValue === 1 && pixelColor !== null){
      this.pixelColors[actualRow][actualCol] = pixelColor;
    } else if(pixelValue === 0 && write0) {
      // When clearing a pixel, also clear its color
      this.pixelColors[actualRow][actualCol] = null;
    }
    
    changed = true;
  }
}
if (changed) this.requestDraw();

  }
  
  setCurrentColor(color) {
    // Set the current RGB color for new pixels
    // color can be null to reset to default pixelOnColor
    this.currentColor = color;
  }

  clear() {
    this.pixels.forEach(row => row.fill(0));
    // Clear all pixel colors
    this.pixelColors.forEach(row => row.fill(null));
    this.requestDraw();
  }

  /* =========================
     BATCHED DRAW
  ========================= */

  requestDraw() {
    if (this._dirty) return;

    this._dirty = true;
    this._rafId = requestAnimationFrame(() => {
      this._dirty = false;
      this.draw();
    });
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.pixels[r][c]) continue;

        const x =
          this.pixelGap + c * (this.pixelSize + this.pixelGap);
        const y =
          this.pixelGap + r * (this.pixelSize + this.pixelGap);

        // Determine the color for this pixel
        // Use stored pixel color if available, otherwise use default pixelOnColor
        const pixelColor = this.pixelColors[r][c] || this.pixelOnColor;

        if (this.glow) {
          ctx.shadowColor = pixelColor;
          ctx.shadowBlur = this.pixelSize * 0.8;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = pixelColor;
        ctx.beginPath();
        if(this.round) {
        ctx.roundRect(
          x,
          y,
          this.pixelSize,
          this.pixelSize,
          this.pixelSize * 0.3
        );
        } else {
          ctx.rect(
            x,y,
            this.pixelSize,
            this.pixelSize,
            this.pixelSize * 0.3
          )
        }
        ctx.fill();
      }
    }

    ctx.shadowBlur = 0;
  }

  //HD44780
   loadEuropeanFont() {
       const HD44780_EUROPEAN_CGROM_BASE64 =
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\
AAAAAAAEBAQEBAQAEAAEAAAAAAAAKgoKCgoAAAAAAAAKgoKfgoKfgoKCgoA\
BA8UCg4FHgQAGBkCBASIEwMAGBkSBQ8UCg4MAAkSBQ0UCQ0JAAQEBBAgAAAA\
AgQICgQICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI\
ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI";

    const binary = atob(HD44780_EUROPEAN_CGROM_BASE64);
    const font = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      font[i] = binary.charCodeAt(i);
    }

    return font; // 2048 bytes
  }

  getFont() {
      return this.font;
  }

  getCharBitsString(charCode) {
    if (charCode < 0 || charCode > 255) {
      throw new RangeError("Expect charCode between 0 and 255");
    }
//console.log(charCode);

   

    
    let result = "";

    const base =  charCode << 3; // charCode * 8

    for (let row = 0; row < 8; row++) {
      //console.log(base + row);
      const rowByte = this.font[base + row] & 0x1F; // folosim doar 5 biți

      // extragem bitii 4 → 0 (stânga → dreapta)
      for (let bit = 4; bit >= 0; bit--) {
        result += (rowByte >> bit) & 1 ? "1" : "0";
      }
    }

    return result;
  }


  loadByTyingFonts() {
    const fonts = {
      fontUs: [
        [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [],
        [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [],
        [],
        [4, 4, 4, 4, 0, 0, 4], // !
        [10, 10, 10], // "
        [10, 10, 31, 10, 31, 10, 10], // #
        [4, 15, 20, 14, 5, 30, 4], // $
        [24, 25, 2, 4, 8, 19, 3], // %
        [12, 18, 20, 8, 21, 18, 13], // &
        [12, 4, 8], // '
        [2, 4, 8, 8, 8, 4, 2], // (
        [8, 4, 2, 2, 2, 4, 8], // )
        [0, 4, 21, 14, 21, 4], // *
        [0, 4, 4, 31, 4, 4], // +
        [0, 0, 0, 0, 12, 4, 8], // ,
        [0, 0, 0, 31], // -
        [0, 0, 0, 0, 0, 12, 12], // .
        [0, 1, 2, 4, 8, 16], // /
        [14, 17, 19, 21, 25, 17, 14], // 0
        [4, 12, 4, 4, 4, 4, 14], // 1
        [14, 17, 1, 2, 4, 8, 31], // 2
        [31, 2, 4, 2, 1, 17, 14], // 3
        [2, 6, 10, 18, 31, 2, 2], // 4
        [31, 16, 30, 1, 1, 17, 14], // 5
        [6, 8, 16, 30, 17, 17, 14], // 6
        [31, 1, 2, 4, 8, 8, 8], // 7
        [14, 17, 17, 14, 17, 17, 14], // 8
        [14, 17, 17, 15, 1, 2, 12], // 9
        [0, 12, 12, 0, 12, 12], // :
        [0, 12, 12, 0, 12, 4, 8], // ;
        [2, 4, 8, 16, 8, 4, 2], // <
        [0, 0, 31, 0, 31], // =
        [8, 4, 2, 1, 2, 4, 8], // >
        [14, 17, 1, 2, 4, 0, 4], // ?
        [14, 17, 1, 13, 21, 21, 14], // @
        [14, 17, 17, 31, 17, 17, 17], // A
        [30, 17, 17, 30, 17, 17, 30], // B
        [14, 17, 16, 16, 16, 17, 14], // C
        [28, 18, 17, 17, 17, 18, 28], // D
        [31, 16, 16, 30, 16, 16, 31], // E
        [31, 16, 16, 30, 16, 16, 16], // F
        [14, 17, 16, 23, 17, 17, 15], // G
        [17, 17, 17, 31, 17, 17, 17], // H
        [14, 4, 4, 4, 4, 4, 14], // I
        [14, 2, 2, 2, 2, 18, 12], // J
        [17, 18, 20, 24, 20, 18, 17], // K
        [16, 16, 16, 16, 16, 16, 31], // L
        [17, 27, 21, 21, 17, 17, 17], // M
        [17, 17, 25, 21, 19, 17, 17], // N
        [14, 17, 17, 17, 17, 17, 14], // O
        [30, 17, 17, 30, 16, 16, 16], // P
        [14, 17, 17, 17, 21, 18, 13], // Q
        [30, 17, 17, 30, 20, 18, 17], // R
        [15, 16, 16, 14, 1, 1, 30], // S
        [31, 4, 4, 4, 4, 4, 4], // T
        [17, 17, 17, 17, 17, 17, 14], // U
        [17, 17, 17, 17, 17, 10, 4], // V
        [17, 17, 17, 21, 21, 21, 10], // W
        [17, 17, 10, 4, 10, 17, 17], // X
        [17, 17, 17, 10, 4, 4, 4], // Y
        [31, 1, 2, 4, 8, 16, 31], // Z
        [14, 8, 8, 8, 8, 8, 14], // [
        [17, 10, 31, 4, 31, 4, 4], // Yen
        [14, 2, 2, 2, 2, 2, 14], // ]
        [4, 10, 17], // ^
        [0, 0, 0, 0, 0, 0, 31], // _
        [8, 4, 2], // `
        [0, 0, 14, 1, 15, 17, 15], // a
        [16, 16, 22, 25, 17, 17, 30], // b
        [0, 0, 14, 16, 16, 17, 14], // c
        [1, 1, 13, 19, 17, 17, 15], // d
        [0, 0, 14, 17, 31, 16, 14], // e
        [6, 9, 8, 28, 8, 8, 8], // f
        [0, 15, 17, 17, 15, 1, 14], // g
        [16, 16, 22, 25, 17, 17, 17], // h
        [4, 0, 12, 4, 4, 4, 14], // i
        [2, 0, 6, 2, 2, 18, 12], // j
        [16, 16, 18, 20, 24, 20, 18], // k
        [12, 4, 4, 4, 4, 4, 31], // l
        [0, 0, 26, 21, 21, 17, 17], // m
        [0, 0, 22, 25, 17, 17, 17], // n
        [0, 0, 14, 17, 17, 17, 14], // o
        [0, 0, 30, 17, 30, 16, 16], // p
        [0, 0, 13, 19, 15, 1, 1], // q
        [0, 0, 22, 25, 16, 16, 16], // r
        [0, 0, 14, 16, 14, 1, 30], // s
        [8, 8, 28, 8, 8, 9, 6], // t
        [0, 0, 17, 17, 17, 19, 13], // u
        [0, 0, 17, 17, 17, 10, 4], // v
        [0, 0, 17, 17, 21, 21, 10], // w
        [0, 0, 17, 10, 4, 10, 17], // x
        [0, 0, 17, 17, 15, 1, 14], // y
        [0, 0, 31, 2, 4, 8, 31], // z
        [2, 4, 4, 8, 4, 4, 2], // {
        [4, 4, 4, 4, 4, 4, 4], // |
        [8, 4, 4, 2, 4, 4, 8], // }
        [0, 4, 2, 31, 2, 4], // ->
        [0, 4, 8, 31, 8, 4], // <-
        [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [],
        [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [],
        [],
        [0, 0, 0, 0, 28, 20, 28],
        [7, 4, 4, 4],
        [0, 0, 0, 4, 4, 4, 28],
        [0, 0, 0, 0, 16, 8, 4],
        [0, 0, 0, 12, 12],
        [0, 31, 1, 31, 1, 2, 4],
        [0, 0, 31, 1, 6, 4, 8],
        [0, 0, 2, 4, 12, 20, 4],
        [0, 0, 4, 31, 17, 1, 14],
        [0, 0, 0, 31, 4, 4, 31],
        [0, 0, 2, 31, 6, 10, 18],
        [0, 0, 8, 31, 9, 10, 8],
        [0, 0, 0, 14, 2, 2, 31],
        [0, 0, 30, 2, 30, 2, 30],
        [0, 0, 0, 21, 21, 1, 6],

        [0, 0, 0, 31],
        [31, 1, 5, 6, 4, 4, 8],
        [1, 2, 4, 12, 20, 4, 4],
        [4, 31, 17, 17, 1, 2, 4],
        [0, 31, 4, 4, 4, 4, 31],
        [2, 31, 2, 6, 10, 18, 2],
        [8, 31, 9, 9, 9, 9, 18],
        [4, 31, 4, 31, 4, 4, 4],
        [0, 15, 9, 17, 1, 2, 12],
        [8, 15, 18, 2, 2, 2, 4],
        [0, 31, 1, 1, 1, 1, 31],
        [10, 31, 10, 10, 2, 4, 8],
        [0, 24, 1, 25, 1, 2, 28],
        [0, 31, 1, 2, 4, 10, 17],
        [8, 31, 9, 10, 8, 8, 7],
        [0, 17, 17, 9, 1, 2, 12],

        [0, 15, 9, 21, 3, 2, 12],
        [2, 28, 4, 31, 4, 4, 8],
        [0, 21, 21, 21, 1, 2, 4],
        [14, 0, 31, 4, 4, 4, 8],
        [8, 8, 8, 12, 10, 8, 8],
        [4, 4, 31, 4, 4, 8, 16],
        [0, 14, 0, 0, 0, 0, 31],
        [0, 31, 1, 10, 4, 10, 16],
        [4, 31, 2, 4, 14, 21, 4],
        [2, 2, 2, 2, 2, 4, 8],
        [0, 4, 2, 17, 17, 17, 17],
        [16, 16, 31, 16, 16, 16, 15],
        [0, 31, 1, 1, 1, 2, 12],
        [0, 8, 20, 2, 1, 1],
        [4, 31, 4, 4, 21, 21, 4],
        [0, 31, 1, 1, 10, 4, 2],

        [0, 14, 0, 14, 0, 14, 1],
        [0, 4, 8, 16, 17, 31, 1],
        [0, 1, 1, 10, 4, 10, 16],
        [0, 31, 8, 31, 8, 8, 7],
        [8, 8, 31, 9, 10, 8, 8],
        [0, 14, 2, 2, 2, 2, 31],
        [0, 31, 1, 31, 1, 1, 31],
        [14, 0, 31, 1, 1, 2, 4],
        [18, 18, 18, 18, 2, 4, 8],
        [0, 4, 20, 20, 21, 21, 22],
        [0, 16, 16, 17, 18, 20, 24],
        [0, 31, 17, 17, 17, 17, 31],
        [0, 31, 17, 17, 1, 2, 4],
        [0, 24, 0, 1, 1, 2, 28],
        [4, 18, 8],
        [28, 20, 28],

        [0, 0, 9, 21, 18, 18, 13], // alpha
        [10, 0, 14, 1, 15, 17, 15], // a:
        [0, 0, 14, 17, 30, 17, 30, 16, 16, 16], // beta
        [0, 0, 14, 16, 12, 17, 14], // epsilon
        [0,0, 17, 17, 17, 19, 29, 16, 16, 16], // mu
        [0, 0, 15, 20, 18, 17, 14], // sigma
        [0, 0, 6, 9, 17, 17, 30, 16, 16, 16], // ro
        [0, 0, 15, 17, 17, 17, 15, 1, 1, 14], // g
        [0, 0, 7, 4, 4, 20, 8], // sq root
        [0, 2, 26, 2], // -1
        [2, 0, 6, 2, 2, 2, 2, 2, 18, 12], // j
        [0, 20, 8, 20], // x
        [0, 4, 14, 20, 21, 14, 4], // cent
        [8, 8, 28, 8, 28, 8, 15], // poud
        [14, 0, 22, 25, 17, 17, 17], // n~
        [10, 0, 14, 17, 17, 17, 14], // o:
        [0, 0, 22, 25, 17, 17, 30, 16, 16, 16], // p
        [0, 0, 13, 19, 17, 17, 15, 1, 1, 1], // q
        [0, 14, 17, 31, 17, 17, 14], // theta
        [0, 0, 0, 11, 21, 26], // inf
        [0, 0, 14, 17, 17, 10, 27], // Omega
        [10, 0, 17, 17, 17, 19, 13], // u:
        [31, 16, 8, 4, 8, 16, 31], // Sigma
        [0, 0, 31, 10, 10, 10, 19], // pi
        [31, 0, 17, 10, 4, 10, 17], // x-
        [0, 0, 17, 17, 17, 17, 15, 1, 1, 14], // y
        [0, 1, 30, 4, 31, 4, 4],
        [0, 0, 31, 8, 15, 9, 17],
        [0, 0, 31, 21, 31, 17, 17], // yen
        [0, 0, 4, 0, 31, 0, 4], // :-
        [],
        [31, 31, 31, 31, 31, 31, 31, 31, 31, 31]
      ],

          fontEu: [
      [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [],
      [0, 8, 12, 14, 15, 14, 12, 8], // |>
      [0, 2, 6, 14, 30, 14, 6, 2], // <|
      [0, 9, 18, 27], // ``
      [0, 27, 9, 18], // ''
      [0, 4, 14, 31, 0, 4, 14, 31],
      [0, 31, 14, 4, 0, 31, 14, 4],
      [0, 0, 14, 31, 31, 31, 14],
      [0, 1, 1, 5, 9, 31, 8, 4], // return
      [0, 4, 14, 21, 4, 4, 4, 4], // up
      [0, 4, 4, 4, 4, 21, 14, 4], // down
      [0, 0, 4, 2, 31, 2, 4], // ->
      [0, 0, 4, 8, 31, 8, 4], // <-
      [0, 2, 4, 8, 4, 2, 0, 31], // <=
      [0, 8, 4, 2, 4, 8, 0, 31], // >=
      [0, 0, 4, 4, 14, 14, 31],
      [0, 0, 31, 14, 14, 4, 4],
      [],
      [0, 4, 4, 4, 4, 0, 0, 4], // !
      [0, 10, 10, 10], // "
      [0, 10, 10, 31, 10, 31, 10, 10], // #
      [0, 4, 15, 20, 14, 5, 30, 4], // $
      [0, 24, 25, 2, 4, 8, 19, 3], // %
      [0, 12, 18, 20, 8, 21, 18, 13], // &
      [0, 12, 4, 8], // '
      [0, 2, 4, 8, 8, 8, 4, 2], // (
      [0, 8, 4, 2, 2, 2, 4, 8], // )
      [0, 0, 4, 21, 14, 21, 4], // *
      [0, 0, 4, 4, 31, 4, 4], // +
      [0, 0, 0, 0, 0, 12, 4, 8], // ,
      [0, 0, 0, 0, 31], // -
      [0, 0, 0, 0, 0, 0, 12, 12], // .
      [0, 0, 1, 2, 4, 8, 16], // /
      [0, 14, 17, 19, 21, 25, 17, 14], // 0
      [0, 4, 12, 4, 4, 4, 4, 14], // 1
      [0, 14, 17, 1, 2, 4, 8, 31], // 2
      [0, 31, 2, 4, 2, 1, 17, 14], // 3
      [0, 2, 6, 10, 18, 31, 2, 2], // 4
      [0, 31, 16, 30, 1, 1, 17, 14], // 5
      [0, 6, 8, 16, 30, 17, 17, 14], // 6
      [0, 31, 1, 2, 4, 8, 8, 8], // 7
      [0, 14, 17, 17, 14, 17, 17, 14], // 8
      [0, 14, 17, 17, 15, 1, 2, 12], // 9
      [0, 0, 12, 12, 0, 12, 12], // :
      [0, 0, 12, 12, 0, 12, 4, 8], // ;
      [0, 2, 4, 8, 16, 8, 4, 2], // <
      [0, 0, 0, 31, 0, 31], // =
      [0, 8, 4, 2, 1, 2, 4, 8], // >
      [0, 14, 17, 1, 2, 4, 0, 4], // ?
      [0, 14, 17, 1, 13, 21, 21, 14], // @
      [0, 4, 10, 17, 17, 31, 17, 17], // A
      [0, 30, 17, 17, 30, 17, 17, 30], // B
      [0, 14, 17, 16, 16, 16, 17, 14], // C
      [0, 28, 18, 17, 17, 17, 18, 28], // D
      [0, 31, 16, 16, 30, 16, 16, 31], // E
      [0, 31, 16, 16, 30, 16, 16, 16], // F
      [0, 14, 17, 16, 23, 17, 17, 15], // G
      [0, 17, 17, 17, 31, 17, 17, 17], // H
      [0, 14, 4, 4, 4, 4, 4, 14], // I
      [0, 14, 2, 2, 2, 2, 18, 12], // J
      [0, 17, 18, 20, 24, 20, 18, 17], // K
      [0, 16, 16, 16, 16, 16, 16, 31], // L
      [0, 17, 27, 21, 21, 17, 17, 17], // M
      [0, 17, 17, 25, 21, 19, 17, 17], // N
      [0, 14, 17, 17, 17, 17, 17, 14], // O
      [0, 30, 17, 17, 30, 16, 16, 16], // P
      [0, 14, 17, 17, 17, 21, 18, 13], // Q
      [0, 30, 17, 17, 30, 20, 18, 17], // R
      [0, 15, 16, 16, 14, 1, 1, 30], // S
      [0, 31, 4, 4, 4, 4, 4, 4], // T
      [0, 17, 17, 17, 17, 17, 17, 14], // U
      [0, 17, 17, 17, 17, 17, 10, 4], // V
      [0, 17, 17, 17, 21, 21, 21, 10], // W
      [0, 17, 17, 10, 4, 10, 17, 17], // X
      [0, 17, 17, 17, 10, 4, 4, 4], // Y
      [0, 31, 1, 2, 4, 8, 16, 31], // Z
      [0, 14, 8, 8, 8, 8, 8, 14], // [
      [0, 0, 16, 8, 4, 2, 1], // \
      [0, 14, 2, 2, 2, 2, 2, 14], // ]
      [0, 4, 10, 17], // ^
      [0, 0, 0, 0, 0, 0, 0, 31], // _
      [0, 8, 4, 2], // `
      [0, 0, 0, 14, 1, 15, 17, 15], // a
      [0, 16, 16, 22, 25, 17, 17, 30], // b
      [0, 0, 0, 14, 16, 16, 17, 14], // c
      [0, 1, 1, 13, 19, 17, 17, 15], // d
      [0, 0, 0, 14, 17, 31, 16, 14], // e
      [0, 6, 9, 8, 28, 8, 8, 8], // f
      [0, 0, 15, 17, 17, 15, 1, 14], // g
      [0, 16, 16, 22, 25, 17, 17, 17], // h
      [0, 4, 0, 4, 12, 4, 4, 14], // i
      [0, 2, 0, 6, 2, 2, 18, 12], // j
      [0, 16, 16, 18, 20, 24, 20, 18], // k
      [0, 12, 4, 4, 4, 4, 4, 31], // l
      [0, 0, 0, 26, 21, 21, 17, 17], // m
      [0, 0, 0, 22, 25, 17, 17, 17], // n
      [0, 0, 0, 14, 17, 17, 17, 14], // o
      [0, 0, 0, 30, 17, 30, 16, 16], // p
      [0, 0, 0, 13, 19, 15, 1, 1], // q
      [0, 0, 0, 22, 25, 16, 16, 16], // r
      [0, 0, 0, 14, 16, 14, 1, 30], // s
      [0, 8, 8, 28, 8, 8, 9, 6], // t
      [0, 0, 0, 17, 17, 17, 19, 13], // u
      [0, 0, 0, 17, 17, 17, 10, 4], // v
      [0, 0, 0, 17, 17, 21, 21, 10], // w
      [0, 0, 0, 17, 10, 4, 10, 17], // x
      [0, 0, 0, 17, 17, 15, 1, 14], // y
      [0, 0, 0, 31, 2, 4, 8, 31], // z
      [0, 2, 4, 4, 8, 4, 4, 2], // {
      [0, 4, 4, 4, 4, 4, 4, 4], // |
      [0, 8, 4, 4, 2, 4, 4, 8], // }
      [0, 0, 0, 0, 13, 18], // ~
      [0, 4, 10, 17, 17, 17, 31], // del

      [0, 31, 17, 16, 30, 17, 17, 30], // .B
      [15, 5, 5, 9, 17, 31, 17, 17], // .D
      [0, 21, 21, 21, 14, 21, 21, 21], // .Zh
      [0, 30, 1, 1, 6, 1, 1, 30], // .Z
      [0, 17, 17, 19, 21, 25, 17, 17], // .I
      [10, 4, 17, 19, 21, 25, 17, 17], // .J
      [0, 15, 5, 5, 5, 5, 21, 9], // .L
      [0, 31, 17, 17, 17, 17, 17, 17], // .P
      [0, 17, 17, 17, 10, 4, 8, 16], // .U
      [0, 17, 17, 17, 17, 17, 31, 1], // .Ts
      [0, 17, 17, 17, 15, 1, 1, 1], // .Ch
      [0, 0, 21, 21, 21, 21, 21, 31], // .Sh
      [0, 21, 21, 21, 21, 21, 31, 1], // .Sch
      [0, 24, 8, 8, 14, 9, 9, 14], // .'
      [0, 17, 17, 17, 25, 21, 21, 25], // .Y
      [0, 14, 17, 5, 11, 1, 17, 14], // .E
      [0, 0, 0, 9, 21, 18, 18, 13], // alpha
      [0, 4, 6, 5, 5, 4, 28, 28], // note
      [0, 31, 17, 16, 16, 16, 16, 16], // .G
      [0, 0, 0, 31, 10, 10, 10, 19], // pi
      [0, 31, 16, 8, 4, 8, 16, 31], // Sigma
      [0, 0, 0, 15, 18, 18, 18, 12], // sigma
      [6, 5, 7, 5, 5, 29, 27, 3], // notes
      [0, 0, 1, 14, 20, 4, 4, 2], // tau
      [0, 4, 14, 14, 14, 31, 4], // bell
      [0, 14, 17, 17, 31, 17, 17, 14], // Theta
      [0, 0, 14, 17, 17, 17, 10, 27], // Omega
      [0, 6, 9, 4, 10, 17, 17, 14], // delta
      [0, 0, 0, 11, 21, 26], // inf
      [0, 0, 10, 31, 31, 31, 14, 4], // heart
      [0, 0, 0, 14, 16, 12, 17, 14], // epsilon
      [0, 14, 17, 17, 17, 17, 17, 17],
      [0, 27, 27, 27, 27, 27, 27, 27],
      [0, 4, 0, 0, 4, 4, 4, 4], // !!
      [0, 4, 14, 20, 20, 21, 14, 4], // cent
      [0, 6, 8, 8, 28, 8, 9, 22], // pound
      [0, 0, 17, 14, 10, 14, 17], // money
      [0, 17, 10, 31, 4, 31, 4, 4], // yen
      [0, 4, 4, 4, 0, 4, 4, 4], // pipe
      [0, 6, 9, 4, 10, 4, 18, 12], // paragraph
      [0, 2, 5, 4, 31, 4, 20, 8], // f
      [0, 31, 17, 21, 23, 21, 17, 31], // (C)
      [0, 14, 1, 15, 17, 15, 0, 31], // a_
      [0, 0, 5, 10, 20, 10, 5], // <<
      [0, 18, 21, 21, 29, 21, 21, 18], // .Ju
      [0, 15, 17, 17, 15, 5, 9, 17], // .Ja
      [0, 31, 17, 21, 17, 19, 21, 31], // (R)
      [0, 4, 8, 12], // `
      [12, 18, 18, 18, 12], // 0
      [0, 4, 4, 31, 4, 4, 0, 31], // +-
      [12, 18, 4, 8, 30], // 2
      [28, 2, 12, 2, 28], // 3
      [28, 18, 28, 16, 18, 23, 18, 3], // Pt
      [0, 17, 17, 17, 19, 29, 16, 16], // mu
      [0, 15, 19, 19, 15, 3, 3, 3], // pilcrow
      [0, 0, 0, 0, 12, 12], // dot
      [0, 0, 0, 10, 17, 21, 21, 10], // omega
      [8, 24, 8, 8, 28], // 1
      [0, 14, 17, 17, 17, 14, 0, 31], // o_
      [0, 0, 20, 10, 5, 10, 20], // >>
      [17, 18, 20, 10, 22, 10, 15, 2], // 1/4
      [17, 18, 20, 10, 21, 1, 2, 7], // 1/2
      [24, 8, 24, 9, 27, 5, 7, 1], // 3/4
      [0, 4, 0, 4, 8, 16, 17, 14], // !?
      [8, 4, 4, 10, 17, 31, 17, 17], // A\
      [2, 4, 4, 10, 17, 31, 17, 17], // A/
      [4, 10, 0, 14, 17, 31, 17, 17], // A^
      [13, 18, 0, 14, 17, 31, 17, 17], // A~
      [10, 0, 4, 10, 17, 31, 17, 17], // A:
      [4, 10, 4, 10, 17, 31, 17, 17], // Ao
      [0, 7, 12, 20, 23, 28, 20, 23], // AE
      [14, 17, 16, 16, 17, 14, 2, 6], // C,
      [8, 4, 0, 31, 16, 30, 16, 31], // E\
      [2, 4, 0, 31, 16, 30, 16, 31], // E/
      [4, 10, 0, 31, 16, 30, 16, 31], // E^
      [0, 10, 0, 31, 16, 30, 16, 31], // E:
      [8, 4, 0, 14, 4, 4, 4, 14], // I\
      [2, 4, 0, 14, 4, 4, 4, 14], // I/
      [4, 10, 0, 14, 4, 4, 4, 14], // I^
      [0, 10, 0, 14, 4, 4, 4, 14], // I:
      [0, 14, 9, 9, 29, 9, 9, 14], // -D
      [13, 18, 0, 17, 25, 21, 19, 17], // N~
      [8, 4, 14, 17, 17, 17, 17, 14], // O\
      [2, 4, 14, 17, 17, 17, 17, 14], // O/
      [4, 10, 0, 14, 17, 17, 17, 14], // O^
      [13, 18, 0, 14, 17, 17, 17, 14], // O~
      [10, 0, 14, 17, 17, 17, 17, 14], // O:
      [0, 0, 17, 10, 4, 10, 17], // X
      [0, 14, 4, 14, 21, 14, 4, 14], // .F
      [8, 4, 17, 17, 17, 17, 17, 14], // U\
      [2, 4, 17, 17, 17, 17, 17, 14], // U/
      [4, 10, 0, 17, 17, 17, 17, 14], // U^
      [10, 0, 17, 17, 17, 17, 17, 14], // U:
      [2, 4, 17, 10, 4, 4, 4, 4], // Y/
      [24, 8, 14, 9, 9, 14, 8, 28], // -P
      [0, 6, 9, 9, 14, 9, 9, 22], // beta
      [8, 4, 0, 14, 1, 15, 17, 15], // a\
      [2, 4, 0, 14, 1, 15, 17, 15], // a/
      [4, 10, 0, 14, 1, 15, 17, 15], // a^
      [13, 18, 0, 14, 1, 15, 17, 15], // a~
      [0, 10, 0, 14, 1, 15, 17, 15], // a:
      [4, 10, 4, 14, 1, 15, 17, 15], // ao
      [0, 0, 26, 5, 15, 20, 21, 10], // ae
      [0, 0, 14, 16, 17, 14, 4, 12], // c,
      [8, 4, 0, 14, 17, 31, 16, 14], // e\
      [2, 4, 0, 14, 17, 31, 16, 14], // e/
      [4, 10, 0, 14, 17, 31, 16, 14], // e^
      [0, 10, 0, 14, 17, 31, 16, 14], // e:
      [8, 4, 0, 4, 12, 4, 4, 14], // i\
      [2, 4, 0, 4, 12, 4, 4, 14], // i/
      [4, 10, 0, 4, 12, 4, 4, 14], // i^
      [0, 10, 0, 4, 12, 4, 4, 14], // i:
      [0, 20, 8, 20, 2, 15, 17, 14], // -d
      [13, 18, 0, 22, 25, 17, 17, 17], // n~
      [8, 4, 0, 14, 17, 17, 17, 14], // o\
      [2, 4, 0, 14, 17, 17, 17, 14], // o/
      [0, 4, 10, 0, 14, 17, 17, 14], // o^
      [0, 13, 18, 0, 14, 17, 17, 14], // o~
      [0, 10, 0, 14, 17, 17, 17, 14], // o:
      [0, 0, 4, 0, 31, 0, 4], // :/
      [0, 2, 4, 14, 21, 14, 4, 8], // .f
      [8, 4, 0, 17, 17, 17, 19, 13], // u\
      [2, 4, 0, 17, 17, 17, 19, 13], // u/
      [4, 10, 0, 17, 17, 17, 19, 13], // u^
      [0, 10, 0, 17, 17, 17, 19, 13], // u:
      [2, 4, 0, 17, 17, 15, 1, 14], // y/
      [0, 12, 4, 6, 5, 6, 4, 14], // p-
      [0, 10, 0, 17, 17, 15, 1, 14] // y:
    ]

    };

    return fonts;
  }
  
  tryRowsToColumns(rows) {
  const columns = new Uint8Array(5);

  for (let row = 0; row < 8; row++) {
    const rowValue = row < rows.length ? rows[row] & 0xFF : 0;

    for (let col = 0; col < 5; col++) {
      const bit = (rowValue >> (4 - col)) & 1;
      columns[col] |= bit << row;
    }
  }

  return columns;
}

columnsToHexString(columns) {
  if (columns.length !== 5) {
    throw new Error("Expected exactly 5 columns");
  }

  let hex = "";

  for (let i = 0; i < 5; i++) {
    const byte = columns[i];
    hex += byte.toString(16).padStart(2, "0");
  }

  return hex.toUpperCase();
}

tryGetEnglishFontHex() {
    this.fontEnglishHexString = "";
    let cFont = this.loadByTyingFonts().fontUs;
    for(const i in cFont) { 
      this.fontEnglishHexString += this.columnsToHexString(
        this.tryRowsToColumns(cFont[i])
      );
    }
    return this.fontEnglishHexString;
}

  loadEnglishFont() {
      
      this.fontEnglishHexString =  "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004F00000007000700147F147F14242A7F2A12231308646236495522500005030000001C2241000041221C0014083E081408083E080800503000000808080808006060000020100804023E5149453E00427F400042615149462141454B311814127F1027454545393C4A49493001710905033649494936064949291E003636000000563600000814224100141414141400412214080201510906324979413E7E0909097E7F494949363E414141227F4141221C7F494949417F090909013E4149497A7F0808087F00417F41002041413F007F081422417F404040407F020C027F7F0408107F3E4141413E7F090909063E4151215E7F09192946464949493101017F01013F4040403F1F2040201F3F4038403F631408146307087008076151494543007F41410015167C16150041417F0004020102044040404040000102040020545454787F484444383844444420384444487F3854545418087E0901020C5252523E7F0804047800447D40002040443D007F1028440040417F40407C041804787C0804047838444444387C14141408081414187C7C080404084854545420043F4440203C4040207C1C2040201C3C4030403C44281028440C5050503C4464544C44000836410000007F0000004136080008082A1C08081C2A0808000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000705070000000000F01014040780000102040000000181800000A0A4A2A1E044434140C201078040018484C483848487848484828187C08087C08281840484878405454547C001800584038080808080801413D090710087C02010E0243221E42427E424222120A7F02423F02423E0A0A7F0A0A084642221E0403423E02424242427E024F221F024A4A40201C4222122A46023F424A46064840201E08464A321E0A4A3E09080E004E201E04453D0504007F08100044241F04044042424240422A122A0622127B16220040201F0078000204783F44444444024242221E040204083032027F0232021222520E002A2A2A40382422207040281028060A3E4A4A4A047F04140C4042427E404A4A4A4A7E040545251C0F40201F007C007E40307E402010087E4242427E0E0242221E424240201802040102000705070000384448304C2055545578F8545454282854544420FC4040207C38444C5424F04844443838444444FC20403C04040404000E00000004FD000A040A000018247E2410147F5440407C090505783845444538FC4844443838444448FC3C4A4A4A3C302810281858640464583C4140217C6355494141443C047C4445291129453C404040FC14147C1412443C1414747C141C147C10105410100000000000FFFFFFFFFF";
      
    this.fontEuHexString = '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000FE7C381010387CFE000C0A000C0A0A06000A0688CCEECC882266EE6622387C7C7C382070A8203E0804FE04082040FE402010105438101038541010808894A28080A294888040707C7040041C7C1C04000000000000009E0000000E000E0028FE28FE284854FE5424462610C8C46C92AA44A0000A0600000038448200008244380028107C102810107C101000A0600000101010101000C0C0000040201008047CA2928A7C0084FE800084C2A2928C42828A9662302824FE204E8A8A8A72789492926002E2120A066C9292926C0C9292523C006C6C000000AC6C00001028448200282828282800824428100402A2120C6492F2827CF8242224F8FE9292926C7C82828244FE82824438FE92929282FE121212027C829292F4FE101010FE0082FE82004082827E00FE10284482FE80808080FE041804FEFE081020FE7C8282827CFE1212120C7C82A242BCFE1232528C8C929292620202FE02027E8080807E3E4080403E7E8070807EC6281028C60E10E0100EC2A2928A8600FE8282000408102040008282FE0008040204088080808080000204080040A8A8A8F0FE90888870708888884070888890FE70A8A8A83010FC12020418A4A4A47CFE100808F00090FA80004080887A00FE205088008082FE8080F8083008F0F8100808F07088888870F82828281010282830F8F81008081090A8A8A840087E88804078808040F838408040387880608078885020508818A0A0A07888C8A8988800106C82000000FE000000826C100020101020107844424478FE92929266F0292721FFEE10FE10EE828292926CFE201008FEFC211209FC40827E02FEFE020202FE8E5020100E7E404040FE0E101010FEFC80FC80FC7E407E40FE02FE909060FE906000FE44928A927C7088906098C0C0FE0418FE02020206887808F888C6AA928282708888780860603FC5FE1008788804203C7E3C207C9292927CB8C404C4B860948A92643028102818387CF87C3850A8A88840FC020202FCFEFE00FEFE0000F200003844FE4420907C92824044382838442A2CF82C2A0000EE00004094AA520450907C1214FE82BA92FE90AAAAAABC1028542844FE107C827C8C523212FEFE82CAA2FE000C0A00000E11110E008888BE888812191512001115150A007F0525F2A0FE2020103E0C1212FEFE00303000007088608870121F1000009CA2A2A29C4428542810176854FA41170894CAB1151F6050F860908A8040F0292628F0F0282629F0F02A292AF0F229292AF1F0292429F0F02A252AF0F824FE92921E21A1E112F8A9AAA888F8A8AAA988F8AAA9AA88F8AAA8AA880089FA88000088FA8900008AF98A00008AF88A0010FE92827CFA112142F978858684787884868578708A898A707289898A717885848578442810284410AAFEAA107C8182807C7C8082817C78828182787C8180817C0408F2090481FFA42418807C92926C40A9AAA8F040A8AAA9F040AAA9AAF042A9A9AAF140AAA8AAF040AAADAAF0649478945818A4E4241070A9AAA83070A8AAA93070AAA9AA3070AAA8AA300091FA80000090FA81000092F982000092F882004AA4AAB060FA11090AF170898A887070888A897060949294606492929462708A888A70101054101010A87C2A1078818240F878808241F878828142F878828042F818A0A2A1780082FEA81018A2A0A278';


    // 256 caractere * 8 rânduri
    this.font = new Uint8Array(256 * 8);

    // parcurgem TOATE codurile tale valide: X2–X7
    for (let charCode = 0x02; charCode <= 0xF7; charCode++) {
      const lo = charCode & 0x0F;
      //if (lo < 2 || lo > 7) continue;

      // 1️⃣ ia fontul tău pe coloane (5 bytes)
      const columns = this.getFontBytesForCharCode(charCode);
      if (!columns) continue;

      const base = charCode << 3; // charCode * 8

      // 2️⃣ construim cele 8 rânduri
      for (let row = 0; row < 8; row++) {
        let rowByte = 0;

        for (let col = 0; col < 5; col++) {
          const bit = (columns[col] >> row) & 1;
          rowByte |= bit << (4 - col); // stânga → dreapta
        }

        this.font[base + row] = rowByte;
      }
    }
  }

  getByteN(n) {
    return parseInt(
        this.fontEnglishHexString[2 * n] +
        this.fontEnglishHexString[2 * n + 1],
        16
    );
  }

  getFontBytesForCharCode(charCode) {
    const index = this.getFontIndexFromCharCode(charCode);
    if (index < 0) return null;

    const bytes = new Uint8Array(5);
    const base = index * 5;

    for (let col = 0; col < 5; col++) {
      bytes[col] = this.getByteN(base + col);
      bytes[col] &= 0xFF;
    }

    return bytes;
  }

  getFontIndexFromCharCode(code) {
    const hi = code >> 4;
    const lo = code & 0x0F;
    
    return code;

    //if (lo < 2 || lo > 7) return -1;
  //  return hi * 6 + (lo - 2);
  }

  pretty(bits) {
    for (let i = 0; i < bits.length; i += 5) {
      console.log(bits.slice(i, i + 5));
    }
  }
}
