import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const url='https://careers.gavyam-negev.co.il/portal/companies';
const res=await fetch(url);
if(!res.ok) throw new Error(`Fetch failed ${res.status}`);
const html=await res.text();
await mkdir('assets/company-logos',{recursive:true});
const entries=[];
const re=/<img\b[^>]*src="(data:image\/(png|jpe?g|webp|svg\+xml);base64,([^"]+))"[^>]*>[\s\S]{0,4000}?<span itemprop="name">([^<]+)<\/span>/gi;
for(const m of html.matchAll(re)){
  const mime=m[2].toLowerCase(), b64=m[3], name=m[4].trim();
  const ext=mime==='svg+xml'?'svg':mime==='jpeg'?'jpg':mime;
  const safe=name.toLowerCase().replace(/&/g,'and').replace(/@/g,'-').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || createHash('sha1').update(name).digest('hex').slice(0,8);
  const file=`assets/company-logos/${safe}.${ext}`;
  await writeFile(file,Buffer.from(b64,'base64'));
  entries.push({name,file:`./${file}`});
}
console.log('extracted',entries.length);
console.log(entries.map(e=>e.name).join('\n'));
await writeFile('server/data/gavyam-logo-sources.json',JSON.stringify({source:url,extractedAt:new Date().toISOString(),entries},null,2)+'\n');

const companies=JSON.parse(await readFile('server/data/companies.json','utf8'));
const norm=s=>String(s||'').toLowerCase().replace(/ltd|israel|technologies|technology|inc|company|group|software|digital health|a palo alto networks company/g,'').replace(/[^a-z0-9א-ת]+/g,'').trim();
const manual={
  'nvidia':'nvidia','micro':'micro','dell':'dell technologies','pwc-israel':'pwc israel','drs-rada-technologies':'drs rada technologies','let-group-ltd-atmos':'let group ltd atmos','upnext-innovate-ltd':'upnext innovate ltd','agmon-with-tulchinsky':'agmon with tulchinsky','brooks-keret':'brooks-keret','altera-digital-health':'altera digital health','cyberark':'cyberark','rad':'rad','ribbon':'ribbon','soroka':'soroka','wix':'wix','weka':'weka'
};
const byNorm=new Map();
for(const e of entries){byNorm.set(norm(e.name),e);}
const matched=[]; const missing=[];
for(const c of companies){
  const candidates=[manual[c.id],c.nameEn,c.nameHe,c.id].filter(Boolean);
  let hit=null;
  for(const cand of candidates){
    const n=norm(cand);
    hit=byNorm.get(n);
    if(hit) break;
  }
  if(!hit){
    for(const e of entries){
      const en=norm(e.name); const cn=norm(c.nameEn||c.nameHe||c.id);
      if(en && cn && (en.includes(cn)||cn.includes(en))){hit=e;break;}
    }
  }
  if(hit){c.logoUrl=hit.file;c.logoSource='gav-yam-negev';matched.push(`${c.id} <= ${hit.name}`);} else missing.push(`${c.id} | ${c.nameEn||c.nameHe}`);
}
await writeFile('server/data/companies.json',JSON.stringify(companies,null,2)+'\n');
console.log('\nmatched',matched.length); console.log(matched.join('\n'));
console.log('\nmissing',missing.length); console.log(missing.join('\n'));
