---
title: "ManyToManyChecker"
id: "manytomanychecker"
---

API Name: global.ManyToManyChecker

```js
var ManyToManyChecker = Class.create();
ManyToManyChecker.prototype = {
    initialize: function() {
    },
	SYS_M2M: 'sys_m2m',
	M2M_TABLE: 'm2m_table',
	
	isManyToMany :function(tableName) {
		var m2mTableQuery = new GlideRecord(this.SYS_M2M);
		
		if(!m2mTableQuery.isValid()) {
			return false;
		}

		m2mTableQuery.addQuery(this.M2M_TABLE, tableName);
		m2mTableQuery.query();
		
		return m2mTableQuery.next();
	},
	
    type: 'ManyToManyChecker'
};
```