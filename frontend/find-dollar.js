const fs = require('fs');
const path = require('path');

function walk(d) {
  let r = [];
  fs.readdirSync(d).forEach(f => {
    let p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) r = r.concat(walk(p));
    else if (p.endsWith('.js')) r.push(p);
  });
  return r;
}

walk('src').forEach(f => {
  let txt = fs.readFileSync(f, 'utf8');
  let lines = txt.split('\n');
  lines.forEach((l, i) => {
    // Exclude variables that start with $ (e.g. ${...} or $json or $('#id'))
    // Specifically looking for currency $ like $5, $${...}, Min $
    if (l.includes('$${') || l.match(/\$\d/) || l.match(/\$ /) || l.includes('Min $') || l.includes('Max $') || l.includes('Price ($)')) {
      console.log(f + ':' + (i + 1) + ':' + l.trim());
    }
  });
});
