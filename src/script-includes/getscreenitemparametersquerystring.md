---
title: "GetScreenItemParametersQueryString"
id: "getscreenitemparametersquerystring"
---

API Name: global.GetScreenItemParametersQueryString

```js
var GetScreenItemParametersQueryString = Class.create();
GetScreenItemParametersQueryString.prototype = {
    initialize: function() {
    },
	
	getItemParametersQS: function() {
		var screenId = current.screen;
		if (!screenId) 
			return "parent=null";
		
		//if Legacy madrid or Form Screen - stand alone
		if (current.screen.data_item)
			return 'parent=' + current.screen.data_item;
		
		var itemStreamM2MSegmentGR = new GlideRecord("sys_sg_item_stream_m2m_segment");
		itemStreamM2MSegmentGR.addEncodedQuery("segment.screen=" + screenId);
		itemStreamM2MSegmentGR.query();
		
		//Collect all of the screen data-items from the screen's item-streams to set like object
		var screenDataItemsSet = {};
		while (itemStreamM2MSegmentGR.next()) {
			if (!itemStreamM2MSegmentGR.item_stream)
				continue;
			
			if (!itemStreamM2MSegmentGR.item_stream.data_item)
				continue;
			
			var dataItem = itemStreamM2MSegmentGR.item_stream.data_item;
			screenDataItemsSet[dataItem]=true;
		}
		
		var screenDataItemsArray = Object.keys(screenDataItemsSet);
		if (screenDataItemsArray.length === 0)
			return "parent=null";
		
		var dataItemParameters = screenDataItemsArray.join(',');
		return "parentIN" + dataItemParameters;

	},

    type: 'GetScreenItemParametersQueryString'
};
```