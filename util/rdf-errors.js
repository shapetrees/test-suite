/** ManagedError - set of errors that ShapeTrees are expected to return.
 */
class ManagedError extends Error {
  constructor (message, status) {
    super(message);
    this.name = 'Managed';
    this.status = status;
  }
}

/** ParserError - adds context to jsonld.js and N3.js parse errors.
 */
class ParserError extends ManagedError {
  constructor (e, text) {
    let message = e.message;
    if ('context' in e) { // N3.Parser().parse()
      const c = e.context;
      const lines = text.split(/\n/);
      message = `${e.message}\n  line: ${lines[c.line-1]}\n  context: ${JSON.stringify(c)}`;
    }
    if ('details' in e) { // Jsonld.expand()
      const d = e.details;
      message = `${e.message}\n  details: ${JSON.stringify(d)}`;
    }
    super(message, 422);
    this.name = e.name;
  }
}

/** NotFoundError - HTTP resource not found.
 */
class NotFoundError extends ManagedError {
  constructor (resource, role, text) {
    let message = `${role} ${resource} not found`;
    super(message, 424);
    this.name = 'NotFound';
    this.text = text;
  }
}

/** MiscHttpError - HTTP operation failed.
 */
class MiscHttpError extends ManagedError {
  constructor (operation, resource, role, status, statusText, text) {
    let message = `${operation} ${role} ${resource} failed with ${status} ${statusText}`;
    super(message, 424);
    this.name = 'NotFound';
    this.text = text;
  }
}

/** makeHttpError - decide between NotFound and MiscHttp error.
 */
async function makeHttpError (operation, resource, role, resp) {
  switch (resp.status) {
  case 404: return new NotFoundError(resource, role, (await resp.text()).substr(0, 80))
  default: return new MiscHttpError(operation, resource, role, resp.status, resp.statusText, (await resp.text()).substr(0, 80))
  }
}

/** getOrThrow - decide between NotFound and MiscHttp error.
 */
async function getOrThrow (fetch, url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok)
      throw await makeHttpError('GET', url.href, 'schema', resp);
    return resp;
  } catch (e) {
    throw await makeHttpError('GET', url.href, 'schema', {
      status: -1, statusText: e.message, text: () => Promise.resolve(e.message)
    })
  }
}

/** MissingShapeError - shape was not found in schema.
 */
class MissingShapeError extends ManagedError {
  constructor (shape, text) {
    let message = `shape ${shape} not found`;
    super(message, 424);
    this.name = 'MissingShape';
    this.text = text;
  }
}

/** ShapeTreeStructureError - badly-formed ShapeTree.
 */
class ShapeTreeStructureError extends ManagedError {
  constructor (shapeTree, text) {
    let message = `Badly-structured ShapeTree ${shapeTree}${text ? ': ' + text : ''}`;
    super(message, 424);
    this.name = 'ShapeTreeStructure';
    this.text = text;
  }
}

/** ValidationError - node did not validate as shape.
 */
class ValidationError extends ManagedError {
  constructor (node, shape, text) {
    let message = `<${node}> did not validate as <${shape}>:\n` + text;
    super(message, 422);
    this.name = 'Validation';
    this.node = node;
    this.shape = shape;
    this.text = text;
  }
}

/** UriTemplateMatchError - no supplied Uri template matched string.
 */
class UriTemplateMatchError extends ManagedError {
  constructor (string, templates, text) {
    let message = `Failed to match "${string}"${templates ? JSON.stringify(templates) : ''}${text ? ': ' + text : ''}`;
    super(message, 422);
    this.name = 'UriTemplateMatchError';
    this.templates = templates;
    this.text = text;
  }
}

module.exports = {
  ManagedError,
  ParserError,
  NotFoundError,
  MiscHttpError,
  makeHttpError,
  getOrThrow,
  MissingShapeError,
  ShapeTreeStructureError,
  ValidationError,
  UriTemplateMatchError,
};
