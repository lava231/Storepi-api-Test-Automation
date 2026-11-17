const { mkdirSync, readFileSync, readdirSync } = require('node:fs');
const { basename, join, resolve } = require('node:path');
const newman = require('newman');
const { parse } = require('yaml');

const project = resolve(__dirname, '..');
const postman = join(project, 'postman');
const bonus = join(project, 'bonus');
const definitionFile = '.resources/definition.yaml';
const requestSuffix = '.request.yaml';
const eventNames = {
    beforeRequest: 'prerequest',
    afterResponse: 'test',
    'http:beforeRequest': 'prerequest',
    'http:afterResponse': 'test',
};

function readYaml(path) {
    return parse(readFileSync(path, 'utf8'));
}

function convertAuth(auth) {
    if (!auth) return undefined;
    if (Array.isArray(auth)) {
        if (auth.length !== 1) throw new Error('Newman conversion expects one auth scheme per scope');
        [auth] = auth;
    }
    if (auth.type === 'noauth') return { type: 'noauth' };
    if (auth.type !== 'bearer') throw new Error('Unsupported auth type: ' + auth.type);
    return {
        type: 'bearer',
        bearer: auth.credentials.map(({ key, value }) => ({ key, value, type: 'string' })),
    };
}

function convertScripts(scripts = []) {
    return scripts.map(({ type, code }) => {
        const listen = eventNames[type];
        if (!listen) throw new Error('Unsupported script type: ' + type);
        return { listen, script: { type: 'text/javascript', exec: code.split('\n') } };
    });
}

function readRequest(path) {
    const request = readYaml(path);
    if (request.$kind !== 'http-request' || (request.body && request.body.type !== 'json')) {
        throw new Error('Expected an HTTP request with an optional JSON body: ' + path);
    }
    return {
        order: request.order ?? 0,
        name: request.name ?? basename(path, requestSuffix),
        event: convertScripts(request.scripts),
        request: {
            method: request.method,
            url: request.url,
            header: request.headers,
            auth: convertAuth(request.auth),
            description: request.description,
            body: request.body && {
                mode: 'raw',
                raw: request.body.content,
                options: { raw: { language: 'json' } },
            },
        },
    };
}

function readFolder(path) {
    const folder = readYaml(join(path, definitionFile));
    const entries = readdirSync(path, { withFileTypes: true });
    const children = entries.filter(entry => !entry.name.startsWith('.') &&
        (entry.isDirectory() || entry.name.endsWith(requestSuffix)));
    const items = children.map(entry => {
        const child = join(path, entry.name);
        return entry.isDirectory() ? readFolder(child) : readRequest(child);
    }).sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
    return {
        order: folder.order ?? 0,
        name: folder.name ?? basename(path),
        description: folder.description,
        auth: convertAuth(folder.auth),
        event: convertScripts(folder.scripts),
        item: items.map(({ order, ...item }) => item),
    };
}

const authData = process.argv[2] === '--auth-data';
const source = authData
    ? join(bonus, 'Authentication Data Tests')
    : join(postman, 'collections', 'StorePI API Test Automation');
const { order, name, description, ...collection } = readFolder(source);
const environment = readYaml(join(postman, 'environments', 'StorePI QA.environment.yaml'));
const reportDirectory = resolve(process.env.STOREPI_REPORT_DIR ?? join(project, '..', 'outputs'));
mkdirSync(reportDirectory, { recursive: true });

newman.run({
    collection: {
        info: {
            name,
            description,
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        ...collection,
    },
    environment: {
        name: environment.name,
        values: environment.values.map(({ key, value, enabled = true }) => ({ key, value, enabled })),
    },
    iterationData: authData ? join(bonus, 'authentication_test_data.csv') : undefined,
    timeoutRequest: 20000,
    reporters: ['cli', 'htmlextra'],
    reporter: {
        htmlextra: {
            export: join(reportDirectory, authData ? 'StorePI_Newman_Auth_Data.html' : 'StorePI_Newman_Report.html'),
            title: name + ' · Newman Results',
            skipSensitiveData: true,
        },
    },
}, (error, summary) => {
    if (error) console.error(error.message);
    if (error || summary?.run.failures.length) process.exitCode = 1;
});
