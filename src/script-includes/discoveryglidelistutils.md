---
title: "DiscoveryGlideListUtils"
id: "discoveryglidelistutils"
---

API Name: global.DiscoveryGlideListUtils

```js
var DiscoveryGlideListUtils = Class.create();

DiscoveryGlideListUtils.removeMidFromListInCred = function(midSysId) {
    DiscoveryGlideListUtils.removeValueFromList("discovery_credentials", "mid_list", midSysId, false);
};

DiscoveryGlideListUtils.removeValueFromList = function(tableName, fieldName, value, shouldTriggerBR) {
    // GlideList values are just comma separated sys_ids and the value
    // we want to remove may be at the beginning, in between or at the end.
    // The following pattern will handle the comma appropriately
    var pattern = new RegExp("," + value + "|" + value + ",|" + value);

    var rec = new GlideRecord(tableName);
    rec.addQuery(fieldName, "CONTAINS", value);
    rec.query();
    while (rec.next()) {
        gs.log("removing " + value + " from " + tableName + "." + fieldName + " for record sys_id=" + rec.getUniqueValue(), "DiscoveryGlideListUtils");
        var valueList = rec.getValue(fieldName);
        valueList = valueList.replace(pattern, "");
        rec.setValue(fieldName, valueList);
        rec.setWorkflow(shouldTriggerBR);
        rec.update();
    }
};

DiscoveryGlideListUtils.prototype = {
    initialize: function() {},

    type: 'DiscoveryGlideListUtils'
};
```