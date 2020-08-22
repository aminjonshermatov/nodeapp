'use strict';

const http = require('http');

const port = 9999;
const statusNotFound = 404;
const statusBadRequest = 400;
const statusOk = 200;

let nextId = 1;
const posts = [];

function sendResponse(response, {status = statusOk, headers = {}, body = null}) {
    Object.entries(headers).forEach(([key, value]) => {
        response.setHeader(key, value);
    });
    response.writeHead(status);
    response.end(body);
}

function sendJSON(response, body) {
    sendResponse(response, {
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
}

const methods = new Map();
methods.set('/posts.get', ({response}) => {
    sendJSON(response, posts);
});
methods.set('/posts.getById', ({response, searchParams}) => {
    if (!searchParams.has('id') || Number.isNaN(searchParams.get('id')) || 
        isNaN(searchParams.get('id')) || Number(searchParams.get('id')) < 1) {
        sendResponse(response, {status: statusBadRequest});
        return;
    }

    const id = Number(searchParams.get('id'));

    if (!posts.some((el) => el.id === id)) {
        sendResponse(response, {status: statusNotFound});
        return;
    }

    posts.forEach((element) => {
        if (element.id === id) {
            sendJSON(response, element);
            return;
        }
    });
});
methods.set('/posts.post', ({response, searchParams}) => {
    if (!searchParams.has('content')) {
        sendResponse(response, {status: statusBadRequest});
        return;
    }

    const content = searchParams.get('content');

    const post = {
        id: nextId++,
        content: content,
        created: Date.now(),
    };

    posts.unshift(post);
    sendJSON(response, post);
});
methods.set('/posts.edit', ({response, searchParams}) => {
    if (!searchParams.has('id') || !searchParams.has('content') || Number.isNaN(searchParams.get('id')) || 
        isNaN(searchParams.get('id')) || Number(searchParams.get('id')) < 1 || searchParams.get('content') == '') {
        sendResponse(response, {status: statusBadRequest});
        return;
    }

    const id = Number(searchParams.get('id'));
    const content = searchParams.get('content');

    if (!posts.some((el) => el.id === id)) {
        sendResponse(response, {status: statusNotFound});
        return;
    }

    posts.forEach((element) => {
        if (element.id === id) {
            element.content = content;
            sendJSON(response, element);
            return;
        }
    });
});
methods.set('/posts.delete', () => {});

const server = http.createServer((request, response) => {
    const {pathname, searchParams} = new URL(request.url, `https://${request.headers.host}`);

    const method = methods.get(pathname);
    if (method === undefined) {
        sendResponse(response, {status: statusNotFound});
        return;
    }

    const params = {
        request,
        response,
        pathname,
        searchParams,
    };

    method(params);
});

server.listen(port);