const N3 = require("n3");
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
const Relateurl = require('relateurl');
const Jsonld = require('jsonld');

function parseRdf (body, base, contentType) {
  if (!(base instanceof URL)) throw Error(`base ${base} must be an instance of URL`)
  return contentType === 'application/ld+json'
    ? parseJsonLd(body, base, {})
    : parseTurtle(body, base, {});
}

function parseTurtleSync (text, base, prefixes) {
  if (!(base instanceof URL)) throw Error(`base ${base} must be an instance of URL`)
  return new N3.Parser({baseIRI: base.href, blankNodePrefix: "", format: "text/turtle"}).parse(text);
}

async function parseTurtle (text, base, prefixes) {
  if (!(base instanceof URL)) throw Error(`base ${base} must be an instance of URL`)
  const store = new N3.Store();
  return await new Promise((resolve, reject) => {
    new N3.Parser({baseIRI: base.href, blankNodePrefix: "", format: "text/turtle"}).
      parse(text,
            function (error, triple, newPrefixes) {
              if (prefixes) {
                Object.assign(prefixes, newPrefixes)
              }
              if (error) {
                reject(error);
              } else if (triple) {
                store.addQuad(triple);
              } else {
                resolve(store);
              }
            })
  }).catch(e => {
    throw new ParserError(e, text);
  });
}

function serializeTurtleSync (graph, base, prefixes) {
  if (!(base instanceof URL)) throw Error(`base ${base} must be an instance of URL`)
  // Create RegExp to test for matching namespaces
  // Is this faster than !Object.values(prefixes).find(ns => q[t].value.startsWith(ns) ?
  const p = new RegExp('^(?:' + Object.values(prefixes).map(
    ns => ns.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  ).map(
    nsr => '(?:' + nsr + ')'
  ).join('|') + ')')

  const writer = new N3.Writer({ prefixes });
  writer.addQuads((graph.constructor === Array ? graph : graph.getQuads()).map(q => {
    const terms = ['subject', 'object'];
    terms.forEach(t => {
      if (q[t].termType === 'NamedNode' // term is an IRI
          && !q[t].value.match(p))      // no applicable prefix
      {
        const old = q[t]
        q[t] = namedNode(Relateurl.relate(base.href, q[t].value))
        // This tests to make sure the URL is valid
        // c.f. https://github.com/stevenvachon/relateurl/issues/28
        try {
          const effective = new URL(q[t].value, base).href;
          if (old.value !== effective)
            throw new Error(`${old.value} !== ${effective}`);
        } catch (e) {
          throw Error(`Relateurl.relate(${base.href}, ${old.value}) => "${q[t].value}" failed: ${e}`)
        }
      }
    });
    return q
  }));
  let text
  writer.end((error, result) => {
    if (error)
      throw Error(error);
    else
      text = result
  });
  return text;
}

async function serializeTurtle (graph, base, prefixes) {
  if (!(base instanceof URL)) throw Error(`base ${base} must be an instance of URL`)
  // Create RegExp to test for matching namespaces
  // Is this faster than !Object.values(prefixes).find(ns => q[t].value.startsWith(ns) ?
  const p = new RegExp('^(?:' + Object.values(prefixes).map(
    ns => ns.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  ).map(
    nsr => '(?:' + nsr + ')'
  ).join('|') + ')')

  return await new Promise((resolve, reject) => {
    const writer = new N3.Writer({ prefixes });
    writer.addQuads((graph.constructor === Array ? graph : graph.getQuads()).map(q => {
      const terms = ['subject', 'object'];
      terms.forEach(t => {
        if (q[t].termType === 'NamedNode' // term is an IRI
            && !q[t].value.match(p))      // no applicable prefix
          q[t] = namedNode(Relateurl.relate(base.href, q[t].value, { output: Relateurl.ROOT_PATH_RELATIVE }))
      });
      return q
    }));
    writer.end((error, result) => {
      if (error)
        reject(error);
      else
        resolve(result)
    });
  })
}

async function parseJsonLd (text, base) {
  if (!(base instanceof URL)) throw Error(`base ${base} must be an instance of URL`)
  try {
    const qz = await Jsonld.toRDF(JSON.parse(text), {format: "application/nquads", base: base.href});
    // I think future minor versions will return an RDFJS list of quads.
    return parseTurtle(qz, base);
  } catch(e) {
    throw new ParserError(e, text)
  }
}

/** ManagedError - set of errors that Blueprints are expected to return.
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

/** NotFoundError - HTTP resource not retrieved.
 */
class NotFoundError extends ManagedError {
  constructor (resource, role, text) {
    let message = `${role} ${resource} not found`;
    super(message, 424);
    this.name = 'NotFound';
    this.text = text;
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

/** BlueprintStructureError - badly-formed Blueprint.
 */
class BlueprintStructureError extends ManagedError {
  constructor (blueprint, text) {
    let message = `Badly-structured blueprint ${blueprint}${text ? ': ' + text : ''}`;
    super(message, 424);
    this.name = 'BlueprintStructure';
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

// good-enough rendering for terms.
function renderRdfTerm (t) {
  return t === null ? '_'
  // : typeof t === 'string' ? `<${t}>` disabled even though N3.js allows bare IRIs.
    : t.termType === 'NamedNode' ? `<${t.value}>`
    : t.termType === 'BlankNode' ? `_:${t.value}`
    : t.termType === 'Literal' ? `"${t.value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    : (() => { throw Error(`${t} is not an RDFJS term`) })();
}

module.exports = {
  parseRdf,
  parseTurtleSync,
  parseTurtle,
  serializeTurtleSync,
  serializeTurtle,
  parseJsonLd,
  ManagedError,
  ParserError,
  NotFoundError,
  MissingShapeError,
  BlueprintStructureError,
  ValidationError,
  UriTemplateMatchError,
  renderRdfTerm,
};
