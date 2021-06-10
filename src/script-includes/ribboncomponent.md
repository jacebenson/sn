---
title: "RibbonComponent"
id: "ribboncomponent"
---

API Name: sn_cmdb_workspace.RibbonComponent

```js
var RibbonComponent = Class.create();
RibbonComponent.prototype = {
	DEFAULT_RIBBON_TAGS : 'sn-component-workspace-timeline,sn-component-workspace-customer360,sn-component-workspace-sla,sn-em-alerts-timeline,sn-em-ribbon-priority,sn-cmdb-relationship-card,sn-cmdb-health-card,sn-cmdb-timeline-card',

	initialize: function() {
		this.tags = gs.getProperty('sn_ws_ribbon.workspace.ribbon.tags', this.DEFAULT_RIBBON_TAGS);
	},

	getRibbonComponentQual: function(){
		var list = [];
		var query = 'sys_idISEMPTY';
		var gr = new GlideRecord('sys_ux_lib_component');
		gr.addQuery('tag', 'IN', this.tags);
		gr.query();
		while(gr.next())
			list.push(gr.getValue('sys_id'));

		if (list.length > 0)
			query = 'sys_idIN'+list.join();

		return query;
	},
	type: 'RibbonComponent'
};
```