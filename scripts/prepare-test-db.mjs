import { copyFile, mkdir } from 'node:fs/promises';
import { URL } from 'node:url';

const dataDirectory = new URL('../data/', import.meta.url);
await mkdir(dataDirectory, { recursive: true });
await copyFile(new URL('crm-local.db', dataDirectory), new URL('crm-test.db', dataDirectory));
