'use strict';

const http = require('http');
const mysqlx = require('@mysql/xdevapi');

const port = process.env.PORT || 9999;
const statusOk = 200;
//const statusNoContent = 204;
const statusBadRequest = 400;
const statusNotFound = 404;
const statusInternalServerError = 500;
const schema = 'social';

const client = mysqlx.getClient({
  user: 'app',
  password: 'pass',
  host: '0.0.0.0',
  port: 33060
});

function sendResponse(response, {status = statusOk, headers = {}, body = null}) {
  Object.entries(headers).forEach(function ([key, value]) {
    response.setHeader(key, value);
  });
  response.writeHead(status);
  response.end(body);
}

function sendJSON(response, body) {
  sendResponse(response, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    },
    body: JSON.stringify(body),
  });
}

function map(columns) {
  return row => row.reduce((res, value, i) => ({...res, [columns[i].getColumnLabel()]: value}), {});
}

const methods = new Map();

methods.set('/posts.get', async ({response, db}) => {
  const table = await db.getTable('posts');
  const result = await table.select(['id', 'content', 'likes', 'created'])
    .where('removed = :removed')
    .bind('removed', false)
    .orderBy('created DESC')
    .orderBy('id DESC')
    .execute();

  const data = result.fetchAll();
  result.getAffectedItemsCount();
  const columns = result.getColumns();
  const posts = data.map(map(columns));
  sendJSON(response, posts);
});

methods.set('/posts.getById', async ({response, searchParams, db}) => {
  if (!searchParams.has('id')) {
    sendResponse(response, {status: statusBadRequest});
    return;
  }

  const id = Number(searchParams.get('id'));
  if (Number.isNaN(id)) {
    sendResponse(response, {status: statusBadRequest});
    return;
  }

  if (id < 1) {
    sendResponse(response, {status: statusBadRequest});
    return;
  }

  const table = await db.getTable('posts');
  const result = await table.select(['id', 'content', 'likes', 'created'])
    .where('id = :id AND removed = :removed')
    .bind('id', id)
    .bind('removed', false)
    .execute();

  const data = result.fetchAll();

  if (data.length === 0) {
    sendResponse(response, {status: statusNotFound});
    return;
  }

  result.getAffectedItemsCount();
  const columns = result.getColumns();
  const posts = data.map(map(columns))[0];

  sendJSON(response, posts);
});

methods.set('/posts.post', async ({response, searchParams, db}) => {
  if (!searchParams.has('content')) {
    sendResponse(response, {status: statusBadRequest});
    return;
  }

  const content = searchParams.get('content');

  const table = await db.getTable('posts');
  let result = await table.insert(['content'])
    .values(content)
    .execute();

    const insertedId = result.getAutoIncrementValue();

    result = await table.select(['id', 'content', 'likes', 'created'])
    .where('id = :id')
    .bind('id', insertedId)
    .execute();

  const data = result.fetchAll();

  if (data.length === 0) {
    sendResponse(response, {status: statusNotFound});
    return;
  }

  result.getAffectedItemsCount();
  const columns = result.getColumns();
  const posts = data.map(map(columns))[0];

  sendJSON(response, posts);
});

methods.set('/posts.edit', async ({response, searchParams, db}) => {
  if (!searchParams.has('id')) {
    sendResponse(response, {status: statusBadRequest});
    return;
  }

  const id = Number(searchParams.get('id'));
  if (Number.isNaN(id)) {
    sendResponse(response, {status: statusBadRequest});
    return;
  }

  if (!searchParams.has('content')) {
    sendResponse(response, {status: statusBadRequest});
    return;
  }

  const content = searchParams.get('content');

  const table = await db.getTable('posts');
  let result = await table.update()
    .set('content', content)
    .where('id = :id AND removed = :removed')
    .bind('id', id)
    .bind('removed', false)
    .execute();

    const insertedId = result.getAffectedItemsCount();

    if (insertedId === 0) {
        sendResponse(response, {status: statusNotFound});
        return;
    }

    result = await table.select(['id', 'content', 'likes', 'created'])
    .where('id = :id')
    .bind('id', id)
    .execute();

  const data = result.fetchAll();

  if (data.length === 0) {
    sendResponse(response, {status: statusNotFound});
    return;
  }

  result.getAffectedItemsCount();
  const columns = result.getColumns();
  const posts = data.map(map(columns))[0];

  sendJSON(response, posts);
});

methods.set('/posts.delete', async ({response, searchParams, db}) => {
  if (!searchParams.has('id')) {
    sendResponse(response, {status: statusBadRequest});
    return;
  }

  const id = Number(searchParams.get('id'));
  if (Number.isNaN(id)) {
    sendResponse(response, {status: statusBadRequest});
    return;
  }

  const table = await db.getTable('posts');
  let result = await table.update()
    .set('removed', true)
    .where('id = :id')
    .bind('id', id)
    .execute();

  const removed = result.getAffectedItemsCount();

  if (removed === 0) {
    sendResponse(response, {status: statusNotFound});
    return;
  }

  result = await table.select(['id', 'content', 'likes', 'created'])
    .where('id = :id')
    .bind('id', id)
    .execute();

    const data = result.fetchAll();

    if (data.length === 0) {
    sendResponse(response, {status: statusNotFound});
    return;
    }

    result.getAffectedItemsCount();
    const columns = result.getColumns();
    const posts = data.map(map(columns))[0];

    sendJSON(response, posts);
});

