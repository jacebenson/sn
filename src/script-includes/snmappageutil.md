---
title: "SNMapPageUtil"
id: "snmappageutil"
---

API Name: global.SNMapPageUtil

```js
var SNMapPageUtil = Class.create();
SNMapPageUtil.isDebuggEnabled = isDebuggEnabled;
SNMapPageUtil.checkDuplicatedMarkerMappings = checkDuplicatedMarkerMappings;
function isDebuggEnabled() {
	return gs.getProperty("glide.map_page.debug", false);
}
function checkDuplicatedMarkerMappings(MarkerMappingGR) {
	var duplicatedMarkerMappingGR = new GlideRecord("m2m_map_page_map_marker");
	duplicatedMarkerMappingGR.addQuery("map_marker", MarkerMappingGR.map_marker);
	duplicatedMarkerMappingGR.addQuery("map_page", MarkerMappingGR.map_page);
	duplicatedMarkerMappingGR.query();
	// BR condition check is before type. thus, consider the duplicated one does not exist.
	if (duplicatedMarkerMappingGR.getRowCount() > 0) {
		return true;
	}
	return false;
}
```