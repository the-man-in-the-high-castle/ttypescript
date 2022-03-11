import * as fs from 'fs';
import { dirname } from 'path';
import * as resolve from 'resolve';
import { runInThisContext } from 'vm';
import { applyBefore } from './applyBefore/apply.before';
import { loadOptions } from './applyBefore/loadOptions';
import { loadTypeScript } from './loadTypescript';

const options = loadOptions();

const ts = loadTypeScript('typescript', { folder: process.cwd(), forceConfigLoad: true });

if (options.before) applyBefore(ts, { prepend: options.prepend });

const tscFileName = resolve.sync('typescript/lib/tsc', { basedir: process.cwd() });
const commandLineTsCode = fs
    .readFileSync(tscFileName, 'utf8')
    .replace(/^[\s\S]+(\(function \(ts\) \{\s+function countLines[\s\S]+)$/, '$1');

const globalCode = (fs.readFileSync(tscFileName, 'utf8').match(/^([\s\S]*?)var ts;/) || ['', ''])[1];
runInThisContext(
    `(function (exports, require, module, __filename, __dirname, ts) {${globalCode}${commandLineTsCode}\n});`,
    {
        filename: tscFileName,
        lineOffset: 0,
        displayErrors: true,
    }
).call(ts, ts, require, { exports: ts }, tscFileName, dirname(tscFileName), ts);
