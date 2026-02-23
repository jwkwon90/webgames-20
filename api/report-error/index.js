const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  const secret = req.headers['x-error-secret'] || '';
  const expected = process.env.ERROR_REPORT_SECRET || (require('../../../../.openclaw/openclaw.json').skills.entries.notion.apiKey && 'dev_local_secret');
  // note: for local testing we allow if not set
  if (process.env.ERROR_REPORT_SECRET && secret !== process.env.ERROR_REPORT_SECRET) {
    return res.status(403).json({error:'forbidden'});
  }

  let payload = {};
  try{ payload = req.body && Object.keys(req.body).length ? req.body : JSON.parse(await getRawBody(req)); }catch(e){payload = {raw: 'parse_fail'}}

  const notionKey = process.env.NOTION_KEY || (require('../../../../.openclaw/openclaw.json').skills.entries.notion.apiKey);
  const parentPageId = process.env.NOTION_ERROR_PAGE_ID || '30965dc5beb180f8b9e3f89de60a9727';

  // build Notion page
  const title = `[Error] ${(payload.message||'unknown').slice(0,60)}`;
  const blocks = [];
  blocks.push({object:'block', type:'paragraph', paragraph:{text:[{type:'text', text:{content:`URL: ${payload.url || ''} \nTime: ${payload.time || ''} \nUA: ${payload.userAgent || ''}`}}]}});
  blocks.push({object:'block', type:'paragraph', paragraph:{text:[{type:'text', text:{content:`Type: ${payload.type || ''}`}}]}});
  if (payload.stack) blocks.push({object:'block', type:'code', code:{text:[{type:'text', text:{content:payload.stack}}],language:'text'}});
  if (payload.message && !payload.stack) blocks.push({object:'block', type:'paragraph', paragraph:{text:[{type:'text', text:{content:payload.message}}]}});

  // create page via Notion API
  const body = {
    parent: { page_id: parentPageId },
    properties: {
      title: { title: [{ text: { content: title } }] }
    },
    children: blocks
  };

  try{
    const r = await fetch('https://api.notion.com/v1/pages',{
      method:'POST',
      headers:{ 'Authorization': `Bearer ${notionKey}`, 'Notion-Version':'2022-06-28', 'Content-Type':'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const t = await r.text();
      console.error('Notion API error', r.status, t);
      return res.status(502).json({error:'notion_error', detail:t});
    }
    const data = await r.json();
    return res.status(200).json({ok:true, pageId: data.id});
  }catch(e){
    console.error('report failed', e);
    return res.status(500).json({error:'internal', detail: String(e)});
  }
};

function getRawBody(req){
  return new Promise((resolve,reject)=>{
    let data=''; req.on('data',c=>data+=c); req.on('end',()=>resolve(data)); req.on('error',reject);
  });
}
