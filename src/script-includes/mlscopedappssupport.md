---
title: "MLScopedAppsSupport"
id: "mlscopedappssupport"
---

API Name: global.MLScopedAppsSupport

```js
var MLScopedAppsSupport = Class.create();
MLScopedAppsSupport.prototype = {
    initialize: function() {},

    generateSimilarityOutPut: function(table, outputs, field_list, sysidArr) {
        var gr = new GlideRecord(table); // for similarity currently it will be table and not compare to table
        gr.addQuery('sys_id', 'IN', sysidArr.toString());
        gr.query();
        var recordObjMap = {};
        while (gr.next()) {
            var opObj = this._generateRecFieldsObj(gr, field_list);
            opObj['Record'] = gr.getDisplayValue();
            recordObjMap[gr.getUniqueValue()] = opObj;
        }
        for (var j = 0; j < outputs.length; j++) {
            if (outputs[j].output == 'success' && recordObjMap[outputs[j].ClassName]) {
                //copy recordObj to outputObj
                var recObj = recordObjMap[outputs[j].ClassName];
                for (var key in recObj) { //all properties are ownProperty
                    outputs[j][key] = recObj[key];
                }
            }
        }
        return outputs;
    },

    _generateRecFieldsObj: function(gr, field_list) {
        var recObj = {};
        var fieldArr = field_list.split(',');
        for (var i = 0; i < fieldArr.length; i++) {
            recObj[fieldArr[i]] = gr.getDisplayValue(fieldArr[i]);
        }
        return recObj;
    },

    type: 'MLScopedAppsSupport'
};
```