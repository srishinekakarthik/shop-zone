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

let changedFiles = 0;

walk('src').forEach(f => {
  let txt = fs.readFileSync(f, 'utf8');
  let original = txt;
  
  // Remove .toFixed(2) everywhere
  txt = txt.replace(/\.toFixed\(2\)/g, '');
  
  if (original !== txt) {
    fs.writeFileSync(f, txt, 'utf8');
    changedFiles++;
    console.log('Updated', f);
  }
});

console.log('Updated files:', changedFiles);
