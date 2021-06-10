---
title: "RequestAuthAWSV4Signer"
id: "requestauthawsv4signer"
---

API Name: global.RequestAuthAWSV4Signer

```js
var RequestAuthAWSV4Signer = Class.create();
RequestAuthAWSV4Signer.prototype = Object.extend(new RequestAuthInternal(), {
	initialize:function() {
		RequestAuthInternal.prototype.initialize.call(this);
	},
	
	custom: function(authAPI) {
		//custom signing here
	},
	
	type: 'RequestAuthAWSV4Signer'
});
```