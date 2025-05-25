//neo4j driver to communicate with DB
var neo4j = require('neo4j-driver');//.v1;
const HashMap = require('hashmap');
const rdf = require('rdf');

//Connection to neo4j enabling driver session
//var driver = neo4j.driver('bolt://neo4j.vfos.gris.uninova.pt:35050', neo4j.auth.basic('neo4j', 'Dunoo5uo1teish6ain7eeMo7'));
var driver = neo4j.driver('bolt://127.0.0.1:7687', neo4j.auth.basic('neo4j', '12345678'));
var session = driver.session();

var bodyParser = require('body-parser');


//provide recommendation
function getRecommendation(req, res) {
  const session = driver.session();
  var name = req.params.name;
  var type = req.params.type;
  var search = req.params.search
  //var inputObject = req.body;
  let output = [];

  session
    .run('MATCH (n {name: $nameParam}), (k {name: $typeParam}), (s {type: $searchParam}), p = shortestPath((n)-[*..15]-(s)) WHERE (n)-[]-(k) AND (k)-[]-(s) RETURN p', {nameParam: name, typeParam: type, searchParam: search})
	
    .subscribe({
      onNext: function (record) {
        output.push({ concept_1: record._fields[0].start.properties.name, concept_2: record._fields[0].end.properties.name });
      },
      onCompleted: function () {
        session.close();
        return res.send(output);
      },
      onError: function (error) {
        console.log(error);
      }
    });
}

