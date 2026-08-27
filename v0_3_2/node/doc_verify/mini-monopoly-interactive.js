'use strict';

const fs = require('fs');
const path = require('path');

const LOGTS = fs.readFileSync(path.join(__dirname, 'mini-monopoly-interactive.logts'), 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n');

function pulse(session, comp) {
  session.setComp(session.interp, comp, '1');
  session.setComp(session.interp, comp, '0');
}

function sliceOut(session, from) {
  return (session.out || []).slice(from).join('\n');
}

/** doc/mini-monopoly-interactive.md — hot-seat MVP with $/$$ state */
module.exports = {
  skipBlocks: true,
  cases: [
    {
      name: 'boot welcome on load',
      src: LOGTS,
      check: (interp, session) => {
        const text = (session.out || []).join('\n');
        return text.includes('Game Reset') && text.includes('current Player 1');
      },
    },
    {
      name: 'seed 42 roll pass buy flow',
      src: LOGTS,
      check: (interp, session) => {
        (session.out || []).length = 0;
        pulse(session, '.resetGame');
        const t0 = (session.out || []).length;
        pulse(session, '.key1');
        const roll1 = sliceOut(session, t0);
        if (!roll1.includes('Player 1 dice: 4 3')) return false;
        if (!roll1.includes('Player 1 position now: 7 avenue')) return false;
        if (!roll1.includes('2 buy property avenue')) return false;
        const t1 = (session.out || []).length;
        pulse(session, '.key1');
        const passRoll2 = sliceOut(session, t1);
        if (!passRoll2.includes('current Player 2')) return false;
        if (!passRoll2.includes('Player 2 dice: 6 5')) return false;
        if (!passRoll2.includes('Player 2 position now: 11 plaza')) return false;
        if (!passRoll2.includes('2 buy property plaza')) return false;
        const t2 = (session.out || []).length;
        pulse(session, '.key2');
        const buy = sliceOut(session, t2);
        if (!buy.includes('Player 2 buyProperty plaza')) return false;
        if (interp.getWireEffectiveValue('failed') !== '0') return false;
        return true;
      },
    },
    {
      name: 'community chest payTax after several rolls (seed 42)',
      src: LOGTS,
      check: (interp, session) => {
        (session.out || []).length = 0;
        pulse(session, '.resetGame');
        for (let step = 0; step < 12; step++) {
          const t0 = (session.out || []).length;
          pulse(session, '.key1');
          const chunk = sliceOut(session, t0);
          if (chunk.includes('community chest') && chunk.includes('Community Card: payTax')) {
            if (interp.getWireEffectiveValue('failed') !== '0') return false;
            return true;
          }
        }
        return false;
      },
    },
  ],
};
