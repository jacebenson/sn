---
title: "ISCSearch"
id: "iscsearch"
---

API Name: global.ISCSearch

```js
var ISCSearch = Class.create();
ISCSearch.prototype = {
	initialize: function() {
	},

	//String Array['fieldName']['operator']['and/or'(accepted values = 'and' or 'or')] fieldNames, String tableName, String searchQuery
	searchFromTableFields: function(fieldNames, tableName, searchQuery) {
		var results = [];

		var gr = new GlideRecordSecure(tableName);

		gr = this.addQueries(gr, fieldNames, searchQuery);
		results = this.grToResultsObj(gr);

		return results;
	},

	addQueries: function(gr, fieldNames, searchQuery) {
		for(var i = 0; i < fieldNames.length; i++) {
			fieldNames[i][3] = fieldNames[i][3] || searchQuery;
			if(fieldNames[i][0] == 'and') {
				gr.addQuery(fieldNames[i][1], fieldNames[i][2], fieldNames[i][3]);
			} else if(fieldNames[i][0] == 'or') {
				gr.addOrQuery(fieldNames[i][1], fieldNames[i][2], fieldNames[i][3]);
			}
		}
		gr.query();

		return gr;
	},

	grToResultsObj: function(gr) {
		var results = [];
		
		while(gr.next()) {
			var newObj = {};

			for (var prop in gr) {
				newObj[prop] = gr.getDisplayValue(prop);
			}
			results.push(newObj);
		}
		return results;
	},
	
	type: 'ISCSearch'
};
```