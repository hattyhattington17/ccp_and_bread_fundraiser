import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { MerkleMap } from '../../src/Fundraiser.js';
import fs from 'node:fs';
const app = new Hono();
const donorMapFile = 'donorMap.json';
function writeMerkleMap(m) {
  const serialized = JSON.stringify(m.data.get());
  fs.writeFileSync(donorMapFile, serialized);
  console.log('Wrote donor map', m);
}
function readMerkleMap() {
  const data = fs.readFileSync(donorMapFile);
  const jsonMap = JSON.parse(data.toString());
  let m = new MerkleMap();
  m.data.set(jsonMap);
  console.log('Loaded donor map', m);
  return m;
}
function newOrLoadDonorMap() {
  try {
    return readMerkleMap();
  } catch (e) {
    console.log('Creating new donor map');
    return new MerkleMap();
  }
}
const donorMap = newOrLoadDonorMap();
app.get('/', (c) => {
  return c.json(donorMap.data.get());
});
serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
