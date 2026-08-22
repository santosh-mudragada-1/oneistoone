/**
 * The hands, as ASCII.
 *
 * These are the traced contours in `Left hand.txt` / `Right hand.txt`, cropped
 * to their content and with the crop-edge artefacts removed — the source files
 * close the arm outline along the image border, which renders as a stray
 * vertical bar where the arm should simply run off the frame.
 *
 * The art is the render: the characters below are drawn exactly as they were
 * authored, never resampled or re-rasterised. That is the whole reason this
 * holds up at any size where the previous procedural rig fell apart.
 *
 * The .txt files remain the source of truth. If you edit them, regenerate
 * this file — the geometry below (tip, bbox, reveal order) is derived.
 */

/** Character advance over line height. Standard monospace; the art was
 *  authored against it, and any other ratio distorts the hand. */
export const ASPECT = 0.55;

/* Light to dark. Only used for weight — the glyphs themselves are whatever
   the artwork says. */
const INK: Record<string, number> = {
  r: 1, n: 1, w: 2, '1': 3, j: 4, e: 5, '6': 6, R: 7,
  N: 8, E: 8, I: 9, W: 9, '0': 10, A: 12,
};

export type HandArt = {
  cols: number;
  rows: number;
  /** One entry per distinct glyph. */
  glyphs: {
    ch: string;
    /** Weight 0..1, from the character's own density. */
    ink: number;
    /** Flat [col, row, …], sorted by `dist`. */
    cells: Int16Array;
    /** Distance of each cell from the fingertip, 0..1, ascending. */
    dist: Float32Array;
  }[];
  /** The reaching fingertip, in cells. */
  tipCol: number;
  tipRow: number;
};

/** Parses a block into glyph buckets ordered outward from the fingertip, so
 *  the entrance can grow the hand from the fingertip back into the arm. */
function parse(block: string, reach: 'right' | 'left'): HandArt {
  const lines = block.split('\n');
  const rows = lines.length;
  const cols = Math.max(...lines.map((l) => l.length));

  let tipCol = reach === 'right' ? -1 : cols;
  let tipRow = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < lines[y].length; x++) {
      if (lines[y][x] === ' ') continue;
      if (reach === 'right' ? x > tipCol : x < tipCol) {
        tipCol = x;
        tipRow = y;
      }
    }
  }

  const span = Math.max(1, reach === 'right' ? tipCol : cols - tipCol);
  const by = new Map<string, { col: number; row: number; d: number }[]>();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < lines[y].length; x++) {
      const ch = lines[y][x];
      if (ch === ' ') continue;
      const list = by.get(ch) ?? [];
      list.push({ col: x, row: y, d: Math.abs(x - tipCol) / span });
      by.set(ch, list);
    }
  }

  const glyphs = [...by.entries()].map(([ch, list]) => {
    list.sort((a, b) => a.d - b.d);
    const cells = new Int16Array(list.length * 2);
    const dist = new Float32Array(list.length);
    list.forEach((c, i) => {
      cells[i * 2] = c.col;
      cells[i * 2 + 1] = c.row;
      dist[i] = c.d;
    });
    return { ch, ink: (INK[ch] ?? 8) / 12, cells, dist };
  });

  return { cols, rows, glyphs, tipCol, tipRow };
}

const LEFT_ART = `
                                                     WAAAAAAAAAAA6
                                                 0AAAAAAAAAAAAAAAAAAAAAAAAAAIe
                                             0AAAAAAAIjn  w    weIAAAAAAAAAAAAAAAAAAAAA6
                                         WAAAAAAAE0                        w6EAAAAAAAAAAAAAAAAAAAAAIe
                                      WAAAAAAE0               w                      weIAAAAAAAAAAAAAAEe
                                eIAAAAAAAIjn       w    w       w       w w w w  w wwwwwww        w0EAAAIe
                          0EAAAAAAAAAAIjn         wwwwwwww       w             ww w      w wwwww      0EAAIe
                     eIAAAAAAAAAA6w        w w wwwwwwwwww w                                     w ww w  0EAAAE0
                 0EAAAAAAAE0            w w ww           w               w                       w wwwwwww0EAAAAIe
           WAAAAAAAAAA6w                                 www         w     w           w w ww          wwwww eIAAAAAE0
    6AAAAAAAAAAAAE0                                w       www         w     w www w w      wwwwwwww      wwwwww6EAAAAAE0
AAAAAAAAAAAIjn                               w w w         w  w                  wwwww   ww    wwwwwwww       wwww  0EAAA0
AAAAEeww                                 w w w             ww              w     wwwwww ww   wwwwwwwwwwwwww w    ww    eAA0
                                                           w                 w         ww   wwwwwwwwwwwwwwwwwww         0AA0
                                                         w010   w w           wwwww         ww   wwww wwwwwwwwwwww   w   0AAE0
                                                      w0IAAAA0       w          wwwww    01ew             wwwwwwww     w  0EAAe
                w w w w      w    w                wjIAAAAN1AA0  w    ww            www  IIAIe                wwwwwww   ww  eAAe
                       w    w w w                jjRAAANe   0AAE0www  w ww w    w    wwwwEN NEw       w          wwwwwww   w 0AAAW
             w   w www w ww    w               wjNAAA6       eIAAAAIew w w www w      www0EAIIr                    ww wwww   w0IAA
               w     w  w                    w6EAAAW           eIAAAAAAAE0  wwww        www0R6r      w010            w wwww    nIAAW
                                           wjEAAA6                 6AAAAAAAAAAE0 ww       wwwwwww     I6Iw              www   ww0IAAW
                                         wjNAARj                        0EAAAAAAAE6wwww w     wwwww  wAjAe                www  wwnwAAW
                                       eIAAAA6                                0EAAAAE0 www      wwwwwwIEIAe            weW6rwww   nwAAW
                                     0IAAAA6                                     eIAAAE0 w w       ww eAEI6w           wIEAE0 www  n0AI
                                  w0IAAI0                                           0EAAE0w www w    w 0IEe            wAARAAAIeww6EAAW
                               wjIAAAIe                                               eIAA0      ww   wwwwww            IAe0IAAAAAAAIe
                           weIAAAAANe                                                   eAE        w   w  w             0AN   6AAAIe
                        0IAAAAAAA6                                                       AA     e10w   w 0W6w           wAA
                     eIAAAAAA6                                                           EAI0 eIAAAAIej0EAAA1w     www   AA
                  0IAAAAIe                                                               0IAAAAAE1IAAAAAAE6AAE6r  eIAAAAAAE
               eIAAAAI0                                                                    0IAE0    WAAE0  eNAAAAAAAAAAAAE0
            eIAAAAIe                                                                                         jRAAAE0
         eIAAAAI0
      r6EAAAE0
   eIAAAAI0
IAAAAAARj
AAAE0
e`.slice(1);