//insert a complex model - return nested json
function postModel(req, res) {
	var tx = session.beginTransaction();
	
	var inputObject = req.body;
	
	tx
		.run('UNWIND $inputParam.origin AS origin MERGE(label:concept {name: origin.label}) ON CREATE SET label.type = origin.type FOREACH(tagName IN origin.tag | MERGE(tag:concept{name:tagName}) MERGE (tag)-[r:link]-(label) ON CREATE SET r.Weight=1 ON MATCH SET r.Weight=r.Weight/(r.Weight+1.0))', {inputParam: inputObject})
		.subscribe({
			onNext: function(record){
				console.log(record._fields.origin);
			},
			onCompleted: function() {
				console.log('First completed');
			},
			onError: function(error) {
				console.log(error);
			}
		});
	
	tx
		.run('UNWIND $inputParam.target AS target MERGE(label:concept{name:target.label}) ON CREATE SET label.type = target.type FOREACH(tagName IN target.tag | MERGE(tag:concept{name:tagName}) MERGE (tag)-[r:link]-(label) ON CREATE SET r.Weight=1 ON MATCH SET r.Weight=r.Weight/(r.Weight+1.0))', {inputParam: inputObject})
		.subscribe({
			onCompleted: function() {
				console.log('Second completed');
			},
			onError: function(error) {
				console.log(error);
			}
		});
	
	tx
		.run('UNWIND $inputParam.origin AS origin MERGE(label:concept{name:origin.label}) ON CREATE SET label.type = origin.type FOREACH(xpathName IN last(origin.xpath) | MERGE (xpath:concept{name:xpathName}) MERGE (label)-[r:link]-(xpath) ON CREATE SET r.Weight=1 ON MATCH SET r.Weight=r.Weight/(r.Weight+1.0))', {inputParam: inputObject})
		.subscribe({
			onCompleted: function() {
				console.log('Third completed');
			},
			onError: function(error) {
				console.log(error);
			}
		});	

	tx
		.run('UNWIND $inputParam.target AS target MERGE(label:concept{name:target.label}) ON CREATE SET label.type = target.type FOREACH(xpathName IN last(target.xpath) | MERGE (xpath:concept{name:xpathName}) MERGE (label)-[r:link]-(xpath) ON CREATE SET r.Weight=1 ON MATCH SET r.Weight=r.Weight/(r.Weight+1.0))', {inputParam: inputObject})
		.subscribe({
			onCompleted: function() {
				console.log('Fourth completed');
			},
			onError: function(error) {
				console.log(error);
			}
		});
	
	
	db_exists_check = tx
		.run('UNWIND $inputParam.graphName AS graphName CALL gds.graph.exists(graphName) YIELD exists as result RETURN result', {inputParam: inputObject})
		.subscribe({
			onCompleted: function(record) {
				console.log("graph algorithm is ready to be used")
			},
			onError: function(error) {
				console.log(error);
			}
		});

	
	var output = [];
	tx
		.run('UNWIND $inputParam.origin AS input MATCH(origin:concept{name:input.label}) WITH input, collect(origin) as origins UNWIND $inputParam.target AS tar MATCH(target:concept{name:tar.label}) UNWIND origins AS origin WITH origin, target CALL apoc.algo.dijkstra(origin, target, $relationship, $weightParam) YIELD path, weight WITH origin, path, weight ORDER BY weight WITH origin, COLLECT(path) AS ps, COLLECT(weight) AS ws UNWIND [r IN RANGE(1, SIZE(ws)) | {origin: origin, path: ps[r-1], rank: r, weight: ws[r-1]}] AS suggestions WITH suggestions.origin AS origin_node, collect(suggestions)[0..4] as suggestion WITH {origin: origin_node, suggestions: suggestion} AS res RETURN res ORDER BY res.rank desc', {inputParam: inputObject, weightParam: 'Weight', relationship: 'link'})
		.subscribe({
			
			onNext: function(record){
				let suggestions = [];
				let origin_label = [];
				let data_origin =[];
				
				record._fields.map(function(individual_field){
					let targetXpath = [];
			
					origin_label.push(individual_field.origin.properties.name);
					
					var origin_input = inputObject.origin;
					var target_input = inputObject.target;
					var origin_data_filter = origin_input.find(item => item.label == origin_label);
					var origin_schema = {
						"label": origin_data_filter.label,
						"xpath": origin_data_filter.xpath
					};
					data_origin.push(origin_schema);

					individual_field.suggestions.map(function(suggestion){
						let globalXpath = [];
						let individual_path = [];
						let weight_batch = [];

						suggestion.path.segments.map(function(pathSegment){+
							globalXpath.push(pathSegment.end.properties.name);
							individual_path.push({
							"start": pathSegment.start.properties.name,
							"weight": pathSegment.relationship.properties.Weight,
							"end": pathSegment.end.properties.name
							});
							
							if (typeof pathSegment.relationship.properties.Weight === "object") {
								weight_batch.push(pathSegment.relationship.properties.Weight.low);	
							} else {
								weight_batch.push(pathSegment.relationship.properties.Weight)
							}
						})
						
						for (var i = 0, sum = 0; i < weight_batch.length; sum += weight_batch[i++]);

							
						var target = globalXpath[globalXpath.length-1];
						var target_data_filter = target_input.find(item => item.label == target);
						var targetData = target_data_filter.xpath;
						let proposal = {
						"suggestion":{
							"label": globalXpath[globalXpath.length-1],
							"score": suggestion.path.length,//px.length,
							"cumulative_weight": sum,
							"xpath": targetData,
							"rank":  suggestion.rank.low
						},
						"graph": individual_path
						};
						suggestions.push(proposal);
						
					})
				})
				
				let pre_output = data_origin.concat(suggestions);
				output.push({"origin": pre_output});
					
			},
			onCompleted: function() {
				console.log('Fifth completed');
				return res.send(output);
			},
			onError: function(error) {
				console.log(error);
			}
		});
		
		var success = true;
		
		if(success) {
			tx.commit()

		}	else {
			console.log('rolled back')
			tx.rollback();
		}
			
};



//Insert a batch of concepts as a value pairs
function putValuePairs(req, res) {
  const session = driver.session();
  var inputObject = req.body;

  session
    .run('UNWIND $inputParam.pairs AS pairs MERGE(origin_label:concept{name: pairs.origin}) MERGE(target_label:concept{name: pairs.target}) MERGE (origin_label)-[r:link]-(target_label) ON CREATE SET r.weight=1.0 ON MATCH SET r.weight=r.weight/(r.weight+1.0)', { inputParam: inputObject })
    .then(function (result) {
      session.close();
      res.send("Successfully created");
    })
    .catch(function (err) {
      console.log(err);
    });
}

//Get all the concepts
function getAllConcepts(req, res) {
  const session = driver.session();

  let output = [];

  session
    .run('MATCH (n:concept) RETURN n')
    .subscribe({
      onNext: function (record) {
        output.push(record._fields[0].properties.name);
      },
      onCompleted: function () {
        session.close();
        return res.send(output);
      },
      onError: function (error) {
        console.log(error);
      }
    });
}

