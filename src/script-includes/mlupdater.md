---
title: "MLUpdater"
id: "mlupdater"
---

API Name: global.MLUpdater

```js
var MLUpdater = Class.create();
MLUpdater.prototype = {
    ML_SOLUTION_DEFINITION : 'ml_solution_definition',
    initialize: function() {
    },

    type: 'MLUpdater',
	
	update: function(solutionName) {
		var ml_schema =  new global.MLSchemaHelper().getMLSchema();
		var solutionDef = new GlideRecord(ml_schema.schema_table);
		solutionDef.addQuery('solution_name', solutionName);
		solutionDef.addActiveQuery();
		solutionDef.query();
		if(!solutionDef.next()) {
			return;
		}

        var finder = new sn_ml.SolutionFinder();
        var solution = finder.getSolution(solutionName);
        if (gs.nil(solution) || !solution.isActive()) {
			return;
        }
        solution.updatePV();
     }
};
```