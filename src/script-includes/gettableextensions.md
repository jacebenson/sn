---
title: "getTableExtensions"
id: "gettableextensions"
---

API Name: global.getTableExtensions

```js
function getTableExtensions(objectName) {
	var list = GlideDBObjectManager.get().getTableExtensions(objectName);
	list.add(objectName);
	return list;
}
```