//Get the requested concept
function getConcept(req, res) {
  const session = driver.session();
  var name = req.params.name;
  let output = [];

  session
    .run('MATCH (n {name:$nameParam}) RETURN n', { nameParam: name })
    .subscribe({
      onNext: function (record) {
        output.push(record._fields[0].properties.name);
      },
      onCompleted: function () {
        session.close();
        return res.send(output);
      },
      onError: function (error) {
        console.log(error);
      }
    });
}

//Create a concept
function createConcept(req, res) {
  const session = driver.session();
  var name = req.params.name;
  let output = [];

  session
    .run('MERGE (n:concept{name:$nameParam}) RETURN n', { nameParam: name })
    .subscribe({
      onNext: function (record) {
        output.push(record._fields[0].properties.name);
      },
      onCompleted: function () {
        session.close();
        return res.send("Concept is created: " + output);
      },
      onError: function (error) {
        console.log(error);
      }
    });
}

//Create a link between two concepts
function createLink(req, res) {
  const session = driver.session();
  var name1 = req.params.name1;
  var name2 = req.params.name2;
  let output = [];

  session
    .run('MATCH (a:concept {name: $name1Param}), (b:concept {name: $name2Param}) MERGE (a)-[r: link]-(b) ON CREATE SET r.weight=1.0 ON MATCH SET r.weight = r.weight / (r.weight + 1.0) WITH {start: a, end: b, link: r} AS output RETURN output', { name1Param: name1, name2Param: name2 })
    .subscribe({
      onNext: function (record) {
        output.push({ concept_1: record._fields[0].start.properties.name, concept_2: record._fields[0].end.properties.name });
      },
      onCompleted: function () {
        session.close();
        return res.send(output);
      },
      onError: function (error) {
        console.log(error);
      }
    });
}

//Update weight of the link between concepts
function updateLinkValue(req, res) {
  const session = driver.session();

  var name1 = req.params.name1;
  var name2 = req.params.name2;

  session
    .run('MATCH (a:concept {name: $name1Param}), (b:concept {name: $name2Param}) MATCH (a)-[r: link]-(b) SET r.Weight=r.Weight/(r.Weight+1.0) RETURN a,b', { name1Param: name1, name2Param: name2 }) 
    .then(function (result) {
      session.close();
      res.send("Link is updated");
    })
    .catch(function (err) {
      console.log(err);
    })

}

//Delete a concept/node
function deleteConcept(req, res) {
  const session = driver.session();

  var name = req.params.name;

  session
    .run('MATCH (n) where n.name = $nameParam DETACH DELETE n', { nameParam: name })   //'MATCH (n:concept {name: $nameParam}) DETACH DELETE n
    .then(function (result) {
      session.close();
      res.send("Concept is deleted");
    })
    .catch(function (err) {
      console.log(err);
    })
}

//delete the relation/link between two nodes/concepts
function deleteLink(req, res) {
  const session = driver.session();

  var name1 = req.params.name1;
  var name2 = req.params.name2;

  session
    .run('MATCH (a:concept {name: $name1Param})-[r:link]-(b:concept {name: $name2Param}) DELETE r', { name1Param: name1, name2Param: name2 })
    .then(function (result) {
      session.close();
      res.send("Link between two nodes is deleted");
    })
    .catch(function (err) {
      console.log(err);
    })

}

//delete all nodes and relations
function deleteAll(req, res) {
  const session = driver.session();

  session
    .run('MATCH (n) DETACH DELETE n')
    .then(function (result) {
      session.close();
      res.send("All the concepts and relationships are removed");
    })
    .catch(function (err) {
      console.log(err);
    })
}
  


module.exports.getConcept = getConcept;  // yes
module.exports.getAllConcepts = getAllConcepts;  // yes
module.exports.getRecommendation = getRecommendation;

module.exports.postModel = postModel; // yes
module.exports.createLink = createLink; // yes
module.exports.createConcept = createConcept; // yes

module.exports.updateLinkValue = updateLinkValue;  // yes
module.exports.putValuePairs = putValuePairs;  // yes

module.exports.deleteConcept = deleteConcept; // yes
module.exports.deleteLink = deleteLink; // yes
module.exports.deleteAll = deleteAll; // yes