export const LEFT = parse(LEFT_ART, 'right');

const RIGHT_ART = `
                                                                                                                                    0A
                                                                                                                               0EAAAAA
                                                                                                                          eIAAAAAAAAEe
                                                                                                                      eIAAAAAAAEe
                                                                                                                   0EAAAAAA0w
                                                                                                              eIAAAAAAE6w
                                                                                                 WAAAAAAAAAAAAAAAAAE0
                                                                                        0EAAAAAAAAAAAAAAAAAAAAA6w
                                                                                6AAAAAAAAAAAAAAAAIeeww
                                                                        eIAAAAAAAAAAAAAAE0
                                                               6AAAAAAAAAAAAAAAAEew
                                                       eIAAAAAAAAAAAAAAAA6w                    www
                                                 0EAAAAAAAAAAAAEew w                   ww wwwww   w
                                             0EAAAAAAAAA6w                   w wwwwwwwwwwwwww        w w                           w
                                      6AAAAAAAAAAE0                     wwwwwwwwwwwww  w                  w w w w w w w w w w w w w w
                 0AAAAAAAAAAAAAAAAAAAAAAAAAAAE0                          w w w       w                     w w w w w w w w w
           0EAAAAAAAAAAAAAAAAAAAAAAAAAEew                             w                       w w w w w ww w w w w
    0EAAAAAAAAAAAE0                           www                                               w w w w w
eIAAAAAAAAAE0 w w  wwwwwwwwww w ww        wwwww  w                 w  w
IAAAE0     wwwwwwwwwwwwwwwwwwwwwwwww  www www    w               w    w
AAw wwwwwwwwwwwwwwww      wwwwwww wwwww www   www     w w     w    wwww
IAE0wwwwww weIAAAAAAAAAAAAAAAAAAI0 wwwwww   www     wwwwwwwww w w ww w                        w
eIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIeww    wwww    wwwwwwwwwwwwwwwwww                 j1W1erw    w w w
  0EAAAAAAAAE0                  0IAIr wwww     wwwwwww   wwwwwwwww               eIAAAAAAAAAAAAIe
                                0EAIwwwww   wwwwwwwwww w    w                  eIAAAAAAAAAAAAAAAAAAAAAAAAAIjwrrrrrrjIAAAAAAAAAAAAAAAAA
                             6AAAAE0 w     w wwww                            eIAAI0            0IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
                            0AAAEe  w   www w                             wjIAAIe                         6IAAAAAAAE6
                          0EAAew     wwwwwww      w wwww   wwwww w     eIAAAAIe
                          EAE0       wwwww   ww                    w0IAAAAAA6
                          AA    wwww w         w      w    ww eIAAAAAAAIe
                          EA0 wwww w   ww  w            weIAAAAAAAAANe
                          0AAe       ww  ww  060ww   w  jAAAAAE6
                           WA1 www   w  w w eAIIw   w  rNA0
                           AAe   ww ww  w  eAAIAe   w  jAA
                           AAe   w  ww  w  IAeNA0      IA6
                           6AIw ww  ww  ww AA IAj ww   AA
                            AAe  ww ww  ww AA WAI  w  wAA
                            6AEwwww ww w wwAA  EA0 www0AN
                             IA6ww  ww w  jAA  0AAI6IAAAe
                             eAAnn0EAAAAAAAA6   0EAAAAIe
                              0AAAAAAAAAAAE0      6W6
                               WAANe`.slice(1);

export const RIGHT = parse(RIGHT_ART, 'left');

