---
title: "getSchemaAttributeColumnOnTable"
id: "getschemaattributecolumnontable"
---

API Name: global.getSchemaAttributeColumnOnTable

```js
function getSchemaAttributeColumnOnTable() {
	var query = 'internal_type!=collection';
	if (current.on_table)
		query += '^name=' + current.on_table.name;
	
	return query;
}
```