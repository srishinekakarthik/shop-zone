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
  
  // Replace >${ with >₹{ (JSX)
  txt = txt.replace(/>\$\{/g, '>₹{');
  
  // Replace $${ with ₹${ (Template literal)
  txt = txt.replace(/\$\$\{/g, '₹${');
  
  // Replace × ${ with × ₹{
  txt = txt.replace(/× \$\{/g, '× ₹{');

  // Replace } each with ₹} each
  // Wait, if it is ">₹{var} each" we already fixed >${.
  
  // Replace specific strings
  txt = txt.replace(/Price \(\$\)/g, 'Price (₹)');
  txt = txt.replace(/Min \$/g, 'Min ₹');
  txt = txt.replace(/Max \$/g, 'Max ₹');
  
  if (original !== txt) {
    fs.writeFileSync(f, txt, 'utf8');
    changedFiles++;
    console.log('Updated', f);
  }
});

console.log('Updated files:', changedFiles);
