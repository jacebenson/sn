---
title: "OCEscDesignerContactPrefUtilAjax"
id: "ocescdesignercontactprefutilajax"
---

API Name: global.OCEscDesignerContactPrefUtilAjax

```js
var OCEscDesignerContactPrefUtilAjax = Class.create();
OCEscDesignerContactPrefUtilAjax.prototype = Object.extendsObject(OCEscDesignerContactPrefUtilAjaxSNC, {
	initialize: function (request, responseXML, gc) {
		OCEscDesignerContactPrefUtilAjaxSNC.prototype.initialize.call(this, request, responseXML, gc);
	},
    type: 'OCEscDesignerContactPrefUtilAjax'
});
```