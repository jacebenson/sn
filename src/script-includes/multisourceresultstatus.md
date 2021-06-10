---
title: "MultisourceResultStatus"
id: "multisourceresultstatus"
---

API Name: global.MultisourceResultStatus

```js
var MultisourceResultStatus = Class.create();
MultisourceResultStatus.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    getExecutionId: function(query) {
        var queryString = new GlideQueryString(query);
        queryString.deserialize();
        var queryTermsList = queryString.getTerms();
        var executionId;
        for (var i = 0; i < queryTermsList.size(); i++) {
            var queryTerm = queryTermsList.get(i);
            var queryField = queryTerm.getField();
            if (queryField == 'execution_id.sys_id') {
                executionId = queryTerm.getValue();
                break;
            }
        }
        return executionId;
    },
    // UI action calls this method to parse the execution id correctly
    getExecutionIdForClient: function() {
        return this.getExecutionId(this.getParameter('sysparm_query'));
    },
    showLoadButtons: function(query) {
        var TABLE = "cmdb_multisource_query_status";
        var STATUS = "status";
        var executionId = this.getExecutionId(query);
        if (GlideStringUtil.nil(executionId))
            return false;

        var gr = new GlideRecord(TABLE);
        if (gr.get(executionId)) {
            if (gr.getValue(STATUS) == "PAUSED") {
                return true;
            }
            return false;
        }
        return false;
    },
    type: 'MultisourceResultStatus'
});
```