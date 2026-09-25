#!/usr/bin/env node
// Sign official plugins so shading.app can tell them apart from third-party zips.
//
//   node scripts/sign.mjs                 sign every plugin (writes <plugin>/shading-plugin.sig)
//   node scripts/sign.mjs blur lut        sign only some plugins
//   node scripts/sign.mjs --check         verify every signature against signing-keys.json (no private key needed)
//   node scripts/sign.mjs --generate-key  create a new key pair
//
// The private key never enters this repository. It is read from SHADING_PLUGIN_SIGNING_KEY (a path to a PKCS#8 PEM)
// or ~/.config/shading/plugin-signing-key.pem. The public keys are in signing-keys.json and built into shading.app
// (src/lib/plugins/signature.js); both must list the same keys.
//
// The signature covers the SHA-256 of every file in the plugin folder (except the .sig itself and the entries
// shading.app ignores), so any zip built from the folder verifies, however it was zipped.
import {createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIGNATURE_NAME = 'shading-plugin.sig';
const SIGNATURE_FORMAT = 'shading.app/plugin-signature';
const PAYLOAD_HEADER = `${SIGNATURE_FORMAT}/1\n`;
const IGNORED_NAME = /^(\.DS_Store|Thumbs\.db|__MACOSX)$/;
const KEYS_FILE = path.join(ROOT, 'signing-keys.json');
const KEY_PATH = process.env.SHADING_PLUGIN_SIGNING_KEY ||
    path.join(os.homedir(), '.config', 'shading', 'plugin-signing-key.pem');

const fail = message => {
    console.error(message);
    process.exit(1);
};

const listPlugins = () => fs.readdirSync(ROOT)
    .filter(name => fs.existsSync(path.join(ROOT, name, 'shading-plugin.json')))
    .sort();

// Files that end up in the zip, keyed by their path inside the plugin.
const readFiles = plugin => {
    const root = path.join(ROOT, plugin);
    const files = new Map();
    const walk = relative => {
        for (const entry of fs.readdirSync(path.join(root, relative), {withFileTypes: true})) {
            if (IGNORED_NAME.test(entry.name)) continue;
            const name = relative ? `${relative}/${entry.name}` : entry.name;
            if (entry.isSymbolicLink()) fail(`${plugin}/${name}: symbolic links cannot be signed.`);
            if (entry.isDirectory()) walk(name);
            else if (name !== SIGNATURE_NAME) files.set(name, fs.readFileSync(path.join(root, name)));
        }
    };
    walk('');
    return files;
};

// A git-ignored file would be signed here but missing from a fresh clone, so the build would not verify.
const assertTracked = (plugin, files) => {
    let listed;
    try {
        listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', plugin],
            {cwd: ROOT, encoding: 'utf8'});
    } catch (error) {
        return;
    }
    const known = new Set(listed.split('\0').filter(Boolean).map(name => name.slice(plugin.length + 1)));
    const ignored = Array.from(files.keys()).filter(name => !known.has(name));
    if (ignored.length) fail(`${plugin}: git ignores ${ignored.join(', ')}. Remove these files before signing.`);
};

const payload = files => {
    const paths = Array.from(files.keys()).sort((a, b) => {
        if (a < b) return -1;
        return a > b ? 1 : 0;
    });
    const bad = paths.find(name => /[\0-\x1f]/.test(name));
    if (bad) fail(`File names cannot contain control characters: ${JSON.stringify(bad)}`);
    return Buffer.from(PAYLOAD_HEADER + paths.map(name =>
        `${createHash('sha256').update(files.get(name)).digest('hex')} ${name}\n`).join(''), 'utf8');
};

const readKeys = () => JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8')).keys;

const generateKey = () => {
    if (fs.existsSync(KEY_PATH)) fail(`${KEY_PATH} already exists; move it away first.`);
    const {privateKey, publicKey} = generateKeyPairSync('ec', {namedCurve: 'P-256'});
    fs.mkdirSync(path.dirname(KEY_PATH), {recursive: true, mode: 0o700});
    fs.writeFileSync(KEY_PATH, privateKey.export({type: 'pkcs8', format: 'pem'}), {mode: 0o600, flag: 'wx'});
    const {kty, crv, x, y} = publicKey.export({format: 'jwk'});
    console.log(`Private key: ${KEY_PATH} (back it up; never commit it)`);
    console.log('Add this public key to signing-keys.json and to src/lib/plugins/signature.js in shading:');
    console.log(JSON.stringify({kty, crv, x, y}));
};

const signPlugins = plugins => {
    if (!fs.existsSync(KEY_PATH)) fail(`No signing key at ${KEY_PATH}. Set SHADING_PLUGIN_SIGNING_KEY.`);
    const privateKey = createPrivateKey(fs.readFileSync(KEY_PATH));
    const publicJwk = createPublicKey(privateKey).export({format: 'jwk'});
    const keyId = Object.keys(readKeys()).find(id => {
        const key = readKeys()[id];
        return key.x === publicJwk.x && key.y === publicJwk.y;
    });
    if (!keyId) fail(`The key at ${KEY_PATH} is not listed in signing-keys.json.`);
    for (const plugin of plugins) {
        const files = readFiles(plugin);
        assertTracked(plugin, files);
        const signature = sign('sha256', payload(files), {key: privateKey, dsaEncoding: 'ieee-p1363'});
        const content = {
            format: SIGNATURE_FORMAT,
            version: 1,
            keyId,
            algorithm: 'ECDSA-P256-SHA256',
            signature: signature.toString('base64')
        };
        fs.writeFileSync(path.join(ROOT, plugin, SIGNATURE_NAME), `${JSON.stringify(content, null, 2)}\n`);
        console.log(`signed ${plugin} (${files.size} files)`);
    }
};

const checkPlugins = plugins => {
    const keys = readKeys();
    let failed = 0;
    for (const plugin of plugins) {
        let problem = null;
        try {
            const content = JSON.parse(fs.readFileSync(path.join(ROOT, plugin, SIGNATURE_NAME), 'utf8'));
            const jwk = keys[content.keyId];
            if (!jwk) {
                problem = `unknown key ${content.keyId}`;
            } else if (!verify('sha256', payload(readFiles(plugin)),
                {key: createPublicKey({key: jwk, format: 'jwk'}), dsaEncoding: 'ieee-p1363'},
                Buffer.from(content.signature, 'base64'))) {
                problem = 'files changed since signing (run node scripts/sign.mjs)';
            }
        } catch (error) {
            problem = error.code === 'ENOENT' ? 'not signed' : error.message;
        }
        if (problem) failed++;
        console.log(`${problem ? 'FAIL' : 'ok  '} ${plugin}${problem ? `: ${problem}` : ''}`);
    }
    if (failed) process.exit(1);
};

const args = process.argv.slice(2);
if (args.includes('--generate-key')) {
    generateKey();
} else {
    const names = args.filter(arg => !arg.startsWith('--')).map(name => name.replace(/\/$/, ''));
    const plugins = names.length ? names : listPlugins();
    for (const plugin of plugins) {
        if (!fs.existsSync(path.join(ROOT, plugin, 'shading-plugin.json'))) fail(`${plugin} is not a plugin folder.`);
    }
    if (args.includes('--check')) checkPlugins(plugins);
    else signPlugins(plugins);
}
