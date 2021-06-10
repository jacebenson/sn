---
title: "ClientTestRunnerBrowserInfo"
id: "clienttestrunnerbrowserinfo"
---

API Name: global.ClientTestRunnerBrowserInfo

```js
var ClientTestRunnerBrowserInfo = Class.create();
ClientTestRunnerBrowserInfo.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	initialize: function(browserName, version, osName, osVersion) {
		this.browserName = browserName;
		this.version = version;
		this.osName = osName;
		this.osVersion = osVersion;
	},
    type: 'ClientTestRunnerBrowserInfo'
});
```