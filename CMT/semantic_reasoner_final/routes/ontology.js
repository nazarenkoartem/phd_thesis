var router = require('express').Router({mergeParams: true});
var bodyParser = require('body-parser');

var ontologyController = require('../controllers/ontology');

router.get('/:name', ontologyController.getConcept);
router.get('/', ontologyController.getAllConcepts);
router.get('/:name/:type/:search', ontologyController.getRecommendation);

router.post('/', ontologyController.postModel);
router.post('/:name1/:name2', ontologyController.createLink);
router.post('/:name', ontologyController.createConcept);

router.put('/:name1/:name2', ontologyController.updateLinkValue);
router.put('/', ontologyController.putValuePairs);

router.delete('/:name', ontologyController.deleteConcept);
router.delete('/:name1/:name2', ontologyController.deleteLink);
router.delete('/', ontologyController.deleteAll);


module.exports = router;