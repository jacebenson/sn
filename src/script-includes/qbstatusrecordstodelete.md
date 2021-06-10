---
title: "QBStatusRecordsToDelete"
id: "qbstatusrecordstodelete"
---

API Name: global.QBStatusRecordsToDelete

```js
var QBStatusRecordsToDelete = Class.create();
QBStatusRecordsToDelete.prototype = {
    initialize: function() {},
    getQueryExecutionIds: function() {
        var resultTables = [];
        var latestexecutionIds = [];
        var recordsToDelete = [];
		var savedQueryIds = [];
        var status = ['COMPLETE', 'MAX_LIMIT'];
		
		var glideSavedQuery = new GlideRecord('qb_saved_query');
		glideSavedQuery.addJoinQuery('sysauto_query_builder');
        glideSavedQuery.query();
        while (glideSavedQuery.next()) {
            var resultTableName = glideSavedQuery.getValue('result_table');
            resultTables.push(resultTableName);
        }

        for (var i = 0; i < resultTables.length; i++) {
            var glideQbStatus1 = new GlideRecord('qb_query_status');
            glideQbStatus1.addQuery('table_name', resultTables[i]);
            glideQbStatus1.addQuery('status', 'IN', status);
            glideQbStatus1.orderByDesc('sys_updated_on');
            glideQbStatus1.setLimit(1);
            glideQbStatus1.query();
            if (glideQbStatus1.next()) {
                latestexecutionIds.push(glideQbStatus1.getValue('sys_id'));
            }
        }

        var glideQbStatus2 = new GlideRecord('qb_query_status');
        glideQbStatus2.addQuery('sys_id', 'NOT IN', latestexecutionIds);
        glideQbStatus2.query();
        while (glideQbStatus2.next()) {
            recordsToDelete.push(glideQbStatus2.getValue('sys_id'));
        }
        return recordsToDelete;
    },
    type: 'QBStatusRecordsToDelete'
};
```