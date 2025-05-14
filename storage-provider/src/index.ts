import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Experimental } from 'o1js';
import {
  serializeIndexedMap,
  deserializeIndexedMerkleMap,
} from '@minatokens/storage';

const { IndexedMerkleMap } = Experimental;
const height = 4;
export class MerkleMap extends IndexedMerkleMap(height) {}

import fs, { write } from 'node:fs';
import type { JSONObject } from 'hono/utils/types';

const app = new Hono();

const donorMapFile = 'donorMap.json';

function writeMerkleMap(m: MerkleMap) {
  const serialized = serializeIndexedMap(m);
  fs.writeFileSync(donorMapFile, JSON.stringify(serialized));
  console.log('Wrote donor map', m);
}

function readMerkleMap(): MerkleMap {
  const data = fs.readFileSync(donorMapFile);
  const jsonMap = JSON.parse(data.toString());
  console.log(jsonMap);
  const m = deserializeIndexedMerkleMap({ serializedIndexedMap: jsonMap });
  console.log('Loaded donor map', m);
  return m;
}

function newOrLoadDonorMap(): MerkleMap {
  try {
    return readMerkleMap();
  } catch (e) {
    console.log('Creating new donor map');
    return new MerkleMap();
  }
}

const donorMap = newOrLoadDonorMap();
writeMerkleMap(donorMap);

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST'],
    allowHeaders: ['Content-Type'],
    maxAge: 600,
  }),
);

app.get('/', (c) => {
  return c.json(serializeIndexedMap(readMerkleMap()));
});

app.post('/write', async (c) => {
  const serializedMap = await c.req.json();
  const m = deserializeIndexedMerkleMap({
    serializedIndexedMap: serializedMap,
  });
  writeMerkleMap(m);
  return c.status(200);
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
