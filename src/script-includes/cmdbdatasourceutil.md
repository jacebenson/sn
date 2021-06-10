---
title: "CMDBDataSourceUtil"
id: "cmdbdatasourceutil"
---

API Name: global.CMDBDataSourceUtil

```js
var CMDBDataSourceUtil = Class.create();
CMDBDataSourceUtil.prototype = {
    initialize: function() {
    },

	// adding a new source
    addDataSource: function(source) {
       var gr = new GlideRecord('sys_choice');
       gr.addQuery('element', 'discovery_source');
       gr.addQuery('name', 'cmdb_ci');
       gr.addQuery('value', source);
       gr.query();
       if (!gr.hasNext()) {
           var grNew = new GlideRecord('sys_choice');
           grNew.initialize();
           grNew.setValue('element', 'discovery_source');
           grNew.setValue('name', 'cmdb_ci');
           grNew.setValue('value', source);
           grNew.setValue('label', source);
           if (!grNew.insert()) {
               log.info('Adding discovery source failed for: ' + source);
           }
       }
    },
	
    type: 'CMDBDataSourceUtil'
};
```