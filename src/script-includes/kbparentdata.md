---
title: "KBParentData"
id: "kbparentdata"
---

API Name: global.KBParentData

```js
var KBParentData = Class.create();
KBParentData.prototype = {
    initialize: function() {},
    getParentCategory: function(input, category) {
        var parentId, parentName, childRecord, parentRecord;
        var cat = (typeof category === 'string') ? [category] : category;
        childRecord = new GlideRecord('kb_category');
        childRecord.addQuery('sys_id', input);
        childRecord.addActiveQuery();
        childRecord.query();
        while (childRecord.next())
            parentId = childRecord.parent_id;
        parentRecord = new GlideRecord('kb_category');
        parentRecord.addQuery('sys_id', parentId);
        parentRecord.addActiveQuery();
        parentRecord.query();
        while (parentRecord.next())
            parentName = parentRecord.label;

        if (parentName && parentId) {
            cat.unshift(parentName);
            return this.getParentCategory(parentId, cat);
        }
        return cat;
    },

    type: 'KBParentData'
};
```