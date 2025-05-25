var express = require('express');
//var path = require('path')
//var logger = require('morgan');
//var bodyParser = require('body-parser');
//var neo4j = require('neo4j-driver');

var app = express();

//var driver = neo4j.driver('bolt://127.0.0.1:7687', neo4j.auth.basic('neo4j', '12345678'));
//var session = driver.session();


const ontologyRouter = require('./routes/ontology');

app.use('/ontology', express.json(), ontologyRouter);


app.listen(3001);
console.log('Server started on Port 3001');

module.exports = app;