methods.set('/posts.restore', async ({response, searchParams, db}) => {
  if (!searchParams.has('id')) {
    sendResponse(response, {status: statusBadRequest});
    return;
  }

  const id = Number(searchParams.get('id'));
  if (Number.isNaN(id)) {
    sendResponse(response, {status: statusBadRequest});
    return;
  }

  const table = await db.getTable('posts');
  let result = await table.update()
    .set('removed', false)
    .where('id = :id AND removed = :removed')
    .bind('id', id)
    .bind('removed', true)
    .execute();

  const removed = result.getAffectedItemsCount();

  if (removed === 0) {
    sendResponse(response, {status: statusNotFound});
    return;
  }

  result = await table.select(['id', 'content', 'likes', 'created'])
    .where('id = :id')
    .bind('id', id)
    .execute();

    const data = result.fetchAll();

    if (data.length === 0) {
    sendResponse(response, {status: statusNotFound});
    return;
    }

    result.getAffectedItemsCount();
    const columns = result.getColumns();
    const posts = data.map(map(columns))[0];

    sendJSON(response, posts);
});

methods.set('/posts.like', async ({response, searchParams, db}) => {
    if (!searchParams.has('id')) {
        console.log('1');
        sendResponse(response, {status: statusBadRequest});
        return;
      }
    
      const id = Number(searchParams.get('id'));
      if (Number.isNaN(id)) {
        console.log('2');
        sendResponse(response, {status: statusBadRequest});
        return;
    }

    const table = await db.getTable('posts');

    const queryBefore = await table.select(['likes'])
        .where('id = :id AND removed = :removed')
        .bind('id', id)
        .bind('removed', false)
        .execute();

    const dataBefore = queryBefore.fetchAll();

    if (dataBefore.length === 0) {
        sendResponse(response, {status: statusNotFound});
        return;
    }

    queryBefore.getAffectedItemsCount();
    const columnsBefore = queryBefore.getColumns();
    let likes = dataBefore.map(map(columnsBefore))[0].likes;

    let result = await table.update()
        .set('likes', ++likes)
        .where('id = :id AND removed = :removed')
        .bind('id', id)
        .bind('removed', false)
        .execute();
    
    const updated = result.getAffectedItemsCount();

    if (updated === 0) {
        sendResponse(response, {status: statusNotFound});
        return;
    }
    
    result = await table.select(['id', 'content', 'likes', 'created'])
        .where('id = :id')
        .bind('id', id)
        .execute();
    
    const data = result.fetchAll();

    if (data.length === 0) {
        sendResponse(response, {status: statusNotFound});
        return;
    }

    result.getAffectedItemsCount();
    const columns = result.getColumns();
    const posts = data.map(map(columns))[0];

    sendJSON(response, posts);
});

methods.set('/posts.dislike', async ({response, searchParams, db}) => {
    if (!searchParams.has('id')) {
        console.log('1');
        sendResponse(response, {status: statusBadRequest});
        return;
      }
    
      const id = Number(searchParams.get('id'));
      if (Number.isNaN(id)) {
        console.log('2');
        sendResponse(response, {status: statusBadRequest});
        return;
    }

    const table = await db.getTable('posts');

    const queryBefore = await table.select(['likes'])
        .where('id = :id AND removed = :removed')
        .bind('id', id)
        .bind('removed', false)
        .execute();

    const dataBefore = queryBefore.fetchAll();

    if (dataBefore.length === 0) {
        sendResponse(response, {status: statusNotFound});
        return;
    }

    queryBefore.getAffectedItemsCount();
    const columnsBefore = queryBefore.getColumns();
    let likes = dataBefore.map(map(columnsBefore))[0].likes;

    let result = await table.update()
        .set('likes', --likes)
        .where('id = :id AND removed = :removed')
        .bind('id', id)
        .bind('removed', false)
        .execute();
    
    const updated = result.getAffectedItemsCount();

    if (updated === 0) {
        sendResponse(response, {status: statusNotFound});
        return;
    }
    
    result = await table.select(['id', 'content', 'likes', 'created'])
        .where('id = :id')
        .bind('id', id)
        .execute();
    
    const data = result.fetchAll();

    if (data.length === 0) {
        sendResponse(response, {status: statusNotFound});
        return;
    }

    result.getAffectedItemsCount();
    const columns = result.getColumns();
    const posts = data.map(map(columns))[0];

    sendJSON(response, posts);
});

const server = http.createServer(async (request, response) => {
  const {pathname, searchParams} = new URL(request.url, `http://${request.headers.host}`);

  const method = methods.get(pathname);
  if (method === undefined) {
    sendResponse(response, {status: statusNotFound});
    return;
  }

  let session = null;
  try {
    session = await client.getSession();
    const db = await session.getSchema(schema);

    const params = {
      request,
      response,
      pathname,
      searchParams,
      db,
    };

    await method(params);
  } catch (e) {
    sendResponse(response, {status: statusInternalServerError});
  } finally {
    if (session !== null) {
      try {
        await session.close();
      } catch (e) {
        console.log(e);
      }
    }
  }
});

server.listen(port);