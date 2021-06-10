---
title: "related_list_edit_helper"
id: "related_list_edit_helper"
---

API Name: global.related_list_edit_helper

```js
var related_list_edit_helper = Class.create();
related_list_edit_helper.prototype = {
    initialize: function() {
    },

    create: function( /*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
        var json = this.getJsonBody(request);
        if (response.getStatusCode === 400)
            return;
        var m2mQuery = json.newItemsQuery;
        var userGivenTable = json.userGivenTable;
        var parentRecordSysId = json.parentRecordSysId;
        var parentFieldName = json.parentFieldName;
        var referencedFieldName = json.referencedFieldName;
        var m2mTableName = json.m2mTableName;
        var type = json.type;
        var result = [];
        try {
            var gr = new GlideRecord(userGivenTable);
            gr.addQuery(m2mQuery);
            gr.query();
            // for each new item, create a new record in the m2m table
            if (type === 'm2m') {
                while(gr.next()) {
                    var m2m = new GlideRecord(m2mTableName);
                    m2m.initialize();
                    m2m.setValue(parentFieldName, parentRecordSysId);
                    m2m.setValue(referencedFieldName, gr.getUniqueValue());
                    m2m.insert();
                    result.push(m2m.getUniqueValue());
                }
            } else if (type === 'o2m') {
                gr.setValue(parentFieldName, parentRecordSysId);
                gr.updateMultiple();
            }
            this.setResponse(response, result);
        } catch (e) {
            response.setStatus(400);
        }
    },

    setResponse: function(/*RESTAPIResponse*/ response, responseObj){
        response.setStatus(200);
        response.setContentType('application/json');
        response.setBody(responseObj);
    },
    getJsonBody: function( /*RESTAPIRequest*/ request) {
        var body = "";
        var json = "";
        try {
            var requestBody = request.body;
            var requestString = requestBody.dataString;
            return JSON.parse(requestString);
        } catch (e) {
            response.setStatus(400);
            var msg = gs.getMessage("CRUD operation failed: {0}", e);
            throw new sn_ws_err.BadRequestError(msg);
        }
    },

    type: 'related_list_edit_helper'
};
```