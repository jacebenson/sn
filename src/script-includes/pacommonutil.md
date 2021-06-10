---
title: "PACommonUtil"
id: "pacommonutil"
---

API Name: global.PACommonUtil

```js
var PACommonUtil = Class.create();
PACommonUtil.prototype = {
    initialize: function() {
    },
    type: 'PACommonUtil'
};
PACommonUtil.isPremiumEnabled = function(){
	return SNC.PAUtils.isPremium();
};
```