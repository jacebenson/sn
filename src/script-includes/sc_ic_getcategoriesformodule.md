---
title: "sc_ic_getCategoriesForModule"
id: "sc_ic_getcategoriesformodule"
---

API Name: global.sc_ic_getCategoriesForModule

```js
function sc_ic_getCategoriesForModule() {
	var availableCategoryIds = [];
	
	var availableCategoriesGr = new GlideRecord("sc_ic_category_request");
	availableCategoriesGr.addEncodedQuery("manager=" + gs.getUserID() + "^OReditorsLIKE" + gs.getUserID());
	availableCategoriesGr.addNotNullQuery("sc_category");
	availableCategoriesGr.query();

	while (availableCategoriesGr.next())
		availableCategoryIds.push(availableCategoriesGr.sc_category+"");
	
	return availableCategoryIds;
}
```