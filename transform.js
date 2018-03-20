var Transform = require('stream').Transform;
var inherits = require('util').inherits;
var uuid = require('uuid');
var moment = require('moment');

module.exports = ESLogTransform;

function ESLogTransform(options) {
  if ( ! (this instanceof ESLogTransform))
    return new ESLogTransform(options);

  if (! options) options = {};
  options.objectMode = true;
  Transform.call(this, options);
}

inherits(ESLogTransform, Transform);

/*
INPUT
{
  v: 0,
  id: "3324acd73ad5",
  long_id: "3324acd73ad573773b901d93e932be65f2bb55b8e6c03167a24c17ab3f172249"
  image: "myimage:latest",
  name: "mycontainer-name"
  time: 1454928524601,
  line: "This is a log line" // this will be an object if opts.jon is true
}
*/
/*
DESIRED OUTPUT
{
  index: 'name-of-index',
  type: 'recordType',
  id: 'recordId',
  parent: 'parentRecordType', // optional
  action: 'update', // optional (default: 'index')
  body: {
    name: 'Foo Bar'
  }
}*/

var DEBUG_ON = process.env.DEBUG_ON === 'true';
ESLogTransform.prototype._transform = function _transform(input, encoding, callback) {
  if(DEBUG_ON) console.log('ESLogTransform input', input);

  var obj = {
    index: 'log-' + (process.env.INDEX_PREFIX || '') + moment().format('YYYY-MM-DD'),
    type: 'log',
    id: uuid.v4(),
    body: input,
  };

  this.push(obj);
  callback();
};
