
Semantic Reasoner

Requirements:
- running instance of Neo4J DB
- installed node.js
- preferred bash shell, on windows machines GitBash can be installed 

What is in the folder:
- app script to run the semantic reasoner
- in the sub-folder "contollers" the main script for querying the Neo4J are placed
- in the sub-folder "routes" the script invoking the "ontology" script and providing APIs 

How to run locally:
- open the Bash terminal, go to the folder with files and run the app script <node app.js>
- open another Bash terminal (do not close the first one where the app is running) and execute the curl commands, some examples of which are provided in the word file "documentation"

