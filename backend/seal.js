process.env.MERIDIAN_SEAL = '1';

const fs = require('fs');
const { buildSeal, SEAL_PATH } = require('./integrity');

const seal = buildSeal();
fs.writeFileSync(SEAL_PATH, `${JSON.stringify(seal, null, 2)}\n`);
console.log(`Wrote ${SEAL_PATH}`);
