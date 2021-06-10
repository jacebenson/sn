---
title: "ProblemMigrationHelperUtils"
id: "problemmigrationhelperutils"
---

API Name: global.ProblemMigrationHelperUtils

```js
var ProblemMigrationHelperUtils = Class.create();
ProblemMigrationHelperUtils.prototype = {
    initialize: function() {
    },

	updateRecord: function(record){
		var tblName = record.getTableName() + '';
		if (tblName === 'problem' || tblName === 'problem_task'){
			record.setWorkflow(false);
			if (record.update())
				return true;
			else
				return false;
		}
		else
			gs.warn('Not a Problem or Problem Task record');
	},

    type: 'ProblemMigrationHelperUtils'
};
```