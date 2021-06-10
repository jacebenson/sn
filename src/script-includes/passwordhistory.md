---
title: "PasswordHistory"
id: "passwordhistory"
---

API Name: global.PasswordHistory

```js
var PasswordHistory = Class.create();
PasswordHistory.getDefaultHistoryLimit = function (){
	return GlidePropertiesDB.get('password_reset.history.limit', 10);
};
```