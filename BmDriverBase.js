/**
 * @module benangmerah-driver-base
 * This module exports a class, BmDriverBase, which servers as the base API
 * for BenangMerah drivers. Drivers are classes which are used to feed
 * linked data into BenangMerah from a particular type of source,
 * such as IATI datasources or CKAN endpoints. An instance of a driver class
 * would be used for an instance of the type of source, for example a
 * single CKAN endpoint.
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');

/**
 * The base BenangMerah driver class.
 * @constructor
 */
function BmDriverBase() {}

util.inherits(BmDriverBase, EventEmitter);

module.exports = BmDriverBase;

/**
 * The ISO 8601 date when this driver instance was last fetched.
 * This would usually be retrieved from the database.
 * Can be used to support delta fetching.
 * @protected
 * @type {string}
 */
BmDriverBase.prototype.lastFetched = "";

/**
 * Options for this instance.
 * @protected
 * @type {object}
 */
BmDriverBase.prototype.options = {};

/**
 * Default options for this instance.
 * Should be extended by child classes.
 * @protected
 * @type {object}
 */
BmDriverBase.prototype.defaultOptions = {};

/**
 * Set options for this instance.
 * The options would usually be stored in the DB.
 * Called from outside the driver.
 * @param {object} newOptions
 */
BmDriverBase.prototype.setOptions = function setOptions(newOptions) {
  this.options = _.defaults(newOptions, this.defaultOptions);
};

/**
 * Set the lastFetched property of this instance.
 * Called from outside the driver.
 * @param {string} lastFetched
 */
BmDriverBase.prototype.setLastFetched = function setLastFetched(lastFetched) {
  this.lastFetched = lastFetched;
};

/**
 * Method to call when a triple should be added to the graph.
 * @protected
 * @param {string} theSubject - The subject URI
 * @param {string} thePredicate - The predicate URI
 * @param {string} theObject - The object URI or literal value, according to N3.js's API
 */
BmDriverBase.prototype.addTriple =
function addTriple(theSubject, thePredicate, theObject) {
  this.emit('addTriple', theSubject, thePredicate, theObject);
};

/**
 * Method to call when logging something
 * @param  {string} level
 * @param  {*} message
 * @event log
 */
BmDriverBase.prototype.log = function log(level, message) {
  this.emit('log', level, message);
};

/**
 * Method to call to log a debug-level message.
 * @protected
 * @param {*} message
 * @event log
 */
BmDriverBase.prototype.debug = function debug(message) {
  this.log('debug', message);
};

/**
 * Method to call to log a verbose-level message.
 * @protected
 * @param {*} message
 * @event log
 */
BmDriverBase.prototype.verbose = function verbose(message) {
  this.log('verbose', message);
};

/**
 * Method to call to log an info-level message.
 * @protected
 * @param {*} message
 * @event log
 */
BmDriverBase.prototype.info = function info(message) {
  this.log('info', message);
};

/**
 * Method to call to log a warn-level message.
 * @protected
 * @param {*} message
 * @event log
 */
BmDriverBase.prototype.warn = function warn(message) {
  this.log('warn', message);
};

/**
 * Method to call to log an error-level message.
 * @protected
 * @param {*} message
 * @event log
 */
BmDriverBase.prototype.error = function error(message) {
  this.log('error', message);
};

/**
 * Method to call when fetching has completed. Emits the 'finish' event.
 * @event finish
 */
BmDriverBase.prototype.finish = function finish() {
  this.emit('finish');
};

/**
 * Fetch data from the datasource. Method to be overridden by child classes.
 * This method should:
 * - call this.addTriple() to add a triple.
 * - call this.finish() when the operation is finished.
 * - call this.log(), this.info(), this.debug(), etc anytime in between.
 */
BmDriverBase.prototype.fetch = function fetch() {};

/**
 * Convenience function to handle CLI.
 * Options can be passed as an argument to this method or as CLI arguments.
 * @param {function} constructor - The constructor of the child class
 * @param {object} options - Options to pass to the driver instance
 */
BmDriverBase.handleCLI = function handleCLI(constructor, options) {
  if (require.main === module.parent) {
    var fs = require('fs');
    var minimist = require('minimist');
    var n3 = require('n3');
    var logger = require('winston');

    var rdfNS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
    var rdfsNS = 'http://www.w3.org/2000/01/rdf-schema#';
    var owlNS = 'http://www.w3.org/2002/07/owl#';
    var xsdNS = 'http://www.w3.org/2001/XMLSchema#';
    var ontNS = 'http://benangmerah.net/ontology/';
    var placeNS = 'http://benangmerah.net/place/idn/';
    var bpsNS = 'http://benangmerah.net/place/idn/bps/';
    var geoNS = 'http://www.w3.org/2003/01/geo/wgs84_pos#';
    var qbNS = 'http://purl.org/linked-data/cube#';
    var orgNS = 'http://www.w3.org/ns/org#';
    var dctNS = 'http://purl.org/dc/terms/';
    var skosNS = 'http://www.w3.org/2004/02/skos/core#';

    var prefixes = {
      'rdf': rdfNS,
      'rdfs': rdfsNS,
      'owl': owlNS,
      'xsd': xsdNS,
      'bps': bpsNS,
      'geo': geoNS,
      'qb': qbNS,
      'bm': ontNS,
      'org': orgNS,
      'dct': dctNS,
      'skos': skosNS
    };

    if (!options) {
      options = constructor;
      constructor = module.parent.exports;
    }

    if (!options) {
      options = {};
    }

    var driverInstance = new constructor();

    var argv = minimist(process.argv.slice(2));

    options = _.extend(options, argv);
    driverInstance.setOptions(options);

    var outputStream;
    if (!options.outputFile && argv._.length > 0) {
      options.outputFile = argv._[0];

      if (fs.existsSync(options.outputFile) && !options.force) {
        logger.error('File %s already exists. Use --force to override.', options.outputFile);
        return;
      }

      outputStream = fs.createWriteStream(options.outputFile);
    }

    if (!options.outputFile) {
      outputStream = process.stdout;
    }

    var writer = n3.Writer(prefixes);
    var shouldWrite;

    driverInstance.once('addTriple', function() {
      shouldWrite = true;
    });
    driverInstance.on('addTriple', function(s, p, o) {
      writer.addTriple(s, p, o);
    });
    driverInstance.on('log', logger.log);
    driverInstance.on('finish', function() {
      if (!shouldWrite) {
        return;
      }

      writer.end(function(err, data) {
        if (!err) {
          outputStream.write(data);
        }
      });
    });

    driverInstance.fetch();
  }
};