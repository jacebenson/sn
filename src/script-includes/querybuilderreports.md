---
title: "QueryBuilderReports"
id: "querybuilderreports"
---

API Name: global.QueryBuilderReports

```js
var QueryBuilderReports = Class.create();
QueryBuilderReports.prototype = {
    initialize: function() {},

    getQueryLatestExecutionId: function(savedQueryId) {
		var executionId = '';
		var resultTable = '';
		var status = ['COMPLETE', 'MAX_LIMIT'];
		
		var glideSavedQuery = new GlideRecord('qb_saved_query');
		glideSavedQuery.addQuery('sys_id', savedQueryId);
		glideSavedQuery.query();
		
		if(glideSavedQuery.next()){
			resultTable = glideSavedQuery.getValue('result_table');
		}
		
		if (JSUtil.notNil(resultTable)) {
            var glideQbStatus = new GlideRecord('qb_query_status');
            glideQbStatus.addQuery('table_name', resultTable);
			glideQbStatus.addQuery('status', 'IN', status);
            glideQbStatus.orderByDesc('sys_updated_on');
            glideQbStatus.setLimit(1);
            glideQbStatus.query();
            
            if (glideQbStatus.next()) {
                executionId = glideQbStatus.getValue('sys_id');
            }
        }
        return executionId;
    },

    type: 'QueryBuilderReports'
};
```