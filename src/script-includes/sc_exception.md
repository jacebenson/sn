---
title: "sc_Exception"
id: "sc_exception"
---

API Name: global.sc_Exception

```js
var sc_Exception = Class.create();
sc_Exception.prototype = Object.extendsObject(GenericException, {
	
	type: 'sc_Exception'
});
```