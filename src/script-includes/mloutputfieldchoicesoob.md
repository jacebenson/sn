---
title: "mlOutputFieldChoicesOOB"
id: "mloutputfieldchoicesoob"
---

API Name: global.mlOutputFieldChoicesOOB

```js
var mlOutputFieldChoicesOOB = Class.create();
mlOutputFieldChoicesOOB.prototype = {
    initialize: function() {},
    /**
	*  getMLOutputFieldChoices method is used to get suitable fields than can be selected
	*  from the table for the output column of classification and regression capabilities 
	*  
	*  Input Parameters (injected into the method) are:
	*  'tableName' - Table selected on the capability solution definition.
	*  'capability' - the ml capability in use
	*
	*  Output - 'fieldsArr' {array}
	*  result contains columns names for the given table
	*/
    getMLOutputFieldChoices: function(tableName,capability) {
        var fieldsArr = [];
        var gr = new GlideRecord(tableName);
        gr.initialize();
        var fields = gr.getFields();
        for (var num = 0; num < fields.size(); num++) {
            var ed = fields.get(num).getED();
            if (capability == 'ml_capability_definition_regression') {
                if ( ed.getInternalType() == 'integer' || ed.getInternalType() == 'longint' || ed.getInternalType() == 'decimal' || ed.getInternalType() == 'float' ) {
                    fieldsArr.push(ed);
                }
            } else {
				if (ed.isChoiceTable() || ed.isReference() || ed.getInternalType() == 'choice' || ed.isBoolean()) {
						fieldsArr.push(ed);
				}
			}
        }
        return fieldsArr;
    },

    type: 'mlOutputFieldChoicesOOB'
};
```