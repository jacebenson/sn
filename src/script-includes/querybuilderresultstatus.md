---
title: "QueryBuilderResultStatus"
id: "querybuilderresultstatus"
---

API Name: global.QueryBuilderResultStatus

```js
var QueryBuilderResultStatus = Class.create();
QueryBuilderResultStatus.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	showLoadButtons: function(query) {
		var TABLE = "qb_query_status";
		var QUERY = "sys_id";
		var STATUS = "status";
		var queryIndex = -1;
		
		query = query.split("="); 
		for(var i = 0; i < query.length - 1; i++) {
			if (query[i] === 'query' && query[i + 1]) {
				queryIndex = i + 1;
				query[queryIndex] = query[queryIndex].substring(0, 32);
				break;
			}
		}
		if(queryIndex < 0){
			return false;
		}
		var gr = new GlideRecord(TABLE);
		if(gr.get(query[queryIndex])) {
			if(gr.getValue(STATUS) == "PAUSED") {
				return true;
			}
			return false;
		}
		return false;
	},
    type: 'QueryBuilderResultStatus'
	
});
```