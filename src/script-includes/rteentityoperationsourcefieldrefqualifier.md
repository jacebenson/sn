---
title: "RteEntityOperationSourceFieldRefQualifier"
id: "rteentityoperationsourcefieldrefqualifier"
---

API Name: global.RteEntityOperationSourceFieldRefQualifier

```js
var RteEntityOperationSourceFieldRefQualifier = Class.create();
RteEntityOperationSourceFieldRefQualifier.prototype = {
    initialize: function() {},

    getCondition: function(current) {
        var path = current.sys_rte_eb_entity.path;
        var condition = 'sys_rte_eb_definition=' + current.sys_rte_eb_definition +
            '^sys_rte_eb_entity=' + current.sys_rte_eb_entity;

        if (!path)
            return condition;

        var arr = path.split(".");
        var parentPath = "";
        var i;
        for (i = 0; i < arr.length - 1; i++) {
            if (i == 0)
                parentPath = arr[i];
            else
                parentPath += "." + arr[i];
            condition += "^ORsys_rte_eb_entity.path=" + parentPath;
        }
       
        return condition;
    },

    type: 'RteEntityOperationSourceFieldRefQualifier'
};
```