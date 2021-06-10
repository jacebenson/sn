---
title: "RendererFactory"
id: "rendererfactory"
---

API Name: global.RendererFactory

```js
var RendererFactory = Class.create();
RendererFactory.prototype = {
    initialize: function() {
    },
    type: 'RendererFactory'
};

/** 
 * Select renderer for a given table.column ref and row ID
 */
RendererFactory.getRenderer = function(ref, id) {
	if (GlideUtil.isExpressInstance())
		return "express_workflow_renderer";

	return new SNC.WorkflowScriptAPI().getRenderer(current);
};

RendererFactory.getSchedule = function(ref, id) {
	var tableName = ref.split('.');
    if (tableName.length != 2) 
		return '';

	var grCurrent = new GlideRecord(tableName[0]);
	grCurrent.sys_id = id;
	
	var ctx = new Workflow().getRunningFlows( grCurrent, tableName[0] );
	
	if (!ctx.next())
		return'';

	var schedule = ctx.workflow_version.schedule+'';
	return schedule ? schedule : '';
};
	
```