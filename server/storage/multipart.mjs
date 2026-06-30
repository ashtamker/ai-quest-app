import { Buffer } from 'node:buffer';

export async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export async function readJson(req) {
  const body = await readBody(req);
  if (!body.length) return {};
  return JSON.parse(body.toString('utf8'));
}

export async function readMultipart(req) {
  const contentType = req.headers['content-type'] || '';
  const match = contentType.match(/boundary=(?:(?:"([^"]+)")|([^;]+))/i);
  if (!match) return { fields: {}, files: {} };
  const boundary = `--${match[1] || match[2]}`;
  const body = await readBody(req);
  const raw = body.toString('binary');
  const parts = raw.split(boundary).slice(1, -1);
  const fields = {}, files = {};
  for (const part of parts) {
    const clean = part.replace(/^\r\n/, '').replace(/\r\n$/, '');
    const idx = clean.indexOf('\r\n\r\n');
    if (idx < 0) continue;
    const header = clean.slice(0, idx);
    const valueBinary = clean.slice(idx + 4).replace(/\r\n$/, '');
    const name = /name="([^"]+)"/.exec(header)?.[1];
    const filename = /filename="([^"]*)"/.exec(header)?.[1];
    const type = /Content-Type:\s*([^\r\n]+)/i.exec(header)?.[1] || 'application/octet-stream';
    if (!name) continue;
    if (filename) files[name] = { filename, type, buffer: Buffer.from(valueBinary, 'binary') };
    else fields[name] = Buffer.from(valueBinary, 'binary').toString('utf8');
  }
  return { fields, files };
}
