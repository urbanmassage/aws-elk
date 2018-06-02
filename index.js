var allContainers = require('docker-allcontainers');
var loghose = require('docker-loghose');
var ElasticsearchWritableStream = require('elasticsearch-writable-stream');
var elasticsearch = require('elasticsearch');
var ESLogTransform = require('./transform');

var esClient = new elasticsearch.Client({
  host: process.env.ES_URL || 'localhost:9200',
  sniffOnConnectionFault: true,
});
var esWriteStream = new ElasticsearchWritableStream(esClient, {
  highWaterMark: 256,
  flushTimeout: 500,
});

var allContainersInstance = allContainers({
  preheat: true,
  skipByName: /.*ecs-agent.*/,
});
var loghoseStream = loghose({
  json: false, // parse the lines that are coming as JSON
  events: allContainersInstance, // an instance of docker-allcontainers
  newline: false, // Break stream in newlines

  // Logs from the container, running docker-loghose are excluded by default.
  // It could create endless loops, when the same logs are written to stdout...
  // To get all logs set includeCurrentContainer to 'true'
  includeCurrentContainer: false, // default value: false

  // In a managed environment, container names may be obfuscated.
  // If there is a label that provides a better name for logging,
  // provide the key here.
  nameLabel: process.env.NAME_LABEL,
  //
  // // the following options limit the containers being matched
  // // so we can avoid catching logs for unwanted containers
  // matchByName: /hello/, // optional
  // matchByImage: /matteocollina/, //optional
  // skipByName: /.*pasteur.*/, //optional
  // skipByImage: /.*dockerfile.*/, //optional
  // attachFilter: function (id, dockerInspectInfo) {
  //   // Optional filter function to decide if the log stream should
  //   // be attached to a container or not
  //   // e.g. return /LOGGING_ENABLED=true/i.test(dockerInspectInfo.Config.Env.toString())
  //   return true
  // }
});

var esLogTransformInstance = ESLogTransform();

function startStream() {
  loghoseStream
    .pipe(esLogTransformInstance)
    .pipe(esWriteStream)
    .on('error', function(error) {
      // Handle error
      console.log('esWriteStream error', error);
    })
    .on('finish', function() {
      // Clean up Elasticsearch client?
      console.log('esWriteStream closed');
    });
}

// upsert mapping before starting
var body = {
  name: "logtemplate",
  body:{
    "template" : "log-*",
    "settings" : {
      "number_of_shards" : 1
    },
    "mappings" : {
      "log" : {
        "properties": {
          time: {
            "type" : "date",
            "format": "epoch_millis"
          },
        },
      },
    },
  },
};

esClient.indices.putTemplate(body, (err) => {
  if(err) {
    throw err;
  }
  console.log('created index template');
  startStream();
});
