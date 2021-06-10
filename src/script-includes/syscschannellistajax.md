---
title: "SysCsChannelListAjax"
id: "syscschannellistajax"
---

API Name: global.SysCsChannelListAjax

```js
var SysCsChannelListAjax = Class.create();
SysCsChannelListAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	//function name
	getChannels: function() {
			var channels = [];
			var gr = new GlideRecord('sys_cs_channel');
			gr.query();
			while (gr.next()) {
				//return data
				channels.push(gr.getValue('name'));
			}
			return JSON.stringify(channels);
	},
    type: 'SysCsChannelListAjax'
});
```